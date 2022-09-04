
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
    downloadPackage = ( dtoken, directory ) => {
      return new Promise( ( resolve, reject ) => {
        // Create directory if doesn't exist
        fs.ensureDir( directory )

        // .gz format unzipping stream
        const unzipStream = zlib.createGunzip()
        unzipStream.on( 'error', reject )

        // .tar format extracting stream
        const extractStream = tar.extract( directory )
        extractStream.on( 'error', reject )

        request
        .get({ url: `${_this.cpr}/package/download?dtoken=${dtoken}`, json: true }, 
            async ( error, response, body ) => {
              if( error || body.error ) 
                return reject( error || body.message )

              resolve()
            })
        .pipe( unzipStream ) // Unzip package archive
        .pipe( extractStream ) // Extract package content
      } )
    },
    eachPackage = async pkg => {
      const 
      { type, namespace, name, version } = parsePackageReference( pkg ),
      directory = `${_this.cwd}/${type}s/${namespace}${version ? '~'+ version : ''}`
      
      const response = await prequest.get({ url: `${_this.cpr}/install/${pkg}`, json: true })
      if( response.error ) throw new Error( response.message )

      // Download packages
      params.includes('-d')
      && await downloadPackage( response.dtoken, directory )

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
      
  }

  async publish(){
    // Check whether a package repository is defined
    if( !this.cpr )
      throw new Error('Undefined Cubic Package Repository')
    
    // TODO: Preliminary checks of packagable configurations



    let metadata
    try { metadata = await fs.readJson( this.cwd +'/config.json' ) }
    catch( error ){
      console.error( error )
      throw new Error('Undefined Metadata. Expected config.json file in project root') 
    }

    if( !isValidMetadata( metadata ) )
      throw new Error('Invalid Metadata. Check documentation')
    
    /** Create .tmp folder in project parent directory 
     * to temporary hold generated package files 
     */
    const tmpPath = path.dirname( this.cwd ) +'/.tmp'
    await fs.ensureDir( tmpPath )

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
        IGNORE_DIRECTORIES = ['.git', '.DS_Store', 'node_modules', 'build', 'dist', 'cache', 'plugins', 'lib'],
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
        
        tar.pack( _this.cwd, options )
            .pipe( zlib.createGzip() )
            .pipe( writeStream )
      } )
    }
    
    // Generate .cup (Cubic Universal Package) files
    await generateCUP()

    // Add package stages sizes to metadata
    const fileStat = await fs.stat( filepath )
    metadata.sizes = {
      download: fileStat.size,
      installation: fileStat.blksize
    }

    // Upload package to the given CPR (Cubic Package Repositories)
    return await uploadPackage()
  }
}