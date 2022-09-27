
import Emulator from '../src/backend/core/Emulator'

;( async () => {
  try {
    const
    options = {
      cwd: '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Docdis',
      name: 'sandbox-server',
      debug: true,
      watcher: ( error, stats ) => {
        error ?
          console.error( error )
          : console.log( `[${stats.percent}]: ${stats.message}`)
      }
    },
    em = new Emulator( options )

    console.log( await em.start() )
    // await em.stop()
    /*
     * Console.log( await em.restart() )
     * console.log( await em.stop() )
     * console.log( await em.getMetadata() )
     */
  }
  catch( error ) {
    console.log( error )
  }
} )()