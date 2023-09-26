
import type { ProcessResponse } from '../../types'
import fetch from 'node-fetch'
import { io, Socket } from 'socket.io-client'

declare global {
  interface Window {
    RGet: ( url: string ) => Promise<ProcessResponse>
    RPut: ( url: string, body: any ) => Promise<ProcessResponse>
    RPost: ( url: string, body: any ) => Promise<ProcessResponse>
    RPatch: ( url: string, body: any ) => Promise<ProcessResponse>
    RDelete: ( url: string, body?: any ) => Promise<ProcessResponse>
  }
}

let
CARClient: Socket,
isResolved = false,
isConnected = false

function sendRequest( payload: any ): Promise<ProcessResponse>{
  return new Promise( ( resolve, reject ) => {
    if( CARClient ) {
      if( !isConnected )
        return reject('[CAR-Client] No connection to server')

      CARClient.emit('API::REQUEST', payload, resolve )
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

export default ( namespace: string, atoken: string ): Promise<boolean> => {
  return new Promise( ( resolve, reject ) => {
    
    window.RGet = async url => { return await sendRequest({ url }) }
    window.RPut = async ( url, body ) => { return await sendRequest({ url, method: 'PUT', body }) }
    window.RPost = async ( url, body ) => { return await sendRequest({ url, method: 'POST', body }) }
    window.RPatch = async ( url, body ) => { return await sendRequest({ url, method: 'PATCH', body }) }
    window.RDelete = async ( url, body ) => { return await sendRequest({ url, method: 'DELETE', body: body || {} }) }

    if( window.mode !== 'local' )
      return resolve( isConnected = true )

    // Establish socket connection channel
    const options = {
      extraHeaders: { 'X-User-Agent': 'Cubic.socket~001/1.0' },
      reconnectionDelayMax: 20000,
      withCredentials: true,
      auth: { atoken }
    }

    CARClient = io(`/${ namespace || ''}`, options )
    .on( 'connect', () => {
      window.debugLog('[CAR-Client] Connection established')

      isConnected = true
      if( isResolved ) return

      isResolved = true
      resolve( isConnected )
    } )
    .on( 'disconnect', () => {
      window.debugLog('[CAR-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      window.debugLog('[CAR-Client] Connected', error )
      reject( error )
    } )
  } )
}