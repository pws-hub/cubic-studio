
import fs from 'fs-extra'
import rs from '../lib/RunScript'

export default class PackageManager {

  constructor( options = {} ){
    this.manager = options.manager || 'yarn' // Yarn as default package manager: (Install in packages)
    this.cwd = options.cwd
    this.debugMode = options.debug
    this.watcher = options.watcher || (() => {})

    // Script runner options
    this.rsOptions = { cwd: this.cwd, stdio: 'pipe', shell: true }
  }

  async init( packageJson ){
    // Write initial package.json
    const filepath = this.cwd +'/package.json'
    
    // Check & Fetch existing package.json content
    try {
      const existing = await fs.readJson( filepath )
      
      /** Merge new information with exising
       *  package.json content.
       */
      if( typeof existing == 'object' )
        packageJson = { ...existing, ...packageJson }
    }
    catch( error ){}

    // Generate a new package.json file
    await fs.outputJSON( filepath, packageJson, { spaces: '\t' } )
  }

  install( params = '' ){
    return new Promise( ( resolve, reject ) => {

      if( typeof params == 'function' ){
        progress = params,
        params = ''
      }

      progress = progress || this.watcher
      
      rs( `${this.manager} install ${params}`, this.rsOptions, progress )
        .then( resolve )
        .catch( reject ) 
    } )
  }

  add( packages, params = '', progress ){

    return new Promise( ( resolve, reject ) => {

      if( typeof params == 'function' ){
        progress = params,
        params = ''
      }

      progress = progress || this.watcher

      let verb
      switch( this.manager ){
        case 'npm': verb = 'install'; break
        case 'cpm': break // Cubic Package Manager
        case 'yarn': // Yarn is use by default
        default: verb = 'add' 
      }
      
      // Specified packages: Otherwise try to install all dependencies in package.json
      packages = Array.isArray( packages ) ? packages.join(' ') : packages || ''
      
      rs( `${this.manager} ${verb} ${packages} ${params}`, this.rsOptions, progress )
        .then( resolve )
        .catch( reject )
    } )
  }

  remove( packages, params = '', progress ){

    return new Promise( ( resolve, reject ) => {

      if( !packages )
        throw new Error('Undefined package to uninstall')

      if( typeof params == 'function' ){
        progress = params,
        params = ''
      }

      progress = progress || this.watcher

      let verb
      switch( this.manager ){
        case 'npm': verb = 'uninstall'; break
        case 'cpm': break // Cubic Package Manager
        case 'yarn': // Yarn is use by default
        default: verb = 'remove'
      }

      // Specified packages to uninstall
      packages = Array.isArray( packages ) ? packages.join(' ') : packages || ''

      rs( `${this.manager} ${verb} ${packages} ${params}`, this.rsOptions, progress )
        .then( resolve )
        .catch( reject )
    })
  }

  update( packages, params = '', progress ){

    return new Promise( ( resolve, reject ) => {

      if( !packages )
        throw new Error('Undefined package to uninstall')

      if( typeof params == 'function' ){
        progress = params,
        params = ''
      }

      progress = progress || this.watcher

      // Specified packages to uninstall
      packages = Array.isArray( packages ) ? packages.join(' ') : packages || ''

      rs( `${this.manager} update ${packages} ${params}`, this.rsOptions, progress )
        .then( resolve )
        .catch( reject )
    })
  }
}