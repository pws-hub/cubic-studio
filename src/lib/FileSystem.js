
import Path from 'path'
import Fs from 'fs-extra'
import Chokidar from 'chokidar'

export default class FileSystem {

  constructor( options = {} ){
    this.watcher = null
    this.cwd = options.cwd
    this.debugMode = options.debug
  }

  // Internal operation log: Debug mode
  debug( ...args ){ this.debugMode && console.log( ...args ) }

  // Resolve path to Current Working Directory or Absolute path
  resolve( path ){ return this.cwd ? Path.resolve( this.cwd, path ) : path }

  // Get content tree of a directory and its sub-directories
  async directory( path, options, depth = false ){
    path = path || ( !depth ? this.cwd : '' )
    
    const 
    { ignore, subdir, dirsOnly } = options || {},
    dir = await Fs.readdir( path ),
    content = []

    await Promise.all( dir.map( name => {
      const 
      contentPath = path +'/'+ name,
      ignoreRegex = ignore && new RegExp( ignore )
      
      // Ignore file/directory regular expression
      if( ignoreRegex && ( ignoreRegex.test( name ) || ignoreRegex.test( contentPath ) ) ) 
        return

      return Fs.stat( contentPath )
                .then( async stat => {
                  const { size } = stat
                  stat.isDirectory() ?
                        // Record sub-directory
                        content.push({
                          isDir: true,
                          name,
                          size,
                          path: contentPath,
                          // Deep also into sub-directory
                          content: subdir ? await this.directory( contentPath, options, true ) : false
                        })
                        // Record file or ignore in case directories only required
                        : !dirsOnly ? content.push({ name, path: contentPath, size }) : null
                })
    }) )

    return {
      name: Path.basename( path ),
      path, 
      content
    }
  }

  // Check whether file or directory exist or not
  async exists( path ){
    return await Fs.pathExists( path ? this.resolve( path ) : this.cwd )
  }

  // Create new directory
  async newDir( path, options = {} ){
    await Fs.ensureDir( this.resolve( path ), options )
  }

  // Create new file
  async newFile( path, content ){
    path = this.resolve( path )

    await Fs.ensureFile( path ) // Ensure the file exist: Create directories if does not exist
    await Fs.writeFile( path, content || '' )
  }

  // Rename file or directory
  async rename( path, newname ){
    path = this.resolve( path )

    await Fs.rename( path, Path.dirname( path ) +'/'+ newname )
  }

  // Remove file or directory
  async remove( args ){
    const fn = async path => {

      path = this.resolve( path )
      await Fs.remove( path )
    
      // Automatically unwatch new directory
      this.watcher
      && await this.watcher.unwatch( path )
    }
    
    Array.isArray( args ) ? args.map( fn ) : await fn( args )
  }

  // Move file or directory
  async move( source, destination ){
    await Fs.move( this.resolve( source ), this.resolve( destination ) )
  }

  // Copy file or directory to a given destination
  async copy( source, destination ){
    const options = {
      overwrite: false,
      errorOnExist: true,
      filter: ( src, dest ) => {
        // TODO: Check Git information

        return true // Allow to copy
      }
    }

    source = this.resolve( source )
    destination = this.resolve( destination )
    
    // source is a directory
    if( await ( await Fs.stat( source ) ).isDirectory() ){
      const readDest = Path.join( destination, Path.basename( source ) )

      await Fs.emptyDir( readDest )
      await Fs.copy( source, readDest, options )
    }
    // source is file by destination is directory
    else if( await ( await Fs.stat( destination ) ).isDirectory() ){
      const filename = Path.basename( source )

      destination = Path.join( destination, filename )
      await Fs.copy( source, destination, options )
    }
    // both source and destination paths are files
    else await Fs.copy( source, destination, options )
  }

  // Watch recursively changes that occured on files, directories 
  watch( options, listener ){

    if( typeof options == 'function' ){
      listener = options
      options = {}
    }
    
    const 
    { path, paths, ignore } = options || {},
    wpath = path || paths || this.cwd || 'file, dir, glob, or array'
    
    this.watcher = Chokidar.watch( wpath, {
                                            ignored: ignore || false, //   /(^|[\/\\])\../, // ignore dotfiles
                                            persistent: true,
                                            alwaysStat: true,
                                            awaitWriteFinish: {
                                              stabilityThreshold: 2000,
                                              pollInterval: 100
                                            }
                                          } )

    // Debug mode
    if( this.debugMode )
      this.watcher
      .on( 'add', ( path, stat ) => this.debug(`File ${path} has been added: [size = ${stat && stat.size}]`))
      .on( 'addDir', ( path, stat ) => this.debug(`Directory ${path} has been added: [size = ${stat && stat.size}]`))
      .on( 'change', ( path, stat ) => this.debug(`File ${path} has been changed: [size = ${stat && stat.size}]`))
      .on( 'unlink', path => this.debug(`File ${path} has been removed`))
      .on( 'unlinkDir', path => this.debug(`Directory ${path} has been removed`))
      .on( 'error', error => this.debug(`Watcher error: ${error}`))
      .on( 'ready', () => this.debug('Initial scan complete. Ready for changes') )
      // .on( 'raw', ( event, path, details ) => this.debug( event, path, details ) )

    // External event listener
    typeof listener == 'function' 
    && this.watcher.on( 'all', listener )
    
    /** 
     * .getWatched() Return the list of paths being watched on the filesystem
     * .unwatch() {async} Unwatch a given directory
     * .close() Stop watcher
     */
    return this.watcher
  }
}