
import request from 'request-promise'

function initChannel( socket ){
  console.log('CAR New Connection: ', socket.id )

  async function makeRequest( payload, callback ){
    let response

    try {
      let { url, ...options } = payload

      if( /^http(s?):\/\//.test( url ) )
        response = { error: true, message: 'Invalid Request URL' }
      
      else {
        options = {
          ...options,
          url: toOrigin( process.env.API_SERVER ) + url,
          headers: {
            'Authorization': 'Bearer '+ socket.data.AccessToken,
            'Content-Type': 'application/json'
          },
          json: true
        }
        
        response = await request( options )
      }
    }
    catch( error ){ response = { error: true, message: error.message } }
    
    typeof callback == 'function' && callback( response )
  }

  socket
  .on( 'API::REQUEST', makeRequest )
}

export default ioServer => {
  ioServer
  .of('/'+ process.env.CAR_NAMESPACE )
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