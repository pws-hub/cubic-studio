
import type { Server, Socket } from 'socket.io'
import type { ProcessCallback } from '../../../types'
import os from 'os'
import FileSystem, { FSOptions, FSWatcher } from '../../core/FileSystem'

type FSType = 'explorer' | 'project'
type FSMethods = 'directory' | 'newDir' | 'newFile' | 'readFile' | 'rename' | 'remove' | 'move' | 'copy'

const ACTIVE_CWD_WATCHERS: { [index: string ]: FSWatcher } = {}

function initChannel( socket: Socket ){
  console.log('FST New Connection: ', socket.id )

  function init( type: FSType, options: FSOptions = {}, callback?: ProcessCallback ){

    if( options && typeof options !== 'object' ) {
      typeof callback == 'function'
      && callback({ error: true, message: 'Invalid FS Initialization Options'})
      return
    }

    switch( type ) {
      case 'explorer': {
        if( !options.cwd ) // Current OS user's home directory. Eg. /Users/myname
          options.cwd = os.homedir()

        socket.data.FS = new FileSystem( options )
      } break

      case 'project':
      default: {
        if( !options.cwd ) {
          typeof callback == 'function'
          && callback({ error: true, message: 'Undefined FS options <cwd>' })
          return
        }

        socket.data.FS = new FileSystem( options )

        // Report watch event to client
        const
        ignore = [
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/cache/**',
          '**/.sandbox/**',
          '**/node_modules/**'
        ],
        listener = ( event: string, path: string, stats: any ) => socket.emit( 'FS::EVENT', event, path, stats )

        // Drop existing watcher
        ACTIVE_CWD_WATCHERS[ options.cwd ]?.close()
        // Start new watcher on this cwd
        ACTIVE_CWD_WATCHERS[ options.cwd ] = socket.data.FS.watch( { ignore }, listener )
      }
    }

    typeof callback == 'function' && callback({ error: false })
  }

  async function execute( method: FSMethods, ...args: any[] ){

    let callback: ProcessCallback = () => {}
    // Extract callback function
    if( typeof args.slice(-1)[0] === 'function' )
      callback = args.pop()

    // Console.log( method, ...args, callback )
    try {
      if( !socket.data || !socket.data.FS )
        throw new Error('FST channel not initialized')

      if( typeof socket.data.FS[ method ] !== 'function' )
        throw new Error(`FST <${method}> method not found`)

      // Call targeted FileSystem method
      callback({
        error: false,
        response: await socket.data.FS[ method ]( ...args )
      })
    }
    catch( error: any ) {
      console.log( error )
      callback({ error: true, message: error.message })
    }
  }

  async function exit( callback: ProcessCallback ){
    // Close FileSystem Handler and the communication channel
    delete socket.data
    socket.disconnect( true )

    typeof callback == 'function' && callback({ error: false, message: 'Closed' })
  }

  socket
  .on( 'FS::INIT', init )
  .on( 'FS::EXEC', execute )
  .on( 'FS::EXIT', exit )
}

export default ( ioServer: Server ) => {
  ioServer
  .of(`/${process.env.FST_NAMESPACE}` )
  .on( 'connection', initChannel )
}