
import shell from 'shelljs'

export default ( scripts, options, progress ) => {
  return new Promise( ( resolve, reject ) => {

    const child = shell.exec( scripts, { ...options, silent: true, async: true } )

    child.stdout.on( 'data', data => {
      // Console.log('Stdout: ---', data )
      progress( false, data, data.length )
    })
    child.stderr.on( 'data', data => {
      // Console.log('Stderr: ---', data )
      progress( data )
    })

    child
    .on( 'error', reject )
    // Process emit exit
    .on( 'close', code => {
      // Console.log('Process emit close: %s', code )
      if( code !== 0 ) {
        const error = new Error(`Error, exit code ${code}`)

        error.name = 'RUN_SCRIPT_ERROR'
        error.code = code

        return reject( error )
      }

      return resolve()
    })
    // Process emit exit
    .on( 'exit', code => {} )
  } )
}
