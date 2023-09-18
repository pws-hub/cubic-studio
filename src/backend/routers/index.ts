
import request from 'request'
import AuthHandler from '../lib/AuthHandler'
import APIRequestHandler from '../lib/APIRequestHandler'

export default require('express').Router()

// Handle offsite authentication phases: <initiate> and <callback>
.get('/auth/:provider/:phase', AuthHandler )

// Relay point for API request to 3rd party servers made from the UI
.post('/api/:provider', APIRequestHandler )

// CORS proxy router
.get('/proxy', ( req, res, next ) => {

  const url = decodeURIComponent( req.query.url )
  if( !url )
    return res.status(400).send('No url specified')

  if( typeof url !== 'string'
      || new URL( url ).host === null )
    return res.status(400).send(`Invalid url specified: ${url}`)

  next()
},
async ( req, res ) => {
  const url = decodeURIComponent( req.query.url )

  function onError( error ){
    if( !error.statusCode )
      switch( error.code ) {
        case 'ENOTFOUND': error.statusCode = 404; break
      }

    res.status( error.statusCode || 400 ).send( error.message )
  }

  switch( req.query.responseType ) {
    // Blob content
    case 'blob': req.pipe( request( url ).on( 'error', onError ) )
                    .pipe( res )
        break
    case 'json': request({ url, json: true }, ( error, response, body ) => {
                  if( error ) return onError( error )
                  res.json( body )
                })
        break
    // Text & binary contents
    case 'text':
    default: request({ url, encoding: 'binary' },
                      ( error, response, body ) => {
                        if( error ) return onError( error )
                        res.send(`data:${response.headers['content-type']};base64,${Buffer.from( body, 'binary' ).toString('base64')}`)
                      })
  }
} )