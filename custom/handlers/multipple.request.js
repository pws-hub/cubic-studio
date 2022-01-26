
import fetch from 'node-fetch'

export default async ( req, res ) => {
  try {
    if( !req.session.credentials
        || !req.session.credentials.multipple )
      throw new Error('Undefined API Request Credentials')

    const 
    { domain, token, deviceId, role } = req.session.credentials.multipple,
    { url, method, body } = req.body,
    options = {
      method,
      headers: {
        'Origin': domain,
        'MP-User-Agent': 'MP.studio/1.0',
        'MP-Auth-Token': token,
        'MP-Auth-Device': deviceId,
        'MP-Auth-Role': role
      },
      body: JSON.stringify( body )
    },
    response = await fetch( toOrigin( process.env.MULTIPPLE_API_SERVER ) + url, options )
    res.json( await response.json() )
  }
  catch( error ){
    console.log('Authentication Checking failed: ', error )
    return res.status(400)
              .json({ 
                error: true,
                status: 'MULTIPPLE',
                message: error.message 
              })
  }
}