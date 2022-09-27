
import { io } from 'socket.io-client'

let isConnected = false

function ProcessHandler( client ){

  function run( ...args ){
    return new Promise( ( resolve, reject ) => {
      if( !client || !isConnected )
        return reject('[IPT-Client] No connection to server')

      client.emit('IPROCESS::RUN', ...args, resolve )
    } )
  }

  /**
   * Initated process progression trackers and listeners
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
    catch( error ) {
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
    catch( error ) {
      console.log( error )
      return {}
    }
  }

  this.Emulator = ( dataset, tracker ) => {
    // Unique ID of emulator control instance
    const emulatorId = `${dataset.type}:${dataset.namespace}.${dataset.nsi}`

    return {
      start: async () => {
        try {
          // Register setup process tracker
          if( typeof tracker == 'function' )
            this.trackers.emulator = tracker

          const { error, message, response } = await run( 'startEM', emulatorId, dataset )
          if( error ) throw new Error( message )

          return response
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      restart: async () => {
        try {
          const { error, message, response } = await run( 'restartEM', emulatorId, dataset )
          if( error ) throw new Error( message )

          return response
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      stop: async () => {
        try {
          const { error, message, response } = await run( 'stopEM', emulatorId, dataset )
          if( error ) throw new Error( message )

          // Unregister emulator process tracker
          if( typeof tracker == 'function' )
            delete this.trackers.emulator

          return response
        }
        catch( error ) {
          console.log( error )
          return false
        }
      }
    }
  }

  this.JSPackageManager = ( packages, directory ) => {
    return {
      install: async tracker => {
        try {
          // Register `install-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['install-packages'] = tracker

          const { error, message, response } = await run('installJSPackages', packages, directory, 'npm' )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      remove: async tracker => {
        try {
          // Register `remove-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['remove-packages'] = tracker

          const { error, message, response } = await run( 'removeJSPackages', packages, directory )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      update: async tracker => {
        try {
          // Register `update-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['update-packages'] = tracker

          const { error, message, response } = await run( 'updateJSPackages', packages, directory, 'npm' )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      refresh: async tracker => {
        try {
          // Register `refresh-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['refresh-packages'] = tracker

          const { error, message, response } = await run( 'refreshJSPackages', directory, 'npm' )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      }
    }
  }
  this.CubicPackageManager = ( packages, directory ) => {
    return {
      install: async tracker => {
        try {
          // Register `install-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['install-packages'] = tracker

          const { error, message, response } = await run('installCubicPackages', packages, directory )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      remove: async tracker => {
        try {
          // Register `remove-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['remove-packages'] = tracker

          const { error, message, response } = await run( 'removeCubicPackages', packages, directory )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      update: async tracker => {
        try {
          // Register `update-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['update-packages'] = tracker

          const { error, message, response } = await run( 'updateCubicPackages', packages, directory )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      }
    }
  }

  this.addComponents = async ( list, directory, tracker ) => {
    try {
      // Register `add-component` tracker
      if( typeof tracker == 'function' )
        this.trackers['add-components'] = tracker

      const { error, message, response } = await run( 'addComponents', list, directory )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  this.installApp = async ( metadata, tracker ) => {
    try {
      // Register `install-app` tracker
      if( typeof tracker == 'function' )
        this.trackers['install-app'] = tracker

      const { error, message, response } = await run( 'installApp', metadata )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }
  this.uninstallApp = async ( sid, tracker ) => {
    try {
      // Register `uninstall-app` tracker
      if( typeof tracker == 'function' )
        this.trackers['uninstall-app'] = tracker

      const { error, message, response } = await run( 'uninstallApp', sid )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
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

  this.options = null

  this.create = options => {
    return new Promise( ( resolve, reject ) => {

      this.options = options

      if( !client || !isConnected )
        return reject('[IPT-Client] No connection to server')

      client.emit( 'IPROCESS::CREATE', options, ({ error, message }) => {
        if( error ) return reject( message )
        resolve( new ProcessHandler( client ) )
      })
    } )
  }

  this.reset = () => {
    client.emit( 'IPROCESS::CREATE', this.options, ({ error, message }) => {
      if( error ) throw new Error( message )
    })
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
    IPTClient = io(`/${namespace || ''}`, options )
    let manager

    IPTClient
    .on( 'connect', () => {
      debugLog('[IPT-Client] Connection established')

      isConnected = true

      if( !manager ) {
        // New instanciation
        manager = new Manager( IPTClient )
        resolve( manager )
      }
      else manager.reset() // Reset manager instance
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