
import { io } from 'socket.io-client'

let 
SyncClient,
isConnected = false

function emit( _event, ...args ){
  if( !isConnected ) return
  SyncClient.emit( `SYNC::${_event}`, ...args )
}

window.addEventListener( 'online', () => emit( 'IS_ONLINE', true ) )
window.addEventListener( 'offline', () => emit( 'IS_ONLINE', false ) )

export default () => {
  return new Promise( ( resolve, reject ) => {
    SyncClient = io()
    .on( 'connect', () => {
      debugLog('[Sync-Client] Connection established')

      isConnected = true
      emit( 'IS_ONLINE', window.navigator.onLine )

      resolve()
    } )
    .on( 'disconnect', () => {
      debugLog('[Sync-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      debugLog('[Sync-Client] Connected', error )
      reject( error )
    } )
  } )
}