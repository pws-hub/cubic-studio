
import { io } from 'socket.io-client'

let isConnected = false

function ExplorerHandler( client ){

  function sendRequest( ...args ){
    return new Promise( ( resolve, reject ) => {
      if( !client || !isConnected )
        return reject('[FST-Client] No connection to server')

      client.emit('FS::REQUEST', ...args, resolve )
    } )
  }

  this.directory = async ( path, options = {} ) => {
    try {
      // Do not collect subdirs
      options.subdir = false

      const { error, message, response } = await sendRequest( 'directory', path, options )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ){
      console.log( error )
      return {}
    }
  }

  this.newDir = async ( path, options = {} ) => {
    try {
      const { error, message, response } = await sendRequest( 'newDir', path, options )
      if( error ) throw new Error( message )
      
      return response || true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }


}

function Manager( client ){
  
  this.init = ( type, options ) => {
    return new Promise( ( resolve, reject ) => {

      if( !client || !isConnected )
        return reject('[FST-Client] No connection to server')

      client.emit( 'FS::INIT', type, options, ({ error, message }) => {
        if( error ) 
          return reject( message )

        resolve( new ExplorerHandler( client ) )
      })
    } )
  }
}

export default ( namespace ) => {
  return new Promise( ( resolve, reject ) => {
    
    // Establish socket connection channel
    const 
    options = {
      extraHeaders: { 'X-User-Agent': 'Cubic.socket~001/1.0' },
      reconnectionDelayMax: 20000
    },
    FSTClient = io('/'+( namespace || ''), options )
    .on( 'connect', () => {
      debugLog('[FST-Client] Connection established')

      isConnected = true
      resolve( new Manager( FSTClient ) )
    } )
    .on( 'disconnect', () => {
      debugLog('[FST-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      debugLog('[FST-Client] Connected', error )
      reject( error )
    } )
  } )
}