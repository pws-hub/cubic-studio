
import type { ShellOptions, ProgressWatcher } from '../../types'
import Shell from 'shelljs'

export const shell = Shell

export default ( scripts: string, options: ShellOptions, progress?: ProgressWatcher ): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    const child = shell.exec( scripts, { ...options, silent: true, async: true } )

    if( typeof progress == 'function' ) {
      child.stdout?.on( 'data', data => {
        // Console.log('Stdout: ---', data )
        progress( false, data, data.length )
      })
      child.stderr?.on( 'data', data => {
        // Console.log('Stderr: ---', data )
        progress( data )
      })
    }

    child
    .on( 'error', reject )
    // Process emit exit
    .on( 'close', code => {
      // Console.log('Process emit close: %s', code )
      if( code !== 0 ) {
        const error: any = new Error(`Error, exit code ${code}`)

        error.name = 'RUN_SCRIPT_ERROR'
        error.code = code

        return reject( error )
      }

      return resolve()
    })
    // Process emit exit
    .on( 'exit', code => console.log('[Shell] Exit: ', code ) )
  } )
}
