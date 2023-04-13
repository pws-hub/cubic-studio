
import hpp from 'hpp'
import http from 'http'
import redis from 'redis'
import logger from 'morgan'
import helmet from 'helmet'
import express from 'express'
import randtoken from 'rand-token'
import session from 'express-session'
import redisConnect from 'connect-redis'
import cookieParser from 'cookie-parser'
import markoMiddleware from '@marko/express'
import * as Core from './core'
import WWW from 'frontend/views/www.marko'
import ErrorPage from 'frontend/views/pages/error.marko'
import LPSServer from './core/LPSServer'

const
getInitialScope = async ( req, res ) => {

  let initStr = JSON.stringify({
    env: process.env.NODE_ENV,
    mode: process.env.MODE,
    asm: String( process.env.LOCALHOST_API ) === 'true' ? 'local' : 'cloud', // Api server mode
    instance: Configs.INSTANCE_PROVIDER,
    providers: Configs.AUTH_PROVIDERS,
    namespaces: {
      CAR: process.env.CAR_NAMESPACE, // Cubic API Request namespace
      FST: process.env.FST_NAMESPACE, // File System Transaction namespace
      IPT: process.env.IPT_NAMESPACE // Internal Process Transaction namespace
    },
    ...( await Sync.getSession( 'auth', req ) )
  })
  const salt = randtoken.generate(128)

  // Default Encrypting Tool: Modified Base64 encoder
  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = '', i = 0

  do {
      let a = initStr.charCodeAt(i++)
      let b = initStr.charCodeAt(i++)
      let c = initStr.charCodeAt(i++)

      a = a ? a : 0
      b = b ? b : 0
      c = c ? c : 0

      const b1 = ( a >> 2 ) & 0x3F
      const b2 = ( ( a & 0x3 ) << 4 ) | ( ( b >> 4 ) & 0xF )
      let b3 = ( ( b & 0xF ) << 2 ) | ( ( c >> 6 ) & 0x3 )
      let b4 = c & 0x3F

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
  initStr = `${n_result }$${ salt.split('').reverse().join('')}`

  if( res ) res.json( initStr ) // Via init route
  else return initStr // Internal request
},
app = express()

.disable('x-powered-by')
.enable('trust proxy')
.use( helmet({ contentSecurityPolicy: false }) )
.use( logger('dev') )
.use( express.json({ extended: true }) )
.use( express.urlencoded({ extended: true }) )
.use( hpp() )
.use( markoMiddleware() )

/* -------------------------------------------------------------------*/
// Session management Configuration
const sessionConfig = {
  secret: process.env.SESSION_ENCRYPT_SECRET,
  name: `${Configs.APPNAME}-CST33`,
  saveUninitialized: true,
  resave: false,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: ( isOncloud() && process.env.HTTP_SECURE ),
    maxAge: Number( process.env.SESSION_EXPIRY ) * 24 * 3600000 // Session age per day
  }
}

/*
 * Initialize Redis-server connection to manage session
 * store in production
 */
if( process.env.NODE_ENV == 'production' ) {
  /*
   *{
   *host: process.env.REDIS_SERVER_HOST,
   *port: Number( process.env.REDIS_SERVER_PORT ),
   *username: process.env.REDIS_SERVER_USERNAME,
   *password: process.env.REDIS_SERVER_PASSWORD
   *}
   */
  const
  RedisStore = redisConnect( session ),
  RedisClient = redis.createClient( process.env.REDIS_SERVER_URL )

  RedisClient
  .on( 'connect', error => console.log('[REDIS] Connected to redis successfully') )
  .on( 'error', error => console.log(`[${ clc.red('ERROR') }] Redis-Server Error: `, error ) )

  // Use different session name in production
  sessionConfig.name += '--CSMM778'

  Object.assign( sessionConfig, { store: new RedisStore({ client: RedisClient, ttl: 86400 }) } )
}
// Cookie-parser is required in development mode
else app.use( cookieParser( process.env.COOKIE_ENCRYPT_SECRET ) )

app.use( session( sessionConfig ) )

/* -------------------------------------------------------------------*/
// Initialize LPS (Locale Package Store) Server
LPSServer({ serverType: 'express' }, app ).listen()

/* -------------------------------------------------------------------*/
// Application Assets Manifest
const Assets = require( process.env.RAZZLE_ASSETS_MANIFEST )

app.use( express.static( process.env.RAZZLE_PUBLIC_DIR ) )

/* ---------------------------------------------------------------------------*/
// Initial Scope information
.get( '/init', getInitialScope )

// Routes
.use( '/', require('./routers/index').default )

// User Account handler
.get( '/*', async ( req, res ) => {
  try {
    res.marko( WWW, {
                      lang: 'en',
                      title: Configs.APPNAME,
                      init: await getInitialScope( req ),
                      Assets
                    } )
  }
  catch( error ) { console.log( error.message ) }
})

/* ------------------------ Error handlers ------------------------*/
// Catch 404 and forward to error handler
.use( ( req, res, next ) => {
  const error = new Error('Not Found')
  error.status = 404
  next( error )
})

/*
 * Print error stacktrace at the backend and
 * render the related error page at the frontend
 */
.use( ( error, req, res, next ) => {

  const statusCode = error.status || 500
  let stackTraces = {}

  // No stacktraces leaked to user in production mode
  if( process.env.NODE_ENV === 'development' ) {
    console.error( clc.red('[ERROR] '), error )
    stackTraces = error
  }

  res.marko( ErrorPage, {
                          lang: 'en',
                          title: Configs.APPNAME,
                          status: statusCode,
                          message: error.message
                        } )
})

/* ---------------------------------------------------------------------------*/
// Create HTTPS & Socket Server
const
server = http.Server( app ),
{ ioServer } = Core.init( server )

// Attach socket Server to app
app.io = ioServer

export default server
