
import './globals'
import server from './server'

// Hot Realoding in of UI Server: dev mode
if( process.env.NODE_ENV == 'development' && module.hot )
  module.hot.accept( './server', () => {
    console.log('[HMR] Reloading `./server`...')

    try { require('./server') } 
    catch( error ){ console.error( error ) }
  })
  
const port = process.env.HTTP_PORT || 9000

export default server
// .use( ( req, res ) => app.handle( req, res ) )
.listen( port, error => {
  if( error ){
    console.error( error )
    return
  }
  
  console.log(`> Started on port ${port}`)
})
