
import Emulator from '../src/core/Emulator.alt'

;( async () => {
  try {
    const
    options = {
      cwd: '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Notex',
      name: 'sandbox-server',
      debug: true,
      watcher: ( process, error, stats ) => {
        error ?
          console.error( error )
          : console.log( `${process} -- [${stats.percent}]: ${stats.message}`)
      }
    },
    em = new Emulator( options )

    console.log( await em.run() )
    /*
     * Console.log( await em.reload() )
     * console.log( await em.stop() )
     * console.log( await em.metadata() )
     * console.log( await em.exit() )
     */
  }
  catch( error ) {
    console.log( error )
  }
} )()