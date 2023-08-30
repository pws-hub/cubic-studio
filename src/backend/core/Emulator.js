
import fs from 'fs-inter'
import shell from 'shelljs'

function isValidEnv( env ){
  return typeof env == 'object' && !isEmpty( env )
}

function runCommand( script, options, progress ){
  return new Promise( ( resolve, reject ) => {

    options = {
      ...options,
      stdio: 'pipe',
      shell: true,
      async: true,
      silent: true,
      detached: true,
      windowsHide: true
    }

    const sp = shell.exec( script, options )

    sp.stdout.on('data', data => progress( false, data, data.length ) )
    sp.stderr.on('data', data => progress( data ) )

    sp
    .on('error', reject )
    .on('spawn', () => { return resolve( sp ) })
  } )
}

function getProcess( cwd, ports, debug ){
  return new Promise( ( resolve, reject ) => {

    if( !Array.isArray( ports ) && !ports.length )
      return reject( new Error('Undefined Ports list. <Array> expected') )

    const
    options = {
      stdio: 'inherit',
      shell: true,
      async: true,
      silent: true,
      windowsHide: true
    },
    lsof = shell.exec(`lsof -t ${cwd}/.sandbox`, options )
    let pids = []

    // console.log(`-------------lsof -t ${cwd}.sandbox && lsof -t -i :${ports.join(',')}` )

    lsof.stdout.on( 'data', data => { if( data ) pids = Array.from( new Set([ ...pids, ...data.trim().split(/\s+/) ]) ) } )
    lsof.stderr.on( 'data', data => typeof debug == 'function' && debug('Error: ', data ) )

    lsof
    .on( 'error', reject )
    .on( 'close', () => { return resolve( pids ) } )
  } )
}

function killProcess( pids, debug ){
  return new Promise( ( resolve, reject ) => {
    const
    options = {
      stdio: 'inherit',
      shell: true,
      async: true,
      silent: true,
      windowsHide: true
    },
    lsof = shell.exec(`kill -9 ${pids.join(' ')}`, options )
    lsof.stderr.on( 'data', data => typeof debug == 'function' && debug('Error: ', data ) )

    lsof
    .on( 'error', reject )
    .on( 'close', () => { return resolve() } )
  } )
}

export default class Emulator {

  constructor( options = {} ){
    // Process metadata
    this.metadata = {
      cwd: options.cwd || process.cwd(),
      name: `${toNSI( options.name )}:cubic:sandbox`,
      script: options.script || '.sandbox/start.sh',
      env: {
        NODE_ENV: 'development',
        HOST: 'localhost',
        PORT: 33000,
        PORT_DEV: 33001,
        PATH: process.env.PATH
      },
      hostname: null,
      watch: false // Disable watch & restart server
    }

    // Emulator Server Manager
    this.esm = false
    this.debugMode = options.debug

    this.watcher = typeof options.watcher == 'function' ? options.watcher : this.debug
  }

  // Internal operation log: Debug mode
  debug( ...args ){ this.debugMode && console.log( ...args ) }

  getMetadata(){ return this.metadata }

  async getConfig(){
    // Fetch emulator config in .cubic
    let config
    try { config = JSON.parse( await fs.readFile( `${this.metadata.cwd}/.cubic`, 'UTF-8' ) ) }
    catch( error ) { throw new Error('Not found or Invalid .cubic file at the project root') }

    if( !config.emulator )
      throw new Error('No emulator configuration found in .cubic file')

    return config.emulator
  }

  async start(){
    // Start emulator
    const config = await this.getConfig()

    if( isValidEnv( config.env ) )
      this.metadata.env = {
        ...this.metadata.env, // Default or previous `env`
        ...config.env, // Defined `env`

        // Set development server PORT
        PORT_DEV: Number( config.env.PORT || this.metadata.env.PORT ) + 1
      }

    const { cwd, env, script } = this.metadata
    // Running emulator server hostname
    this.metadata.hostname = toOrigin(`${env.HOST}:${env.PORT}`, !isOncloud() )

    // Find processes running on this `{cwd}/.sandbox` directory
    const pids = await getProcess( cwd, [ env.PORT, env.PORT_DEV ], this.debug.bind(this) )
    if( Array.isArray( pids ) && pids.length ) {
      // Process already running
      if( pids.length >= 2 ) {
        this.debug(`Process [${pids[0]}] already running`)
        this.metadata.pid = parseInt( pids[0] )

        setTimeout( () => this.watcher( false, { started: true }), 1000 )
        return this.getMetadata()
      }

      // Kill exiting processes
      await killProcess( pids, this.debug.bind(this) )
    }

    // Start process
    this.esm = await runCommand( script, { cwd, env }, ( error, data, bytes ) => {

      if( error ) return this.watcher( error )
      if( data ) {
        data = data.replace(/\s+/, ' ')
        this.watcher( false, { percent: bytes, message: data } )

        // Process server running signal
        data.includes( env.PORT ) && this.watcher( false, { percent: 100, started: true })
      }
    } )
    this.esm.unref()

    // Listen to unexpected exist
    this.esm.on('close', code => this.watcher( false, { message: 'Emulator closed', killed: this.esm.killed, exit: code } ) )

    this.metadata.pid = this.esm.pid
    return this.getMetadata()
  }

  async stop(){
    // Stop emulator
    const config = await this.getConfig()

    if( isValidEnv( config.env ) )
      this.metadata.env = {
        ...this.metadata.env, // Default or previous `env`
        ...config.env, // Defined `env`

        // Set development server PORT
        PORT_DEV: Number( config.env.PORT || this.metadata.env.PORT ) + 1
      }

    // Kill emulator process
    this.esm && this.esm.kill()

    // Make sure processes running from this `{cwd}/.sandbox` directory are killed
    const
    { cwd, env } = this.metadata,
    pids = await getProcess( cwd, [ env.PORT, env.PORT_DEV ], this.debug.bind(this) )

    if( Array.isArray( pids ) && pids.length ) {
      // Kill exiting processes
      try {
        await killProcess( pids, this.debug.bind(this) )
        this.watcher( false, { killed: true, message: `PORT [:${env.PORT}, :${env.PORT_DEV}] - PID: [${pids.join(', ')}]` } )
      }
      catch( error ) { this.watcher('Process Not Found: ', error ) }
    }

    return {}
  }

  async restart(){
    await this.stop()
    return await this.start()
  }
}