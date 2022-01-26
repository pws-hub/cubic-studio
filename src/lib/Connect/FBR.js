
import fetch from 'node-fetch'

function initChannel( socket ){
  console.log('FBR New Connection: ', socket.id )

  async function makeRequest( payload, callback ){
    let response

    try {
      let { url, ...options } = payload

      if( /^http(s?):\/\//.test( url ) )
        response = { error: true, message: 'Invalid Request URL' }
      
      else {
        options.headers = {
          'Authorization': 'Bearer '+ socket.data.AccessToken,
          'Content-Type': 'application/json'
        }

        if( options.body ) 
          options.body = JSON.stringify( options.body )
          
        response = await ( await fetch( toOrigin( process.env.API_SERVER ) + url, options ) ).json()
      }
    }
    catch( error ){ response = { error: true, message: error } }
    
    typeof callback == 'function' && callback( response )
  }

  socket
  .on( 'API::REQUEST', makeRequest )
}

export default ioServer => {
  ioServer
  .of('/'+ process.env.FBR_NAMESPACE )
  .use( async ( socket, next ) => {
    const { auth } = socket.handshake
    
    if( !auth || !auth.token )
      return next( new Error( HTTP_ERROR_MESSAGES['403'] ) )

    // TODO: Make request to verify the auth.token


    // Assign API Access token to this socket
    socket.data.AccessToken = auth.token
    
    next()
  })
  .on( 'connection', initChannel )
}