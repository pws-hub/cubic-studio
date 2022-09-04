
import path from 'path'
import zlib from 'zlib'
import tar from 'tar-fs'
import fs from 'fs-inter'
import request from 'request'
import prequest from 'request-promise'
import rs from '../lib/RunScript'

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

  constructor( options = {} ){
    this.manager = options.manager || 'cpm' // Yarn as default node package manager (npm): (Install in packages)
    this.cwd = options.cwd
    this.cpr = options.cpr
    this.debugMode = options.debug
    this.watcher = options.watcher || function(){}

    // Script runner options
    this.rsOptions = { cwd: this.cwd, stdio: 'pipe', shell: true }
  }

  async init( configs ){
    // Default is CPM config file.
    let filepath = this.cwd +'/config.json'

    // Generate 3rd party CLI package managers (npm, yarn) package.json
    if( ['npm', 'yarn'].includes( this.manager ) )
      filepath = this.cwd +'/package.json'
      
    // Check & Fetch existing config.json/package.json content
    try {
      const existing = await fs.readJson( filepath )
      
      /** Merge new information with exising
       *  config.json/package.json content.
       */
      if( typeof existing == 'object' )
        configs = { ...existing, ...configs }
    }
    catch( error ){}

    // Generate a new package.json file
    await fs.outputJSON( filepath, configs, { spaces: '\t' } )
  }

  CLIManager( verb, packages, params, progress ){
    return new Promise( ( resolve, reject ) => {
      // Specified packages to uninstall
      packages = Array.isArray( packages ) ? packages.join(' ') : packages || ''

      rs(`${this.manager} ${verb} ${packages} ${params}`, this.rsOptions, progress )
        .then( resolve )
        .catch( reject )
    } )
  }

  async installPackages( params = '', progress ){
  
    if( typeof params == 'function' ){
      progress = params,
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) )
      return await this.CLIManager( 'install', null, params, progress )
    
  }

  async install( packages, params = '', progress ){
  
    if( typeof params == 'function' ){
      progress = params,
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) ){
      let verb
      switch( this.manager ){
        case 'npm': verb = 'install'; break
        case 'yarn': // Yarn is use by default
        default: verb = 'add' 
      }
    
      return await this.CLIManager( verb, packages, params, progress )
    }

    // Check whether a package repository is defined
    if( !this.cpr )
      throw new Error('Undefined Cubic Package Repository')
    
    const 
    _this = this,
    plist = packages.split(/\s+/),
    downloadPackage = ({ type, namespace, name }, { metadata, dtoken } ) => {
      return new Promise( ( resolve, reject ) => {
        // Create directory if doesn't exist
        const directory = `${_this.cwd}/${type}s/${namespace}/${name}~${metadata.version}`
        progress( false, null, `Installation directory: ${directory}`)
        fs.ensureDir( directory )

        // .gz format unzipping stream
        const unzipStream = zlib.createGunzip()
        let unzipSize = 0

        unzipStream
        .on('data', chunk => {
          unzipSize += chunk.length
          progress( false, unzipSize, `Unpacking ...`)
        })
        .on( 'error', reject )

        // .tar format extracting stream
        const unpackStream = tar.extract( directory ).on( 'error', reject )

        request
        .get({ url: `${_this.cpr}/package/download?dtoken=${dtoken}`, json: true }, 
            async ( error, response, body ) => {
              if( error || body.error ) 
                return reject( error || body.message )

              progress( false, null, `Completed`)
              resolve()
            })
        .pipe( unzipStream ) // Unzip package archive
        .pipe( unpackStream ) // Extract/Unpack package content
      } )
    },
    eachPackage = async pkg => {
      const refs = parsePackageReference( pkg )
      if( !refs ) 
        throw new Error(`Invalid <${pkg}> package reference`)
      
      progress( false, null, `Resolving ${pkg}`)
      const response = await prequest.get({ url: `${_this.cpr}/install/${pkg}`, json: true })
      if( response.error ) throw new Error( response.message )

      // Download packages
      params.includes('-d')
      && await downloadPackage( refs, response )

      // Install next package if there is. Otherwise resolve
      return plist.length ? await eachPackage( plist.shift() ) : response
    }

    return await eachPackage( plist.shift() )
  }

  async remove( packages, params = '', progress ){

    if( !packages )
      throw new Error('Undefined package to uninstall')

    if( typeof params == 'function' ){
      progress = params,
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) ){
      let verb
      switch( this.manager ){
        case 'npm': verb = 'uninstall'; break
        case 'yarn': // Yarn is use by default
        default: verb = 'remove'
      }
    
      return await this.CLIManager( verb, packages, params, progress )
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

      /** Clear all different installed versions of this 
       * package, if no version specified 
       */
      if( !version ){
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

  async update( packages, params = '', progress ){

    if( !packages )
      throw new Error('Undefined package to uninstall')

    if( typeof params == 'function' ){
      progress = params,
      params = ''
    }

    progress = progress || this.watcher

    // Handle by 3rd party CLI package managers like: npm
    if( ['npm', 'yarn'].includes( this.manager ) ){
      let verb
      switch( this.manager ){
        case 'npm': verb = 'update'; break
        case 'yarn': // Yarn is use by default
        default: verb = 'upgrade'
                  params += ' --latest'
      }

      return await this.CLIManager( verb, packages, params, progress )
    }
    
    // Update: Reinstall packages to their latest versions
    packages = packages.split(/\s+/).map( each => { return each.replace(/~(([0-9]\.?){2,3})/, '') }).join(' ')

    return await this.install( packages, params, progress )
  }

  async publish( progress ){
    // Check whether a package repository is defined
    if( !this.cpr )
      throw new Error('Undefined Cubic Package Repository')
    
    // TODO: Preliminary checks of packagable configurations


    progress = progress || this.watcher

    let metadata
    try {
      progress( false, null, 'Checking metadata in config.json')
      metadata = await fs.readJson( this.cwd +'/config.json' ) 
    }
    catch( error ){
      console.error( error )
      const explicitError = new Error('Undefined Metadata. Expected config.json file in project root')

      progress( explicitError )
      throw explicitError
    }

    if( !isValidMetadata( metadata ) )
      throw new Error('Invalid Metadata. Check documentation')
    
    /** Create .tmp folder in project parent directory 
     * to temporary hold generated package files 
     */
    const tmpPath = path.dirname( this.cwd ) +'/.tmp'
    progress( false, null, `Creating .tmp directory at ${tmpPath}`)

    try { await fs.ensureDir( tmpPath ) }
    catch( error ){
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
        IGNORE_DIRECTORIES = ['.git', '.DS_Store', 'node_modules', 'build', 'dist', 'cache', 'plugins', 'applications', 'lib'],
        IGNORE_FILES = ['.gitignore'],
        options = {
          ignore: pathname => {
            // ignore some folders when packing
            return IGNORE_DIRECTORIES.includes( path.basename( pathname ) )
                    || IGNORE_FILES.includes( path.extname( pathname ) )
          },
          // readable: true, // all dirs and files should be readable
          // writable: true // all dirs and files should be writable
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