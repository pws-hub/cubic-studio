
import request from 'request'
import jwt from 'jsonwebtoken'
import LPSServer from '../../src/backend/core/LPSServer'

const LPS = LPSServer().Storage

async function getAuthConfig( req, type, sid ){
  // Get an auth configuration type of the app: OAuth, JWT, BAT, BAC, ...
  const app = await LPS.get({ sid })
  if( typeof app !== 'object' )
    throw new Error('Invalid Installed App Config')

  return app.configs && app.configs[ type ]
}

async function ProcessOAuth2( req, sid ){
  return new Promise( ( resolve, reject ) => {

    const headers = {
      // Current site host
      'Origin': toOrigin( req.headers.host ),
      // Connected User credentials
      'MP-User-Agent': req.app.config.userAgent,
      'MP-Auth-Token': req.session.ctoken,
      'MP-Auth-Device': req.session.deviceId,
      'MP-Auth-Role': req.session.role
    }

    function getToken( baseURL, id, secret, scope ){
      return new Promise( ( resolve, reject ) => {
        const
        headers = {
          Authorization: `Basic ${(`${id}:${secret}`).toString('base64')}`
        },
        form = {
          grant_type: 'authorization_code',
          // Code: $code,
          redirect_uri: `${toOrigin( req.headers.host )}/service/oauth2/callback`
        }

        // Retreive OAuth2.0 configuration of this service
        request(`${baseURL}/oauth/token`,
                  { headers, method: 'POST', form, json: true },
                  ( error, response, body ) => {
                    if( error ) return reject( error )

                    resolve({
                      accessToken: body,
                      // Authorize_url: `https://zoom.us/oauth/authorize?response_type=code&client_id=${id}&redirect_uri=${encodeURIComponent( form.redirect_uri )}`
                    })
                  } )
      } )
    }

    function refreshToken( baseURL, id, secret, token ){
      return new Promise( ( resolve, reject ) => {
        const
        headers = {
          Authorization: `Basic ${(`${id}:${secret}`).toString('base64')}`
        },
        form = {
          grant_type: 'refresh_token',
          refresh_token: token
        }

        // Retreive OAuth2.0 configuration of this service
        request(`${baseURL}/oauth/token`,
                  { headers, method: 'POST', form, json: true },
                  ( error, response, body ) => {
                    if( error ) return reject( error )
                    resolve( body )
                  } )
      } )
    }

    // Retreive OAuth2.0 configuration of this service
    request(`${process.env.MULTIPPLE_API_SERVER}/service/${sid}/oauth2`,
              { headers, method: 'GET', json: true },
              async ( error, response, body ) => {

                if( error || body.error ) return reject( error || body.message )

                const { provider, client, scope } = body.config
                const { accessToken } = await getToken( provider.baseURL, client.id, client.secret, scope.join() )

                resolve({ baseURL: provider.baseURL, accessToken })
              } )
  } )
}

async function ProcessJWT( req, sid ){
  try {
    const
    { baseURL, APIKey, APISecret } = await getAuthConfig( req, 'jwt', sid ),
    payload = {
      iss: APIKey,
      exp: ( ( new Date() ).getTime() + 5000 )
    },
    accessToken = jwt.sign( payload, APISecret )

    return { baseURL, accessToken }
  }
  catch( error ) { throw new Error( error ) }
}

async function ProcessBAC( req, sid ){
  try { return await getAuthConfig( req, 'bac', sid ) }
  catch( error ) { throw new Error( error ) }
}

async function ProcessBAT( req, sid ){
  try {
    const config = await getAuthConfig( req, 'bat', sid )
    return {
      baseURL: config.baseURL,
      accessToken: config.token
    }
  }
  catch( error ) { throw new Error( error ) }
}

export default async ( req, res ) => {
  let
  { sid, url, method, body, headers, responseType, authType } = req.body,
  base_URL, access_token

  const options = {
    method,
    headers: headers || {},
    url: decodeURIComponent( url )
  }

  if( authType ) {
    // Caching session of Auth Request Options
    if( !req.session[ sid ] )
      req.session[ sid ] = {}

    // Use previous generated info stored in session
    base_URL = req.session[ sid ].base_URL
    access_token = req.session[ sid ].access_token

    // Authentication Request Authorizations
    switch( authType ) {
      // Use OAuth2.0
      case 'oauth2': if( !access_token )
                        try {
                          // Process oauth2.0 authentication
                          const { baseURL, accessToken } = await ProcessOAuth2( req, sid )
                          if( !accessToken ) throw new Error('Unexpected Error Occured')

                          // Keep baseURL & accessToken in session for next requests
                          base_URL =
                          req.session[ sid ].base_URL = baseURL
                          access_token =
                          req.session[ sid ].access_token = accessToken
                        }
                        catch( error ) { console.log('OAuth2.0 Error: ', error ) }

                      // Add accessToken to Authorization bearer headers
                      options.auth = { bearer: access_token }
        break
      // Use JWT Auth
      case 'jwt': if( !access_token )
                    try {
                      // Process JWT authentication
                      const { baseURL, accessToken } = await ProcessJWT( req, sid )
                      if( !accessToken ) throw new Error('Unexpected Error Occured')

                      // Keep baseURL & accessToken in session for next requests
                      base_URL =
                      req.session[ sid ].base_URL = baseURL
                      access_token =
                      req.session[ sid ].access_token = accessToken
                    }
                    catch( error ) { console.log('JWT Error: ', error ) }

                  // Add accessToken to Authorization bearer headers
                  options.auth = { bearer: access_token }
        break
      // Use Basic Auth Credentials
      case 'bac': // Re-use token store in session
                  if( !access_token ) {
                    try {
                      const [ user, password ] = Buffer.from( access_token, 'base64' ).toString('ascii').split(':')
                      // User & password Authorization
                      options.auth = { user, password, setImmediately: true }
                    }
                    catch( error ) { console.log('Invalid BAC Token Error: ', error ) }
                  }

                  // Get credentials
                  else try {
                    // Process BAC authentication
                    const { baseURL, user, password } = await ProcessBAC( req, sid )
                    if( !accessToken ) throw new Error('Unexpected Error Occured')

                    // Keep baseURL & accessToken in session for next requests
                    base_URL =
                    req.session[ sid ].base_URL = baseURL
                    // Store user and password as base64 token in
                    access_token =
                    req.session[ sid ].access_token = Buffer.from(`${user }:${ password}`).toString('base64')

                    // User & password Authorization
                    options.auth = { user, password, setImmediately: true }
                  }
                  catch( error ) { console.log('BAC Error: ', error ) }
        break
      // Use Bearer Auth Token
      case 'bat': if( !access_token )
                    try {
                      // Process BAT authentication
                      const { baseURL, accessToken } = await ProcessBAT( req, sid )
                      if( !accessToken ) throw new Error('Unexpected Error Occured')

                      // Keep baseURL & accessToken in session for next requests
                      base_URL =
                      req.session[ sid ].base_URL = baseURL
                      access_token =
                      req.session[ sid ].access_token = accessToken
                    }
                    catch( error ) { console.log('BAT Error: ', error ) }

                  // Add accessToken to Authorization bearer headers
                  options.auth = { bearer: access_token }
        break
    }
  }

  /**
   * Assign request body by specified `Content-Type` in headers
   *
   * MITIGATION:
   * Add empty JSON body to the request to prevent error like,
   * `Expected request body for application/json content-type`
   *
   * NOTE:
   * `multipart/form-data` body is mandatory
   *
   */
  const contentType = options.headers && ( options.headers['content-type'] || options.headers['Content-Type'] )
  switch( contentType ) {
    case 'multipart/form-data': options.formData = body || {}; break
    case 'application/json': options.body = body || {}; break

    // With or without body
    default: if( body ) options.form = body
  }

  /*
   * Attach provider's Base URL when it's a 3rd
   * party API with required authorization or
   * assign LXP API Server by default.
   */
  if( !/http(s?):\/\/(.+)/.test( options.url ) ) {
    if( base_URL )
      options.url = base_URL + options.url

    else {
      if( !req.session.credentials
          || !req.session.credentials.multipple )
        return res.status(400)
                  .json({
                    error: true,
                    status: 'MULTIPPLE',
                    message: 'Undefined API Request Credentials'
                  })

      const { domain, token, deviceId, role } = req.session.credentials.multipple

      options.url = process.env.MULTIPPLE_API_SERVER + options.url
      options.headers = {
        'Origin': decodeURIComponent( domain ),
        'MP-User-Agent': 'MP.studio/1.0',
        'MP-Auth-Token': token,
        'MP-Auth-Device': deviceId,
        'MP-Auth-Role': role
      }
    }
  }

  function onError( error ){

    if( !error.statusCode )
      switch( error.code ) {
        case 'ENOTFOUND': error.statusCode = 404; break
      }

    res.status( error.statusCode || 400 ).send( error.message )
  }

  switch( responseType ) {
    // Blob content
    case 'blob': req.pipe( request( url ).on( 'error', onError ) )
                    .pipe( res )
        break
    // Binary content
    case 'binary': options.encoding = 'binary'
                    request( options, ( error, response, body ) => {
                      if( error ) return onError( error )
                      res.send(`data:${response.headers['content-type']};base64,${Buffer.from( body, 'binary' ).toString('base64')}`)
                    })
      break

    default: options.json = true
              request( options, ( error, response, body ) => {
                if( error ) return onError( error )

                res.headers = response.headers
                res.send( body || { code: response.statusCode, message: response.message } )
              } )
  }
}