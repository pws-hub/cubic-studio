
import path from 'path'
import zlib from 'zlib'
import tar from 'tar-fs'
import fs from 'fs-inter'
import request from 'request'
import prequest from 'request-promise'
import rs from '../lib/RunScript'

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
  return true
}

export default class PackageManager {
  
  /**
   * Intanciate PackageManager Object
   *
   * @param {Object} options       - Initial configuration options
   *
   */
  constructor( options = {} ){
    this.manager = options.manager || 'cpm' // Yarn as default node package manager (npm): (Install in packages)
    this.cwd = options.cwd
    this.cpr = options.cpr
    this.debugMode = options.debug
    this.watcher = options.watcher || function(){}

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
    catch( error ) {}

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
  throughCLI( verb, packages, params, progress ){
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
   * @param {String} params    - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress  Process tracking report function. (optional) Default to `this.watcher`
   * 
   */
  async installDependencies( params = '', progress ){

    if( typeof params == 'function' ) {
      progress = params,
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) )
      return await this.throughCLI( 'install', null, params, progress )

  }

  /**
   * Install one or a list of packages
   *
   * Use `npm` or `yarn` for NodeJS packages & `cpm`
   * for Cubic Package
   *
   * @param {String} packages  - Space separated list of package references
   *                            Eg. `application:namespace.name~version plugin:...`
   * @param {String} params    - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress  Process tracking report function. (optional) Default to `this.watcher`
   * 
   */
  async install( packages, params = '', progress ){

    if( typeof params == 'function' ) {
      progress = params,
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

      return await this.throughCLI( verb, packages, params, progress )
    }

    // Check whether a package repository is defined
    if( !this.cpr )
      throw new Error('Undefined Cubic Package Repository')

    const
    _this = this,
    plist = packages.split(/\s+/),
    fetchPackage = ( { type, namespace, name }, { metadata, dtoken }, isDep ) => {
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
        proceed = () => {
          // .gz format unzipping stream
          const unzipStream = zlib.createGunzip()
          let unzipSize = 0

          unzipStream
          .on('data', chunk => {
            unzipSize += chunk.length
            progress( false, unzipSize, 'Unpacking ...')
          })
          .on('error', reject )

          // .tar format extracting stream
          const unpackStream = tar.extract( directory ).on( 'error', reject )

          request
          .get({ url: `${_this.cpr}/package/fetch?dtoken=${dtoken}`, json: true },
                async ( error, response, body ) => {
                  if( error || body.error )
                    return reject( error || body.message )

                  progress( false, null, 'Completed')
                  resolve()
                })
          .pipe( unzipStream ) // Unzip package archive
          .pipe( unpackStream ) // Extract/Unpack package content
        },
        ensureDirectory = async () => {
          try {
            await fs.ensureDir( directory )
            proceed()
          }
          catch( error ) { reject( error ) }
        }

        progress( false, null, `Installation directory: ${directory}`)
        /**
         * Do not override existing installation directory
         * unless --force flag is set in params
         */
        params.includes('--force') ?
                          ensureDirectory()
                          : fs.pathExists( directory )
                              .then( yes => yes ? resolve() : ensureDirectory() )
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
      const response = await prequest.get({ url: `${_this.cpr}/install/${pkg}`, json: true })
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
   * @param {String} packages  - Space separated list of package references
   *                            Eg. `application:namespace.name~version plugin:...`
   * @param {String} params    - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress  Process tracking report function. (optional) Default to `this.watcher`
   */
  async remove( packages, params = '', progress ){

    if( !packages )
      throw new Error('Undefined package to uninstall')

    if( typeof params == 'function' ) {
      progress = params,
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

      return await this.throughCLI( verb, packages, params, progress )
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
   * @param {String} packages  - Space separated list of package references
   *                            Eg. `application:namespace.name~version plugin:...`
   * @param {String} params    - Custom process options
   *                                [-f]      Full installation process (Retrieve metadata & fetch package files)
   *                                [-d]      Is dependency package installation
   *                                [-v]      Verbose logs
   *                                [--force] Override directory of existing installations of same packages
   * @param {Function} progress  Process tracking report function. (optional) Default to `this.watcher`
   *
   */
  async update( packages, params = '', progress ){

    if( !packages )
      throw new Error('Undefined package to uninstall')

    if( typeof params == 'function' ) {
      progress = params,
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

      return await this.throughCLI( verb, packages, params, progress )
    }

    // Update: Reinstall packages to their latest versions
    packages = packages.split(/\s+/).map( each => { return each.replace(/~(([0-9]\.?){2,3})/, '') }).join(' ')

    return await this.install( packages, params, progress )
  }

  /**
   * Publish current working directory as package
   *
   * @param {Function} progress  Process tracking report function. (optional) Default to `this.watcher`
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
      metadata = await fs.readJson( `${this.cwd }/.metadata` )
    }
    catch( error ) {
      console.error( error )
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
    const tmpPath = `${path.dirname( this.cwd ) }/.tmp`
    progress( false, null, `Creating .tmp directory at ${tmpPath}`)

    try { await fs.ensureDir( tmpPath ) }
    catch( error ) {
      progress( error )
      throw new Error('Installation failed. Check progress logs for more details')
    }

    // Prepack Generate CUP & Upload to repositories
    const
    _this = this,
    filepath = `${tmpPath}/${metadata.name}.cup`, // (.cup) Cubic Universal Package
    uploadPackage = () => {
      return new Promise( ( resolve, reject ) => {
        const options = {
          url: `${_this.cpr}/publish`,
          headers: { 'Content-Type': 'application/cup' },
          formData: {
            metadata: JSON.stringify( metadata ),
            pkg: fs.createReadStream( filepath )
          },
          json: true
        }

        request.post( options, ( error, response, body ) => {
          if( error || body.error )
            return reject( error || body.message )

          fs.remove( tmpPath ) // Delete .tmp directory
          resolve( body )
        })
      })
    },
    generateCUP = () => {
      return new Promise( ( resolve, reject ) => {
        // Upload file once package file generated
        const writeStream = fs.createWriteStream( filepath )

        writeStream
        .on('finish', resolve )
        .on('error', reject )

        // Generate package files
        const
        IGNORE_DIRECTORIES = ['node_modules', 'build', 'dist', 'cache', '.git', '.DS_Store', '.plugin', '.application', '.lib'],
        IGNORE_FILES = ['.gitignore'],
        options = {
          ignore: pathname => {
            // Ignore some folders when packing
            return IGNORE_DIRECTORIES.includes( path.basename( pathname ) )
                    || IGNORE_FILES.includes( path.extname( pathname ) )
          },
          /*
           * Readable: true, // all dirs and files should be readable
           * writable: true // all dirs and files should be writable
           */
        }

        const prepackStream = tar.pack( _this.cwd, options )

        prepackStream
        .on('data', chunk => {
          prepackSize += chunk.length
          progress( false, prepackSize, 'Prepacking ...' )
        } )
        .on('error', reject )

        const zipStream = zlib.createGzip().on('error', reject )

        prepackStream
        .pipe( zipStream )
        .pipe( writeStream )
      } )
    }

    // Generate .cup (Cubic Universal Package) files
    progress( false, null, 'Prepacking & Generating the CUP file')
    let prepackSize = 0
    await generateCUP()

    // Add package stages sizes to metadata
    const fileStat = await fs.stat( filepath )
    metadata.sizes = {
      download: fileStat.size,
      installation: prepackSize
    }

    progress( false, null, 'Publishing package ...')
    // Upload package to the given CPR (Cubic Package Repositories)
    return await uploadPackage()
  }
}