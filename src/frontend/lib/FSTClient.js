
import { io } from 'socket.io-client'

let isConnected = false
const ACTIVE_FS_INSTANCES = []

function FSHandler( mode, client ){

  function execute( ...args ){
    return new Promise( ( resolve, reject ) => {
      if( !client || !isConnected )
        return reject('[FST-Client] No connection to server')

      client.emit('FS::EXEC', ...args, resolve )
    } )
  }

  // Listeners of background operation on specified `cwd`. Default is os.homeDir() (/Users/username)
  this.listeners = []
  // Receive operation event and trigger listeners
  client.on( 'FS::EVENT', ( ...args ) => this.listeners.map( fn => fn( ...args ) ) )


  this.directory = async ( path, options = {} ) => {
    try {
      // Do not collect subdirs in explorer mode
      if( mode === 'explorer' ) options.subdir = false

      const { error, message, response } = await execute( 'directory', path, options )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ) {
      console.log( error )
      return {}
    }
  }

  this.newDir = async ( path, options = {} ) => {
    try {
      const { error, message, response } = await execute( 'newDir', path, options )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.newFile = async ( path, content, options = {} ) => {
    try {
      const { error, message, response } = await execute( 'newFile', path, content, options )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.readFile = async ( path, options = {} ) => {
    try {
      const { error, message, response } = await execute( 'readFile', path, options )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return null
    }
  }

  this.rename = async ( path, newname ) => {
    try {
      const { error, message, response } = await execute( 'rename', path, newname, options )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.remove = async ( path ) => {
    try {
      const { error, message, response } = await execute( 'remove', path )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.move = async ( source, destination ) => {
    try {
      const { error, message, response } = await execute( 'move', source, destination )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.copy = async ( source, destination ) => {
    try {
      const { error, message, response } = await execute( 'copy', source, destination )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.watch = ( listener = () => {} ) => {
    // Register watch listener
    this.listeners.push( listener )
    return true
  }

  this.exit = () => {
    // Exist initiated FS: Close channel
    isConnected = false
    client.emit('FS::EXIT')
  }
}

function Manager( client ){

  this.init = ( mode, options ) => {
    return new Promise( ( resolve, reject ) => {

      if( !client || !isConnected )
        return reject('[FST-Client] No connection to server')

      client.emit( 'FS::INIT', mode, options, ({ error, message }) => {
        if( error )
          return reject( message )

        resolve( new FSHandler( mode, client ) )
      })
    } )
  }
}

export default namespace => {
  return new Promise( ( resolve, reject ) => {
    // Establish socket connection channel
    const
    options = {
      extraHeaders: { 'X-User-Agent': 'Cubic.socket~001/1.0' },
      reconnectionDelayMax: 20000
    },
    FSTClient = io(`/${ namespace || ''}`, options )
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