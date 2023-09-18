
import { io } from 'socket.io-client'

type SyncEvent = 'IS_ONLINE'

let
SyncClient,
isConnected = false

function emit( _event: SyncEvent, ...args: any[] ){
  if( !isConnected ) return
  SyncClient.emit(`SYNC::${_event}`, ...args )
}

window.addEventListener( 'online', () => emit( 'IS_ONLINE', true ) )
window.addEventListener( 'offline', () => emit( 'IS_ONLINE', false ) )

export default (): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    SyncClient = io()
    .on( 'connect', () => {
      window.debugLog('[Sync-Client] Connection established')

      isConnected = true
      emit( 'IS_ONLINE', window.navigator.onLine )

      resolve()
    } )
    .on( 'disconnect', () => {
      window.debugLog('[Sync-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      window.debugLog('[Sync-Client] Connected', error )
      reject( error )
    } )
  } )
}