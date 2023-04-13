
import IProcess from '../../core/IProcess'

function initChannel( socket ){
  console.log('IPT New Connection: ', socket.id )

  function create( options = {}, callback = (() => {}) ){

    if( !options || typeof options !== 'object' ) {
      callback({ error: true, message: 'Invalid IProcess Initialization Options'})
      return
    }

    // Listen to ongoing progression stages of each process
    options.watcher = ( process, error, stats ) => socket.emit( 'IPROCESS::PROGRESS', process, error, stats )
    // New Process mamager
    socket.data.IProcess = new IProcess( options )

    callback({ error: false })
  }

  async function run( method, ...args ){

    let callback = () => {}
    // Extract callback function
    if( typeof args.slice(-1)[0] === 'function' )
      callback = args.pop()

    // Console.log( method, ...args, callback )
    try {
      if( !socket.data || !socket.data.IProcess )
        throw new Error('IPT channel not initialized')

      if( typeof socket.data.IProcess[ method ] !== 'function' )
        throw new Error(`IPT <${method}> method not found`)

      // Call targeted IProcess method
      callback({
        error: false,
        response: await socket.data.IProcess[ method ]( ...args )
      })
    }
    catch( error ) {
      console.log( error )
      callback({ error: true, message: error })
    }
  }

  async function close( callback = (() => {}) ){
    // Close Process Handler and the communication channel
    socket.data.IProcess.close()

    delete socket.data
    socket.disconnect( true )

    callback({ error: false, message: 'Closed' })
  }

  socket
  .on( 'IPROCESS::CREATE', create )
  .on( 'IPROCESS::CLOSE', close )
  .on( 'IPROCESS::RUN', run )
}

export default ioServer => {
  ioServer
  .of(`/${process.env.IPT_NAMESPACE}` )
  .on('connection', initChannel )
}