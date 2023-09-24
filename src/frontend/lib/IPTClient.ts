import type { EventTracker, ProcessResponse } from '../../types'
import type { CPRAccess, CPackage, JSPackage } from '../../types/package'
import type { Metadata, Project } from '../../types/project'
import type { IProcessOptions } from '../../backend/core/IProcess'
import { io, Socket } from 'socket.io-client'

export interface EmulatorHandler {
  start: () => Promise<any>;
  restart: () => Promise<any>;
  stop: () => Promise<any>;
}
export interface JSPackageManager {
  install: ( tracker: EventTracker ) => Promise<string | boolean>
  remove: ( tracker: EventTracker ) => Promise<string | boolean>
  update: ( tracker: EventTracker ) => Promise<string | boolean>
  refresh: ( tracker: EventTracker ) => Promise<string | boolean>
}

export interface CPackageManager {
  install: ( tracker: EventTracker ) => Promise<string | boolean>
  remove: ( tracker: EventTracker ) => Promise<string | boolean>
  update: ( tracker: EventTracker ) => Promise<string | boolean>
}

let isConnected = false

export class IProcessHandler {
  private client: Socket
  private trackers: { [index: string]: EventTracker } = {}

  constructor( client: Socket ){
    this.client = client

    /**
     * Initated process progression trackers and listeners
     *
     */
    client
    .on( 'IPROCESS::PROGRESS', ( process, error, stats ) => {
      // Fire targeted process listener
      typeof this.trackers[ process ] == 'function'
      && this.trackers[ process ]( error, stats )
    })
  }

  private run( ...args: any[] ): Promise<ProcessResponse>{
    return new Promise( ( resolve, reject ) => {
      if( !this.client || !isConnected )
        return reject('[IPT-Client] No connection to server')

      this.client.emit('IPROCESS::RUN', ...args, resolve )
    } )
  }

  async setup( dataset: Project, tracker: EventTracker ): Promise<any>{
    try {
      // Register setup tracker
      if( typeof tracker == 'function' )
        this.trackers.setup = tracker

      const { error, message, response } = await this.run('setupProject', dataset )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ) {
      console.log( error )
      return { error: true, message: error.message }
    }
  }
  async import( dataset: Project, tracker: EventTracker ): Promise<any>{
    try {
      // Register import tracker
      if( typeof tracker == 'function' )
        this.trackers.import = tracker

      const { error, message, response } = await this.run('importProject', dataset )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ) {
      console.log( error )
      return { error: true, message: error.message }
    }
  }
  async publish( dataset: Project, tracker: EventTracker ): Promise<any>{
    try {
      /**
       * Cubic Package Repository configuration
       * 
       * Will be later handled by the CPR user 
       * interface settings
       */
      const cprAccess: CPRAccess = {
        source: 'http://cpr.cubic.studio:60777',
        apiversion: 1,
        token: window.GState.get('accessToken')
      }

      // Register `publish-plugins` tracker
      if( typeof tracker == 'function' )
        this.trackers.publish = tracker

      const { error, message, response } = await this.run('publishProject', dataset, cprAccess )
      if( error ) throw new Error( message )

      return response || {}
    }
    catch( error ) {
      console.log( error )
      return { error: true, message: error.message }
    }
  }

  Emulator( dataset: Project, tracker: EventTracker ): EmulatorHandler {
    // Unique ID of emulator control instance
    const emulatorId = `${dataset.type}:${dataset.namespace}.${dataset.nsi}`

    return {
      start: async () => {
        try {
          // Register setup process tracker
          if( typeof tracker == 'function' )
            this.trackers.emulator = tracker

          const { error, message, response } = await this.run( 'startEM', emulatorId, dataset )
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
          const { error, message, response } = await this.run( 'restartEM', emulatorId, dataset )
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
          const { error, message, response } = await this.run( 'stopEM', emulatorId, dataset )
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

  JSPackageManager( packages: JSPackage[], directory: string ){
    return {
      install: async ( tracker: EventTracker ): Promise<string | boolean> => {
        try {
          // Register `install-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['install-packages'] = tracker

          const { error, message, response } = await this.run('installJSPackages', packages, directory, 'npm' )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      remove: async ( tracker: EventTracker ): Promise<string | boolean> => {
        try {
          // Register `remove-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['remove-packages'] = tracker

          const { error, message, response } = await this.run( 'removeJSPackages', packages, directory )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      update: async ( tracker: EventTracker ): Promise<string | boolean> => {
        try {
          // Register `update-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['update-packages'] = tracker

          const { error, message, response } = await this.run( 'updateJSPackages', packages, directory, 'npm' )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      refresh: async ( tracker: EventTracker ): Promise<string | boolean> => {
        try {
          // Register `refresh-packages` tracker
          if( typeof tracker == 'function' )
            this.trackers['refresh-packages'] = tracker

          const { error, message, response } = await this.run( 'refreshJSPackages', directory, 'npm' )
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
  CPackageManager( packages: CPackage[], directory: string ){
    /**
     * Cubic Package Repository configuration
     * 
     * Will be later handled by the CPR user 
     * interface settings
     */
    const cprAccess: CPRAccess = {
      source: 'http://cpr.cubic.studio:60777',
      apiversion: 1,
      token: window.GState.get('accessToken')
    }

    return {
      install: async ( tracker: EventTracker ) => {
        try {
          // Register `install-plugins` tracker
          if( typeof tracker == 'function' )
            this.trackers['install-plugins'] = tracker

          const { error, message, response } = await this.run('cubicPackage', 'install', packages, directory, cprAccess )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      remove: async ( tracker: EventTracker ) => {
        try {
          // Register `remove-plugins` tracker
          if( typeof tracker == 'function' )
            this.trackers['remove-plugins'] = tracker

          const { error, message, response } = await this.run('cubicPackage', 'remove', packages, directory, cprAccess )
          if( error ) throw new Error( message )

          return response || true
        }
        catch( error ) {
          console.log( error )
          return false
        }
      },
      update: async ( tracker: EventTracker ) => {
        try {
          // Register `update-plugins` tracker
          if( typeof tracker == 'function' )
            this.trackers['update-plugins'] = tracker

          const { error, message, response } = await this.run('cubicPackage', 'update', packages, directory, cprAccess )
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

  async addComponents( list: string[], directory: string, tracker: EventTracker ){
    try {
      // Register `add-component` tracker
      if( typeof tracker == 'function' )
        this.trackers['add-components'] = tracker

      const { error, message, response } = await this.run( 'addComponents', list, directory )
      if( error ) throw new Error( message )

      return response || true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async installApp( metadata: Metadata, tracker: EventTracker ): Promise<string | boolean>{
    try {
      // Register `install-app` tracker
      if( typeof tracker == 'function' )
        this.trackers['install-app'] = tracker

      const { error, message, response } = await this.run( 'installApp', metadata )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }
  async uninstallApp( sid: string, tracker: EventTracker ): Promise<boolean>{
    try {
      // Register `uninstall-app` tracker
      if( typeof tracker == 'function' )
        this.trackers['uninstall-app'] = tracker

      const { error, message, response } = await this.run( 'uninstallApp', sid )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  // Exist initiated process channel
  close(){
    isConnected = false
    this.client.emit('IPROCESS::CLOSE')
  }
}

export class IPTClientManager {
  private client: Socket
  private options: IProcessOptions

  constructor( client ){
    this.client = client
  }

  create( options: IProcessOptions ): Promise<IProcessHandler>{
    return new Promise( ( resolve, reject ) => {
      this.options = options

      if( !this.client || !isConnected )
        return reject('[IPT-Client] No connection to server')

      this.client.emit( 'IPROCESS::CREATE', options, ({ error, message }) => {
        if( error ) return reject( message )
        resolve( new IProcessHandler( this.client ) )
      })
    } )
  }

  reset(){
    this.client.emit( 'IPROCESS::CREATE', this.options, ({ error, message }) => {
      if( error ) throw new Error( message )
    })
  }
}

export default ( namespace: string ): Promise<IPTClientManager> => {
  return new Promise( ( resolve, reject ) => {
    // Establish socket connection channel
    let options: any = {
      extraHeaders: { 'X-User-Agent': 'Cubic.socket~001/1.0' },
      reconnectionDelayMax: 20000
    }

    const 
    IPTClient = io(`/${namespace || ''}`, options )
    let manager: IPTClientManager

    IPTClient
    .on( 'connect', () => {
      window.debugLog('[IPT-Client] Connection established')

      isConnected = true

      if( !manager ) {
        // New instanciation
        manager = new IPTClientManager( IPTClient )
        resolve( manager )
      }
      else manager.reset() // Reset manager instance
    } )
    .on( 'disconnect', () => {
      window.debugLog('[IPT-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      window.debugLog('[IPT-Client] Connected', error )
      reject( error )
    } )
  } )
}