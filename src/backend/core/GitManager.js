
import Rimraf from 'rimraf'
import Git from 'simple-git'
import Path from '@cubic-bubble/path'

export default class GitManager {
  /**
   * @params {Object} options
   *    - cwd
   *    - auth {username, token}
   *    - repository
   *    - debugMode
   */
  constructor( options = {} ){

    const { cwd, auth, repository } = options

    this.cwd = cwd // Project's current working directory
    this.repository = repository

    // Define repository URL
    if( repository ) {
      this.remote = repository

      if( typeof auth == 'object'
          && auth.username
          && ( auth.password || auth.token) ) {
        const { username, password, token } = auth
        this.remote = `https://${username}:${token || password}@${repository.replace(/http(s?):\/\//, '')}`
      }
    }

    this.git = Git({
      baseDir: cwd || this.cwd, // Process.cwd()
      binary: 'git',
      maxConcurrentProcesses: 6,
      // trimmed: false
    })
  }

  // Update current working directory
  setCWD( cwd ){ this.git.cwd( cwd || this.cwd || process.cwd() ) }

  async initProject( remote, force, progress ){
    if( !this.git )
      throw new Error('Git is not initialized')

    const
    isRepository = await this.git.checkIsRepo('root'),
    sync = async () => {

      // TODO: Check & pull if remote exists


      return await this.git.add('./*')
                            .commit('Initial commit!')
                            .addRemote( 'origin', remote || this.remote )

                            /*
                             * Fetch only when remote already exists
                             * .fetch()
                             */
                            .push([ '--set-upstream', 'origin', 'master'])
    }

    if( isRepository ) {
      if( !force )
        throw new Error('Directory is a git repository')

      // Force init on .git initialize repo: Just replace current remote origin
      await this.git.removeRemote('origin')
      await sync()

      return
    }

    await this.git.init()
    await sync()
  }

  async cloneProject( repository, path, clear ){
    // Clone Git repository to local
    await this.git.clone( repository || this.repository, path )
    // Completely uninitialize (remove) .git after project cloned
    clear && this.clear( path )
  }

  clear( path ){
    // Remove git completely from a directory
    return new Promise( resolve => Rimraf( Path.resolve( this.cwd, `${path || ''}/.git` ), resolve ) )
  }
}