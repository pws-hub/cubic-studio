/**
 * Cubic API Request channel handler
 */
import type { RequestResponse } from 'request'
import type { Server, Socket } from 'socket.io'
import request, { RequestPromiseOptions } from 'request-promise'

type Payload = {
  url: string,
  method: string,
  body?: any
}

function initChannel( socket: Socket ){
  console.log('CAR New Connection: ', socket.id )

  async function makeRequest( payload: Payload, callback: ( response: RequestResponse ) => void ){
    let response

    try {
      let { url, ...options } = payload

      if( /^http(s?):\/\//.test( url ) )
        response = { error: true, message: 'Invalid Request URL' }

      else {
        const
        uri = process.env.WORKSPACE_API_BASE_URL + url,
        requestOptions: RequestPromiseOptions = {
          ...options,
          headers: {
            'Authorization': `Bearer ${socket.data.AccessToken}`,
            'Content-Type': 'application/json'
          },
          json: true
        }

        response = await request( uri, requestOptions )
      }
    }
    catch( error: any ) { response = { error: true, message: error.message } }

    typeof callback == 'function' && callback( response )
  }

  socket
  .on( 'API::REQUEST', makeRequest )
}

export default ( ioServer: Server ) => {
  ioServer
  .of(`/${ process.env.CAR_NAMESPACE}` )
  .use( async ( socket, next ) => {
    const { auth } = socket.handshake

    if( !auth?.atoken )
      return next( new Error('Access Forbidden') )

    // TODO: Make request to verify the auth.atoken


    // Assign API Access token to this socket
    socket.data.AccessToken = auth.atoken

    next()
  })
  .on( 'connection', initChannel )
}