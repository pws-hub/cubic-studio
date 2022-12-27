
import path from 'path'
import fs from 'fs-inter'
import request from 'request'
import prequest from 'request-promise'
import rs from '../lib/RunScript'
import CUP from './CUP'

/**
 * Parse package reference string in to
 * construction object.
 *
 * @param {Function} reference  - Eg. plugin:namespace.name~version
 *
 */
function parsePackageReference( reference ){

  const sequence = reference.match(/(\w+):([a-zA-Z0-9_\-+]+).([a-zA-Z0-9_\-+]+)(~(([0-9]\.?){2,3}))?/)
  if( !sequence || sequence.length < 4 )
    return

  const [ _, type, namespace, name, __, version ] = sequence
  return { type, namespace, name, version }
}

function isValidMetadata( metadata ){
  return !!metadata.type
          || !!metadata.nsi
          || !!metadata.name
          || !!metadata.namespace
}

export default class PackageManager extends CUP {

  /**
   * Intanciate PackageManager Object
   *
   * @param {Object} options       - Initial configuration options
   *
   */
  constructor( options = {} ){
    super( options )

    this.manager = options.manager || 'cpm' // Yarn as default node package manager (npm): (Install in packages)
    this.cwd = options.cwd
    this.cpr = options.cpr
    this.authToken = options.authToken
    this.debugMode = options.debug

    // Mute watcher function by default
    this.watcher = typeof options.watcher == 'function' ? options.watcher : function(){}
    // Script runner options
    this.rsOptions = { cwd: this.cwd, stdio: 'pipe', shell: true }
  }

  /**
   * Generate initial `package.json` and `.metadata`
   *  requirement files at project root.
   *
   * @param {Object} configs    - Custom configurations
   *
   */
  async init( configs ){
    // Default is CPM config file.
    let filepath = `${this.cwd }/.metadata`

    // Generate 3rd party CLI package managers (npm, yarn) package.json
    if( ['npm', 'yarn'].includes( this.manager ) )
      filepath = `${this.cwd }/package.json`

    // Check & Fetch existing .metadata or package.json content
    try {
      const existing = await fs.readJson( filepath )

      /**
       * Merge new information with exising
       *  .metadata or package.json content.
       */
      if( typeof existing == 'object' )
        configs = { ...existing, ...configs }
    }
    catch( error ) { console.log('Init Error: ', error ) }

    // Generate a new package.json file
    await fs.outputJSON( filepath, configs, { spaces: '\t' } )
  }

  /**
   * `npm` or `yarn` CLI command runner
   *
   * @param {String} verb       - Package managemet action: install, remove, update, ...
   * @param {String} packages   - Space separated list of NodeJS packages/libraries
   * @param {String} params     - Check `npm` or `yarn` command parameters documentation
   * @param {String} progress   - Process tracking report function. (optional) Default to `this.watcher`
   *
   */
  shell( verb, packages, params, progress ){
    return new Promise( ( resolve, reject ) => {
      // Specified packages to uninstall
      packages = Array.isArray( packages ) ? packages.join(' ') : packages || ''

      rs(`${this.manager} ${verb} ${packages} ${params}`, this.rsOptions, progress )
        .then( resolve )
        .catch( reject )
    } )
  }

  /**
   * Install dependency package requirements listed
   *  in `.metadata` or `package.json` files
   *
   * Use `npm` or `yarn` for NodeJS packages & `cpm`
   * for Cubic Package
   *
   * @param {String} params       - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress   - Process tracking report function. (optional) Default to `this.watcher`
   *
   */
  async installDependencies( params = '', progress ){

    if( typeof params == 'function' ) {
      progress = params
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) )
      return await this.shell( 'install', null, params, progress )

  }

  /**
   * Install one or a list of packages
   *
   * Use `npm` or `yarn` for NodeJS packages & `cpm`
   * for Cubic Package
   *
   * @param {String} packages     - Space separated list of package references
   *                                Eg. `application:namespace.name~version plugin:...`
   * @param {String} params       - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress   - Process tracking report function. (optional) Default to `this.watcher`
   *
   */
  async install( packages, params = '', progress ){

    if( typeof params == 'function' ) {
      progress = params
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) ) {
      let verb
      switch( this.manager ) {
        case 'npm': verb = 'install'; break
        case 'yarn': // Yarn is use by default
        default: verb = 'add'
      }

      return await this.shell( verb, packages, params, progress )
    }

    // Check whether a package repository is defined
    if( !this.cpr )
      throw new Error('Undefined Cubic Package Repository')

    const
    _this = this,
    plist = packages.split(/\s+/),
    fetchPackage = ( { type, namespace, name }, { metadata, dtoken, etoken }, isDep ) => {
      return new Promise( ( resolve, reject ) => {
        /**
         * Define installation directory
         *
         * NOTE: Packages are extracted
         *   - Directly into `cwd` by namespace folder (Main package)
         *   - Or into respective dependency type folders (Dependency package: by `isDep` flag)
         */
        const
        directory = `${_this.cwd}/${isDep ? `.${type}/` : ''}${namespace}/${name}~${metadata.version}`,
        downloadAndUnpack = async () => {
          progress( false, null, `Installation directory: ${directory}`)

          await fs.ensureDir( directory )
          return await this.unpack(`${_this.cpr}/package/fetch?dtoken=${dtoken}`, directory, etoken, progress )
        }

        /**
         * Do not override existing installation directory
         * unless --force flag is set in params
         */
        if( params.includes('--force') )
          return downloadAndUnpack().then( resolve ).catch( reject )

        // Check directory and append package files
        fs
        .pathExists( directory )
        .then( yes => {
          if( yes ) {
            progress( false, null, `Package is already installed. ${directory}\n\tUse --force option to override existing installation.`)
            resolve()
          }
          else downloadAndUnpack().then( resolve ).catch( reject )
        } )
        .catch( reject )
      } )
    },
    installDependencies = async metadata => {
      // Check and load an application/plugin dependencies
      const
      depRegex = /^(plugin|library):(.+)$/,
      deps = metadata.resource
              && metadata.resource.dependencies
              && metadata.resource.dependencies.length
              && metadata.resource.dependencies.filter( each => { return depRegex.test( each ) } )

      if( !Array.isArray( deps ) || !deps.length ) return metadata

      for( const x in deps ) {
        const [ _, depType ] = deps[x].match( depRegex ) || []

        const response = await eachPackage( deps[x], depType )
        if( !response ) throw new Error(`<${deps[x]}> not found`)

        const category = depType === 'plugin' ? 'plugins' : 'libraries' // Plugins or libraries

        if( !metadata[ category ] ) metadata[ category ] = {}
        metadata[ category ][ response.metadata.nsi ] = response.metadata
      }

      return metadata
    },
    eachPackage = async ( pkg, isDep = false ) => {
      const refs = parsePackageReference( pkg )
      if( !refs )
        throw new Error(`Invalid <${pkg}> package reference`)

      progress( false, null, `Resolving ${pkg}`)
      const response = await prequest.get({ url: `${_this.cpr}/resolve/${pkg}`, json: true })
      if( response.error ) throw new Error( response.message )

      // Fetch packages
      params.includes('-f')
      && await fetchPackage( refs, response, isDep )

      /**
       * Install all required dependencies (plugin/library)
       *
       * NOTE: Regular mode only. Plugin are directly added to
       *       `.metadata` file in sandbox mode.
       */
      response.metadata = await installDependencies( response.metadata )

      // Install next package if there is. Otherwise resolve
      return plist.length ? await eachPackage( plist.shift() ) : response
    }

    return await eachPackage( plist.shift(), params.includes('-d') )
  }

  /**
   * Remove/Uninstall one or a list of packages
   *
   * Use `npm` or `yarn` for NodeJS packages & `cpm`
   * for Cubic Package
   *
   * @param {String} packages     - Space separated list of package references
   *                                Eg. `application:namespace.name~version plugin:...`
   * @param {String} params       - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress   - Process tracking report function. (optional) Default to `this.watcher`
   */
  async remove( packages, params = '', progress ){

    if( !packages )
      throw new Error('Undefined package to uninstall')

    if( typeof params == 'function' ) {
      progress = params
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) ) {
      let verb
      switch( this.manager ) {
        case 'npm': verb = 'uninstall'; break
        case 'yarn': // Yarn is use by default
        default: verb = 'remove'
      }

      return await this.shell( verb, packages, params, progress )
    }

    // Remove package installed with cpm
    const
    _this = this,
    plist = packages.split(/\s+/),
    eachPackage = async pkg => {
      const refs = parsePackageReference( pkg )
      if( !refs ) throw new Error(`Invalid <${pkg}> package reference`)

      const
      { type, namespace, name, version } = refs,
      nspDir = `${_this.cwd}/${type}s/${namespace}`

      // Check whether installation namespace exists
      if( !await fs.pathExists( nspDir ) )
        throw new Error(`No installation of <${pkg}> found`)

      /**
       * Clear all different installed versions of this
       * package, if no version specified
       */
      if( !version ) {
        const dir = await fs.readdir( nspDir )
        await Promise.all( dir.map( dirname => {
          if( dirname.includes( name ) )
            return fs.remove(`${nspDir}/${dirname}`)
        } ) )
      }
      // Clear only specified version directory
      else await fs.remove(`${nspDir}/${name}~${version}`)

      // Install next package if there is. Otherwise resolve
      return plist.length ? await eachPackage( plist.shift() ) : `<${packages.replace(/\s+/, ', ')}> removed`
    }

    return await eachPackage( plist.shift() )
  }

  /**
   * Update one or a list of packages
   *
   * Use `npm` or `yarn` for NodeJS packages & `cpm`
   * for Cubic Package
   *
   * @param {String} packages     - Space separated list of package references
   *                                Eg. `application:namespace.name~version plugin:...`
   * @param {String} params       - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress   - Process tracking report function. (optional) Default to `this.watcher`
   *
   */
  async update( packages, params = '', progress ){

    if( !packages )
      throw new Error('Undefined package to uninstall')

    if( typeof params == 'function' ) {
      progress = params
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) ) {
      let verb
      switch( this.manager ) {
        case 'npm': verb = 'update'; break
        case 'yarn': // Yarn is use by default
        default: verb = 'upgrade'
                  params += ' --latest'
      }

      return await this.shell( verb, packages, params, progress )
    }

    // Update: Reinstall packages to their latest versions
    packages = packages.split(/\s+/).map( each => { return each.replace(/~(([0-9]\.?){2,3})/, '') }).join(' ')

    return await this.install( packages, params, progress )
  }

  /**
   * Publish current working directory as package
   *
   * @param {Function} progress   - Process tracking report function. (optional) Default to `this.watcher`
   *
   */
  async publish( progress ){
    // Check whether a package repository is defined
    if( !this.cpr )
      throw new Error('Undefined Cubic Package Repository')

    // TODO: Preliminary checks of packagable configurations


    progress = progress || this.watcher

    let metadata
    try {
      progress( false, null, 'Checking metadata in .metadata')
      metadata = await fs.readJson(`${this.cwd }/.metadata`)
    }
    catch( error ) {
      const explicitError = new Error('Undefined Metadata. Expected .metadata file in project root')

      progress( explicitError )
      throw explicitError
    }

    if( !isValidMetadata( metadata ) )
      throw new Error('Invalid Metadata. Check documentation')

    /**
     * Create .tmp folder in project parent directory
     * to temporary hold generated package files
     */
    const tmpPath = `${path.dirname( this.cwd )}/.tmp`
    progress( false, null, `Creating .tmp directory at ${tmpPath}`)

    try { await fs.ensureDir( tmpPath ) }
    catch( error ) {
      progress( error )
      throw new Error('Installation failed. Check progress logs for more details')
    }

    const
    _this = this,
    filepath = `${tmpPath}/${metadata.nsi}.cup`, // (.cup) Cubic Universal Package
    uploadPackage = () => {
      return new Promise( ( resolve, reject ) => {
        const options = {
          url: `${_this.cpr}/publish`,
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/octet-stream',
            'X-User-Agent': 'CPM/1.0'
          },
          formData: {
            metadata: JSON.stringify( metadata ),
            pkg: fs.createReadStream( filepath ),
            deploy: 'after-check'
          },
          json: true
        }

        request.post( options, ( error, response, body ) => {
          if( error || ( body && body.error ) )
            return reject( error || body.message )

          fs.remove( tmpPath ) // Delete .tmp directory
          resolve( body )
        })
      })
    }

    const
    // Generate .cup (Cubic Universal Package) package
    { prepackSize, etoken } = await this.pack( this.cwd, filepath, progress ),
    // Add package stages sizes to metadata
    fileStat = await fs.stat( filepath )

    // Attach .cup encryption token
    metadata.etoken = etoken
    metadata.sizes = {
      download: fileStat.size,
      installation: prepackSize
    }

    progress( false, null, 'Publishing package ...')
    // Upload package to the given CPR (Cubic Package Repositories)
    return await uploadPackage()
  }
}