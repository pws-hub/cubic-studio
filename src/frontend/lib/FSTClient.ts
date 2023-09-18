import type { ProcessResponse } from '../../types'
import type { FSMode } from '../../backend/lib/Connect/FST'
import type { FSDirectory, FSDirectoryOptions, FSFileOptions, FSOptions } from '../../backend/core/FileSystem'
import { io, Socket } from 'socket.io-client'

type Listener = ( ...args: any[] ) => void

let isConnected = false

export class FSHandler {
  private mode: FSMode
  private client: Socket
  // Listeners of background operation on specified `cwd`. Default is os.homeDir() (/Users/username)
  private listeners: Listener[] = []

  constructor( mode: FSMode, client: Socket ){
    this.mode = mode
    this.client = client

    // Receive operation event and trigger listeners
    this.client.on( 'FS::EVENT', ( ...args ) => this.listeners.map( fn => fn( ...args ) ) )
  }

  private execute( ...args: any[] ): Promise<ProcessResponse>{
    return new Promise( ( resolve, reject ) => {
      if( !this.client || !isConnected )
        return reject('[FST-Client] No connection to server')

      this.client.emit('FS::EXEC', ...args, resolve )
    } )
  }

  async directory( path?: string, options: FSDirectoryOptions = {} ): Promise<FSDirectory | boolean>{
    try {
      // Do not collect subdirs in explorer mode
      if( this.mode === 'explorer' ) options.subdir = false

      const { error, message, response } = await this.execute( 'directory', path, options )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async newDir( path: string, mode?: any ): Promise<boolean>{
    try {
      const { error, message, response } = await this.execute( 'newDir', path, mode )
      if( error ) throw new Error( message )

      return true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async newFile( path: string, content?: any, options: FSFileOptions = {} ): Promise<boolean>{
    try {
      const { error, message, response } = await this.execute( 'newFile', path, content, options )
      if( error ) throw new Error( message )

      return true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async readFile( path: string, options: FSFileOptions = {} ): Promise<any>{
    try {
      const { error, message, response } = await this.execute( 'readFile', path, options )
      if( error ) throw new Error( message )

      return response
    }
    catch( error ) {
      console.log( error )
      return null
    }
  }

  async rename( path: string, newname: string ): Promise<boolean>{
    try {
      const { error, message, response } = await this.execute( 'rename', path, newname )
      if( error ) throw new Error( message )

      return true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async remove( path: string ): Promise<boolean>{
    try {
      const { error, message, response } = await this.execute( 'remove', path )
      if( error ) throw new Error( message )

      return true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async move( source: string, destination: string ): Promise<boolean>{
    try {
      const { error, message, response } = await this.execute( 'move', source, destination )
      if( error ) throw new Error( message )

      return true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  async copy( source, destination ): Promise<boolean>{
    try {
      const { error, message, response } = await this.execute( 'copy', source, destination )
      if( error ) throw new Error( message )

      return true
    }
    catch( error ) {
      console.log( error )
      return false
    }
  }

  watch( listener: Listener = () => {} ){
    // Register watch listener
    this.listeners.push( listener )
    return true
  }

  exit(){
    // Exist initiated FS: Close channel
    isConnected = false
    this.client.emit('FS::EXIT')
  }
}

export class FSTClientManager {
  private mode: FSMode
  private options: FSOptions
  private client: Socket
  private handler: FSHandler

  constructor( client: Socket ){
    this.client = client
  }

  init( mode, options ): Promise<FSHandler>{
    return new Promise( ( resolve, reject ) => {
      this.mode = mode
      this.options = options

      if( !this.client || !isConnected )
        return reject('[FST-Client] No connection to server')

      this.client.emit( 'FS::INIT', mode, options, ({ error, message }) => {
        if( error ) return reject( message )

        this.handler = new FSHandler( mode, this.client )
        resolve( this.handler )
      })
    } )
  }

  reset(){
    this.client.emit('FS::INIT', this.mode, this.options, ({ error, message }) => {
      if( error ) throw new Error( message )
    })
  }
}

export default ( namespace: string ): Promise<FSTClientManager> => {
  return new Promise( ( resolve, reject ) => {
    // Establish socket connection channel
    const
    options = {
      extraHeaders: { 'X-User-Agent': 'Cubic.socket~001/1.0' },
      reconnectionDelayMax: 20000
    },
    FSTClient = io(`/${namespace || ''}`, options )
    let manager: FSTClientManager

    FSTClient
    .on( 'connect', () => {
      window.debugLog('[FST-Client] Connection established')

      isConnected = true

      if( !manager ) {
        // New instanciation
        manager = new FSTClientManager( FSTClient )
        resolve( manager )
      }
      else manager.reset() // Reset manager instance
    } )
    .on( 'disconnect', () => {
      window.debugLog('[FST-Client] Disconnected')
      isConnected = false
    } )
    .on( 'error', error => {
      window.debugLog('[FST-Client] Connected', error )
      reject( error )
    } )
  } )
}