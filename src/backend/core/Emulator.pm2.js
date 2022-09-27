
import pm2 from 'pm2'
import fs from 'fs-inter'
import fetch from 'node-fetch'

function isValidEnv( env ){
  return typeof env == 'object' && !isEmpty( env )
}
export default class Emulator {

  constructor( options = {} ){
    // Process config
    this.process = {
      cwd: options.cwd || process.cwd(),
      name: `${toNSI( options.name )}:cubic:sandbox`,
      script: options.script || '.sandbox/start.sh',
      env: {
        NODE_ENV: 'development',
        HOST: 'localhost',
        PORT: 33000,
        PORT_DEV: 33001
      },
      watch: false // Disable watch & restart server by pm2
    }

    // Emulator Server Manager
    this.esm = false
    this.debugMode = options.debug

    this.watcher = typeof options.watcher == 'function' ? options.watcher : this.debug
  }

  // Internal operation log: Debug mode
  debug( ...args ){ this.debugMode && console.log( ...args ) }

  async getConfig(){
    // Fetch emulator config in .cubic
    let config
    try { config = JSON.parse( await fs.readFile( `${this.process.cwd }/.cubic`, 'UTF-8' ) ) }
    catch( error ) { throw new Error('Not found or Invalid .cubic file at the project root') }

    if( !config.emulator )
      throw new Error('No emulator configuration found in .cubic file')

    return config.emulator
  }

  connect(){
    // Establish connection with local PM2 instance
    return new Promise( ( resolve, reject ) => {
      // Connected
      if( this.esm ) return resolve()

      pm2.connect( error => {
        if( error )
          return reject( error )

        this.esm = pm2

        // Listen to process events
        this.esm.launchBus( ( error, bus ) => {
          if( error ) return reject( error )
          bus.on( 'process:msg', ({ data, _process }) => this.watcher( data.event, data.stats ) )
        } )

        resolve()
      } )
    } )
  }

  disconnect(){
    // Establish connection with local PM2 instance
    return new Promise( ( resolve, reject ) => {
      // Existing connection
      if( !this.esm ) return reject()

      this.esm.disconnect()
      this.esm = false

      resolve()
    } )
  }

  start(){
    // Start emulator
    return new Promise( ( resolve, reject ) => {
      this.connect()
          .then( async () => {
            try {
              const config = await this.getConfig()

              if( isValidEnv( config.env ) )
                this.process.env = {
                  ...this.process.env, // Default or previous `env`
                  ...config.env, // Defined `env`

                  // Set development server PORT
                  PORT_DEV: Number( config.env.PORT || this.process.env.PORT ) + 1
                }

              this.esm.stop( this.process.name )
              this.esm.start( this.process, ( error, metadata ) => {
                if( error ) {
                  this.disconnect()
                  return reject( error )
                }

                if( !Array.isArray( metadata ) || !metadata[0] )
                  return reject('Process Not Found')

                const
                { pid } = metadata[0],
                { name, cwd, env } = this.process,
                hostname = toOrigin( `${env.HOST}:${env.PORT}`, !isOncloud() )

                /**
                 * TODO: Handle this with PM2 process.send & process.launchBus event manager
                 * ISSUE: Razzle spawn the sandbox server process so PM2
                 *        only run a script to start the process without
                 *        managing it. Therefore process.send(...) & bus.on(...)
                 *        between started sandbox-server and Emulator doen't work
                 *
                 * HACK: Check frequently whether the started
                 *        process (server) has finished compiling
                 *        and now listen.
                 */
                let
                MAX_ATTEMPT = 45, // 45 seconds
                untilServerUp = setInterval( async () => {
                  try {
                    const up = await ( await fetch( hostname, { method: 'GET' } ) ).text()
                    // Server is up
                    clearInterval( untilServerUp )
                    resolve({ pid, cwd, name, hostname })
                  }
                  catch( error ) {
                    MAX_ATTEMPT--
                    this.debug(`Failed [${45 - MAX_ATTEMPT}]: `, error.message )

                    // Maximum attempt reached
                    if( MAX_ATTEMPT == 0 ) {
                      // Emulator server still not available: exit
                      clearInterval( untilServerUp )

                      this.exit()
                          .then( () => reject('Emulator server failed to load.') )
                          .catch( error => reject('Unexpected error occured: ', error.message ) )
                    }
                  }
                }, 1000 )
              } )
            }
            catch( error ) { reject( error ) }
          } )
          .catch( reject )
    } )
  }

  restart(){
    return new Promise( ( resolve, reject ) => {
      this.connect()
          .then( async () => {
            try {
              const config = await this.getConfig()

              if( isValidEnv( config.env ) )
                this.process.env = {
                  ...this.process.env, // Default or previous `env`
                  ...config.env, // Defined `env`

                  // Set development server PORT
                  PORT_DEV: Number( config.env.PORT || this.process.env.PORT ) + 1
                }

              this.esm.reload( this.process.name, async ( error, metadata ) => {
                if( error ) {
                  this.disconnect()
                  return reject( error )
                }

                if( !Array.isArray( metadata ) || !metadata[0] )
                  return reject('Process Not Found')

                const config = await this.getConfig()
                if( isValidEnv( config.env ) )
                  this.process.env = {
                    ...this.process.env, // Default or previous `env`
                    ...config.env, // Defined `env`

                    // Set development server PORT
                    PORT_DEV: Number( config.env || this.process.env.PORT ) + 1
                  }

                const
                { pid } = metadata[0],
                { name, cwd, env } = this.process,
                hostname = toOrigin( `${env.HOST}:${env.PORT}`, !isOncloud() )

                /**
                 * TODO: Handle this with PM2 process.send & process.launchBus event manager
                 * ISSUE: Razzle spawn the sandbox server process so PM2
                 *        only run a script to start the process without
                 *        managing it. Therefore process.send(...) & bus.on(...)
                 *        between started sandbox-server and Emulator doen't work
                 *
                 * HACK: Check frequently whether the started
                 *        process (server) has finished compiling
                 *        and now listen.
                 */
                let
                MAX_ATTEMPT = 45, // 45 seconds
                untilServerUp = setInterval( async () => {
                  try {
                    const up = await ( await fetch( hostname, { method: 'GET' } ) ).text()
                    // Server is up
                    clearInterval( untilServerUp )
                    resolve({ pid, cwd, name, hostname })
                  }
                  catch( error ) {
                    MAX_ATTEMPT--
                    this.debug(`Failed [${45 - MAX_ATTEMPT}]: `, error.message )

                    // Maximum attempt reached
                    if( MAX_ATTEMPT == 0 ) {
                      // Emulator server still not available: exit
                      clearInterval( untilServerUp )

                      this.exit()
                          .then( () => reject('Emulator server failed to load.') )
                          .catch( error => reject('Unexpected error occured: ', error.message ) )
                    }
                  }
                }, 1000 )
              } )
            }
            catch( error ) { reject( error ) }
          } )
          .catch( reject )
    } )
  }

  stop(){
    return new Promise( ( resolve, reject ) => {

      this.connect()
          .then( () => {
            this.esm.stop( this.process.name, ( error, _process ) => {
              if( error ) {
                this.disconnect()
                return reject( error )
              }

              this.disconnect()
              resolve( _process )
            } )
          } )
          .catch( reject )
    } )
  }

  metadata(){
    return new Promise( ( resolve, reject ) => {

      this.connect()
          .then( () => {
            this.esm.describe( this.process.name, ( error, metadata ) => {
              if( error ) return reject( error )
              resolve( metadata )
            } )
          } )
          .catch( reject )
    } )
  }

  exit(){
    return new Promise( ( resolve, reject ) => {

      this.connect()
          .then( () => {
            this.esm.delete( this.process.name, error => {
              if( error ) {
                this.disconnect()
                return reject( error )
              }

              this.disconnect()
              resolve()
            } )
          } )
          .catch( reject )
    } )
  }
}