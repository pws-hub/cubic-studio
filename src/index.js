
import http from 'http'
import './globals'
import * as Core from './core'
import uiServer from './ui/server'

// Hot Realoding in of UI Server: dev mode
if( process.env.NODE_ENV == 'development' && module.hot ){
  module.hot.accept( './ui/server', () => {
    console.log('[HMR] Reloading `./ui/server`...')

    try { uiServer = require('./ui/server').default } 
    catch( error ){ console.error( error ) }
  })

  module.hot.accept( './core', () => {
    console.log('[HMR] Reloading `./core`...')

    try { require('./core').default } 
    catch( error ){ console.error( error ) }
  })

  // require('./core')
}

/*---------------------------------------------------------------------------*/
const
port = process.env.HTTP_PORT || 9000,
server = http.Server( uiServer ),
{ ioServer } = Core.init( server )

// Attach socket Server to app
uiServer.io = ioServer

/*---------------------------------------------------------------------------*/

export default server
// .use( ( req, res ) => uiServer.handle( req, res ) )
.listen( port, error => {
  if( error ){
    console.error( error )
    return
  }
  
  console.log(`> Started on port ${port}`)
})
