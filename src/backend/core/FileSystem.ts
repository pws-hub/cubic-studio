
import Fs from '@cubic-bubble/fs'
import Path from '@cubic-bubble/path'
import Chokidar from 'chokidar'

export type FSOptions = {
  cwd?: string | null
  debug?: boolean
}
export type FSDirectoryOptions = { 
  ignore?: string
  subdir?: boolean
  dirsOnly?: boolean
}
export type FSDirectoryContent = {
  isDir?: boolean
  name: string
  size: number
  path: string
  // Deep also into sub-directory
  content?: FSDirectoryContent[] | boolean
}
export type FSFileOptions = {
  encoding?: string
}
export type FSWatcher = Chokidar.FSWatcher
export type FSWatcherOptions = { 
  ignore?: string[]
  path?: string
}

export default class FileSystem {
  private cwd: string
  private debugMode: boolean
  // Watcher of occurances on current working directory
  private watcher?: FSWatcher
  private watchingPaths?: string

  constructor( options: FSOptions ){
    this.cwd = options.cwd || '/'
    this.debugMode = options.debug || false
  }

  // Internal operation log: Debug mode
  debug( ...args: any[] ){ this.debugMode && console.log( ...args ) }

  // Resolve path to Current Working Directory or Absolute path
  resolve( path: string ){ return this.cwd ? Path.resolve( this.cwd, path ) : path }

  // Get content tree of a directory and its sub-directories
  async directory( path: string, options: FSDirectoryOptions = {}, depth = false ){
    path = path || ( !depth ? this.cwd : '' )

    const
    { ignore, subdir, dirsOnly } = options || {},
    dir = await Fs.readdir( path ),
    content: FSDirectoryContent[] = []

    await Promise.all( dir.map( ( name: string ) => {
      const
      contentPath = `${path }/${name}`,
      ignoreRegex = ignore && new RegExp( ignore )

      // Ignore file/directory regular expression
      if( ignoreRegex && ( ignoreRegex.test( name ) || ignoreRegex.test( contentPath ) ) )
        return

      return Fs.stat( contentPath )
                .then( async ( stat: any ) => {
                  const { size } = stat
                  stat.isDirectory() ?
                        // Record sub-directory
                        content.push({
                          isDir: true,
                          name,
                          size,
                          path: contentPath,
                          // Deep also into sub-directory
                          content: subdir ? ( await this.directory( contentPath, options, true ) ).content : false
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

  // Read a file content
  async readFile( path: string, options: any = {} ){
    path = this.resolve( path )

    switch( options.encoding ) {
      case 'json': return await Fs.readJson( path )
      // Case 'base64':
      default: return await Fs.readFile( path, { encoding: options.encoding || 'UTF-8' } )
    }
  }

  // Check whether file or directory exist or not
  async exists( path: string ){
    return await Fs.pathExists( path ? this.resolve( path ) : this.cwd )
  }

  // Create new directory
  async newDir( path: string, options = {} ){
    await Fs.ensureDir( this.resolve( path ), options )
  }

  // Create new file
  async newFile( path: string, content: string, options: any = {} ){
    path = this.resolve( path )

    await Fs.ensureFile( path ) // Ensure the file exist: Create directories if does not exist
    /**
     * Define encoding to write all type of file
     * Eg. text as UTF-8 (Default)
     *      media as base64
     *      ...
     */
    await Fs.writeFile( path, content || '', { encoding: options.encoding || 'UTF-8' } )
  }

  // Rename file or directory
  async rename( path: string, newname: string ){
    path = this.resolve( path )

    await Fs.rename( path, `${Path.dirname( path ) }/${ newname}` )
  }

  // Remove file or directory
  async remove( args: string[] | string ){
    const fn = async ( path: string ) => {

      path = this.resolve( path )
      await Fs.remove( path )
    }

    Array.isArray( args ) ? args.map( fn ) : await fn( args )
  }

  // Move file or directory
  async move( source: string, destination: string ){
    await Fs.move( this.resolve( source ), this.resolve( destination ) )
  }

  // Copy file or directory to a given destination
  async copy( source: string, destination: string ){
    const options = {
      overwrite: false,
      errorOnExist: true,
      filter: ( src: string, dest: string ) => {
        // TODO: Check Git information

        return true // Allow to copy
      }
    }

    source = this.resolve( source )
    destination = this.resolve( destination )

    // Source is a directory
    if( await ( await Fs.stat( source ) ).isDirectory() ) {
      const readDest = Path.join( destination, Path.basename( source ) )

      await Fs.emptyDir( readDest )
      await Fs.copy( source, readDest, options )
    }
    // Source is file by destination is directory
    else if( await ( await Fs.stat( destination ) ).isDirectory() ) {
      const filename = Path.basename( source )

      destination = Path.join( destination, filename )
      await Fs.copy( source, destination, options )
    }
    // Both source and destination paths are files
    else await Fs.copy( source, destination, options )
  }

  // Watch recursively changes that occured on files, directories
  watch( options: FSWatcherOptions = {}, listener: ( event: string, path: string, stats: any ) => void ): FSWatcher | undefined {

    if( typeof options == 'function' ) {
      listener = options
      options = {}
    }

    const
    { path, ignore } = options,
    wpath = path || this.cwd // 'file, dir, glob, or array'

    // Already watching define paths
    if( this.watcher
        && ( this.watchingPaths == wpath
              || Object.keys( this.watcher.getWatched() ).includes( wpath ) ) ) return

    this.watcher = Chokidar.watch( wpath, {
                                            ignoreInitial: true, // Do not fire event when discovering paths
                                            ignored: ignore || undefined, //   /(^|[\/\\])\../, // ignore dotfiles
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