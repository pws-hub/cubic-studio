
import './backend/globals'
import server from './backend/server'

// Hot Realoding in of UI Server: dev mode
// if( process.env.NODE_ENV == 'development' && module.hot )
//   module.hot.accept( './backend/server', () => {
//     console.log('[HMR] Reloading `./backend/server`...')

//     try { require('./backend/server') }
//     catch( error ) { console.error( error ) }
//   })

const port = process.env.HTTP_PORT || 9000

export default server.listen({ port }, () => console.log(`\nCubic Studio \n> Started on port ${port}`) )
