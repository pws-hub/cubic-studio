
import os from 'os'
import FileSystem from '../FileSystem'

function initChannel( socket ){
  console.log('FST New Connection: ', socket.id )

  function initFS( type, options = {}, callback ){
    
    if( options && typeof options !== 'object' ){
      typeof callback == 'function' 
      && callback({ error: true, message: 'Invalid FS Initialization Options'})
      return
    }

    switch( type ){
      case 'explorer': if( !options.cwd ) // Current OS user's home directory. Eg. /Users/myname
                          options.cwd = os.homedir()
                          
                      socket.data.FS = new FileSystem( options )
          break
      case 'project':
      default: socket.data.FS = new FileSystem( options )
    }

    typeof callback == 'function' 
    && callback({ error: false })
  }

  async function handleRequest( method, ...args ){
    
    let callback = () => {}
    // Extract callback function
    if( typeof args.slice(-1)[0] === 'function' )
      callback = args.pop()

    console.log( method, ...args, callback )

    try {
      // Call targeted FileSystem method
      const response = await socket.data.FS[ method ]( ...args )
      callback({ error: false, response })
    }
    catch( error ){ 
      console.log( error )
      callback({ error: true, message: error }) 
    }
  }

  socket
  .on( 'FS::INIT', initFS )
  .on( 'FS::REQUEST', handleRequest )
}

export default ioServer => {
  ioServer
  .of('/'+ process.env.FST_NAMESPACE )
  .on( 'connection', initChannel )
}