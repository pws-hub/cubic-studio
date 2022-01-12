import os from 'os'
import hpp from 'hpp'
import redis from 'redis'
import logger from 'morgan'
import helmet from 'helmet'
import express from 'express'
import { APS } from 'globe-sdk'
import randtoken from 'rand-token'
import session from 'express-session'
import redisConnect from 'connect-redis'
import cookieParser from 'cookie-parser'
import multipart from 'express-form-data'
import markoMiddleware from '@marko/express'
import CDNAssets from './lib/CDNAssets'
import Entrypoint from './views/www.marko'
import ErrorPage from './views/error.marko'

const 
getInitialScope = ( req, res ) => {
  
  let initStr = JSON.stringify({
                                env: process.env.NODE_ENV
                              })
  const salt = randtoken.generate(128)

  // Default Encrypting Tool: Modified Base64 encoder
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = '', i = 0

  do {
      var a = initStr.charCodeAt(i++)
      var b = initStr.charCodeAt(i++)
      var c = initStr.charCodeAt(i++)

      a = a ? a : 0
      b = b ? b : 0
      c = c ? c : 0

      var b1 = ( a >> 2 ) & 0x3F
      var b2 = ( ( a & 0x3 ) << 4 ) | ( ( b >> 4 ) & 0xF )
      var b3 = ( ( b & 0xF ) << 2 ) | ( ( c >> 6 ) & 0x3 )
      var b4 = c & 0x3F

      if( !b ) b3 = b4 = 64
      else if( !c ) b4 = 64

      result += b64.charAt( b1 ) + b64.charAt( b2 ) + b64.charAt( b3 ) + b64.charAt( b4 )

  } while ( i < initStr.length )

  // Introduce unknown portion of string
  const index = parseInt( result.length / 4 )
  let
  n_result = '',
  slices = 0

  result = result.split('').reverse().join('')
  for( let x = 1; x <= 4; x++ )
    n_result += result.slice( slices, ( slices += index ) )+( x < 4 ? salt : '' )

  // Add the remain portion
  n_result += result.slice( slices )
  // Last value
  initStr = n_result +'$'+ salt.split('').reverse().join('')

  if( res ) res.json( initStr ) // via init route
  else return initStr // internal request
},
app = express()

.disable('x-powered-by')
.enable('trust proxy')
.use( helmet({ contentSecurityPolicy: false }) )
.use( logger('dev') )
.use( express.json({ extended: true }) )
.use( express.urlencoded({ extended: true }) )
// .use( hpp() )
.use( markoMiddleware() )

/*-------------------------------------------------------------------*/
// Application Assets Manifest
const Assets = require( process.env.RAZZLE_ASSETS_MANIFEST )

app.use( express.static( process.env.RAZZLE_PUBLIC_DIR ) )

/*---------------------------------------------------------------------------*/
// Initial Scope information
.get( '/init', getInitialScope )

// Routes
.use( '/', require('./routers/index').default )

// User Account handler
.get( '/*', ( req, res ) => {
  try {
    res.marko( Entrypoint, {
                            lang: 'en',
                            title: process.env.APPNAME,
                            init: getInitialScope( req ),
                            Assets
                          } )
  } 
  catch( error ){ console.log( error.message ) }
})

/*------------------------ Error handlers ------------------------*/
// Catch 404 and forward to error handler
.use( ( req, res, next ) => {
  let error = new Error('Not Found')
  error.status = 404
  next( error )
})

// Print error stacktrace at the backend and
// render the related error page at the frontend
.use( ( error, req, res, next ) => {

  const statusCode = error.status || 500
  let stackTraces = {}

  // no stacktraces leaked to user in production mode
  if( process.env.NODE_ENV === 'development' ){
    console.error( clc.red('[ERROR] '), error )
    stackTraces = error
  }
  
  res.marko( ErrorPage, {
                          lang: 'en',
                          title: process.env.APPNAME,
                          status: statusCode,
                          message: error.message
                        } )
})

export default app
 