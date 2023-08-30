
import os from 'os'
import FileSystem from '../../core/FileSystem'

const ACTIVE_CWD_WATCHERS = {}

function initChannel( socket ){
  console.log('FST New Connection: ', socket.id )

  function init( type, options = {}, callback ){

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
        listener = ( event, path, stats ) => socket.emit( 'FS::EVENT', event, path, stats )

        // Drop existing watcher
        if( ACTIVE_CWD_WATCHERS[ options.cwd ] )
          ACTIVE_CWD_WATCHERS[ options.cwd ].close()

        // Watch this cwd
        ACTIVE_CWD_WATCHERS[ options.cwd ] = socket.data.FS.watch( { ignore }, listener )
      }
    }

    typeof callback == 'function' && callback({ error: false })
  }

  async function execute( method, ...args ){

    let callback = () => {}
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
    catch( error ) {
      console.log( error )
      callback({ error: true, message: error.message })
    }
  }

  async function exit( callback ){
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

export default ioServer => {
  ioServer
  .of(`/${ process.env.FST_NAMESPACE}` )
  .on( 'connection', initChannel )
}