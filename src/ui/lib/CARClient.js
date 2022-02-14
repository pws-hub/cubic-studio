
import fetch from 'node-fetch'
import { io } from 'socket.io-client'

let 
CARClient,
isConnected = false

function sendRequest( payload ){
  return new Promise( ( resolve, reject ) => {

    if( CARClient ){
      if( !isConnected )
        return reject('[CAR-Client] No connection to server')

      CARClient.emit('API::REQUEST', payload, resolve )
      return
    }
    else {
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( payload )
      }
      
      fetch( '/api', options )
          .then( res => res.json() )
          .then( resolve )
          .catch( reject )
    }
  } )
}

export default ( namespace, user ) => {
  return new Promise( ( resolve, reject ) => {
    
    window.RGet = async url => { return await sendRequest({ url }) }
    window.RPost = async ( url, body ) => { return await sendRequest({ url, method: 'POST', body }) }
    window.RPut = async ( url, body ) => { return await sendRequest({ url, method: 'PUT', body }) }
    window.RPatch = async ( url, body ) => { return await sendRequest({ url, method: 'PATCH', body }) }
    window.RDelete = async ( url, body ) => { return await sendRequest({ url, method: 'DELETE', body }) }

    if( window.mode !== 'local' ){
      
      return resolve( isConnected = true )
    }

    // Establish socket connection channel
    const options = {
      extraHeaders: { 'X-User-Agent': 'Cubic.socket~001/1.0' },
      reconnectionDelayMax: 20000,
      withCredentials: true,
      auth: { token: user.id }
    }

    CARClient = io('/'+( namespace || ''), options )
    .on( 'connect', () => {
      debugLog('[CAR-Client] Connection established')
      resolve( isConnected = true )
    } )
    .on( 'disconnect', () => {
      debugLog('[CAR-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      debugLog('[CAR-Client] Connected', error )
      reject( error )
    } )
  } )
}