
import path from 'path'
import { spawn } from 'child_process'


export default ( script, options, progress ) => {

  return new Promise( ( resolve, reject ) => {
    
    options = options || {}
    options.env = options.env || Object.create( process.env )
    options.cwd = options.cwd || process.cwd()
    options.stdio = options.stdio || 'inherit'
    
    let 
    sh = 'sh',
    shFlag = '-c'

    if( process.platform === 'win32' ){

      sh = process.env.comspec || 'cmd'
      shFlag = '/d /s /c'

      options.windowsVerbatimArguments = true

      if( script.indexOf('./') === 0 
          || script.indexOf('.\\') === 0 
          || script.indexOf('../') === 0 
          || script.indexOf('..\\') === 0 ){
        const splits = script.split(' ')

        splits[0] = path.join( options.cwd, splits[0] )
        script = splits.join(' ')
      }
    }

    // debug('%s %s %s, %j, %j', sh, shFlag, script, options );
    
    const 
    proc = spawn( sh, [ shFlag, script ], options ),
    stdout = [],
    stderr = []

    let closed = false

    if( proc.stdout )
      proc.stdout.on( 'data', buffer => {
        // debug('stdout %d bytes', buffer.length);
        stdout.push( buffer )

        typeof progress == 'function' 
        && progress( 'stdout', buffer.length, buffer.toString() )
      })
    
    if( proc.stderr )
      proc.stderr.on( 'data', buffer => {
        // debug('stderr %d bytes', buffer.length);
        stderr.push( buffer )
        
        typeof progress == 'function' 
        && progress( 'stderr', buffer.length, buffer.toString() )
      })

    proc.on( 'error', error => {
      // debug('proc emit error: %s', err);
      if( closed ) return
      closed = true

      reject( error )
    })

    proc.on( 'close', code => {
      // debug('proc emit close: %s', code);
      if( closed ) return
      closed = true
      
      const stdio = { stdout: null, stderr: null }

      if( stdout.length > 0 )
        stdio.stdout = Buffer.concat( stdout )
      
      if( stderr.length > 0 )
        stdio.stderr = Buffer.concat( stderr )
      
      if( code !== 0 ){
        const error = new Error(`Run "${sh} ${shFlag} ${script}" error, exit code ${code}`)

        error.name = 'RunScriptError'
        error.stdio = stdio
        error.exitcode = code

        return reject( error )
      }

      return resolve( stdio )
    })

    proc.on('exit', code => {
      // debug('proc emit exit: %s', code);
    })
  })
}