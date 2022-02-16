
import { io } from 'socket.io-client'

let isConnected = false

function ProcessHandler( client ){

  function run( ...args ){
    return new Promise( ( resolve, reject ) => {
      if( !client || !isConnected )
        return reject('[IPT-Client] No connection to server')
      
      client.emit( 'IPROCESS::RUN', ...args, resolve )
    } )
  }

  /** Initated process progression trackers and listeners
   * 
   */
  this.trackers = {}
  client
  .on( 'IPROCESS::PROGRESS', ( process, error, stats ) => {
    // Fire targeted process listener
    typeof this.trackers[ process ] == 'function'
    && this.trackers[ process ]( error, stats )
  })
  
  // Process 

  this.setup = async ( dataset, tracker ) => {
    try {
      // Register setup tracker
      if( typeof tracker == 'function' )
        this.trackers.setup = tracker

      const { error, message, response } = await run( 'setupProject', dataset )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ){
      console.log( error )
      return {}
    }
  }
  this.import = async ( dataset, tracker ) => {
    try {
      // Register import tracker
      if( typeof tracker == 'function' )
        this.trackers.import = tracker

      const { error, message, response } = await run( 'importProject', dataset )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ){
      console.log( error )
      return {}
    }
  }

  this.emulator = ( dataset, tracker ) => {
    // Unique ID of emulator control instance
    const emulatorId = `${dataset.type}:${dataset.name}`
    
    return {
      run: async () => {
        try {
          // Register setup process tracker
          if( typeof tracker == 'function' )
            this.trackers.emulator = tracker

          const { error, message, response } = await run( 'runEM', emulatorId, dataset )
          if( error ) throw new Error( message )

          return response
        }
        catch( error ){
          console.log( error )
          return false
        }
      },
      reload: async () => {
        try {
          const { error, message, response } = await run( 'reloadEM', emulatorId, dataset )
          if( error ) throw new Error( message )
          
          return response
        }
        catch( error ){
          console.log( error )
          return false
        }
      },
      quit: async () => {
        try {
          const { error, message, response } = await run( 'quitEM', emulatorId )
          if( error ) throw new Error( message )

          // Unregister emulator process tracker
          if( typeof tracker == 'function' )
            delete this.trackers.emulator

          return response
        }
        catch( error ){
          console.log( error )
          return false
        }
      }
    }
  }

  this.addComponents = async ( dataset, directory, tracker ) => {
    try {
      // Register `add-component` tracker
      if( typeof tracker == 'function' )
        this.trackers['add-components'] = tracker

      const { error, message, response } = await run( 'addComponent', dataset, directory )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }

  this.addPackages = async ( dataset, directory, tracker ) => {
    try {
      // Register `add-packages` tracker
      if( typeof tracker == 'function' )
        this.trackers['add-packages'] = tracker

      const { error, message, response } = await run( 'addPackages', dataset, directory, 'npm' )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }
  this.removePackages = async ( dataset, directory, tracker ) => {
    try {
      // Register `remove-packages` tracker
      if( typeof tracker == 'function' )
        this.trackers['remove-packages'] = tracker

      const { error, message, response } = await run( 'removePackages', dataset, directory )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }
  this.updatePackages = async ( dataset, directory, tracker ) => {
    try {
      // Register `update-packages` tracker
      if( typeof tracker == 'function' )
        this.trackers['update-packages'] = tracker

      const { error, message, response } = await run( 'updatePackages', dataset, directory, 'npm' )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }
  this.refreshPackages = async ( directory, tracker ) => {
    try {
      // Register `refresh-packages` tracker
      if( typeof tracker == 'function' )
        this.trackers['refresh-packages'] = tracker

      const { error, message, response } = await run( 'refreshPackages', directory, 'npm' )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ){
      console.log( error )
      return false
    }
  }
  
  // Exist initiated process channel
  this.close = () => {
    isConnected = false
    client.emit('IPROCESS::CLOSE')
  }
}

function Manager( client ){
  
  this.create = options => {
    return new Promise( ( resolve, reject ) => {

      if( !client || !isConnected )
        return reject('[IPT-Client] No connection to server')

      client
      .emit( 'IPROCESS::CREATE', options, ({ error, message }) => {
        if( error ) 
          return reject( message )

        resolve( new ProcessHandler( client ) )
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
    IPTClient = io('/'+( namespace || ''), options )
    .on( 'connect', () => {
      debugLog('[IPT-Client] Connection established')

      isConnected = true
      resolve( new Manager( IPTClient ) )
    } )
    .on( 'disconnect', () => {
      debugLog('[IPT-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      debugLog('[IPT-Client] Connected', error )
      reject( error )
    } )
  } )
}