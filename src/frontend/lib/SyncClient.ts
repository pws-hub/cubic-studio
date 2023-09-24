
import { io, Socket } from 'socket.io-client'

type SyncEvent = 'IS_ONLINE'

let
SyncClient: Socket,
isConnected = false

function emit( _event: SyncEvent, value: boolean ){
  // Dispatch event in frontend
  window.isOnline = value
  window.GState.set('online', value )

  // Sync event with backend
  if( !isConnected ) return
  SyncClient.emit(`SYNC::${_event}`, value )
}

async function hasInternet(){
  try {
    await window.fetch('https://www.google.com', { mode: 'no-cors' })
    return true
  }
  catch( error ){ return false }
}

window.addEventListener('online', async () => await hasInternet() && emit( 'IS_ONLINE', true ) )
window.addEventListener('offline', () => emit( 'IS_ONLINE', false ) )

export default (): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    SyncClient = io()
    .on( 'connect', async () => {
      window.debugLog('[Sync-Client] Connection established')

      isConnected = true
      emit( 'IS_ONLINE', window.navigator.onLine && await hasInternet() )

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