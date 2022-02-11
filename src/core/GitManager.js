
import Path from 'path'
import Git from 'simple-git'
import rs from '../lib/RunScript'

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
    if( repository ){
      this.remote = repository

      if( typeof auth == 'object' 
          && auth.username 
          && ( auth.password || auth.token) ){
        const { username, password, token } = auth
        this.remote = `https://${username}:${token || password}@${repository.replace(/http(s?):\/\//, '')}`
      }
    }
    
    this.git = Git({
      baseDir: cwd || this.cwd, // process.cwd()
      binary: 'git',
      maxConcurrentProcesses: 6
    })
  }

  // Update current working directory
  cwd( cwd ){ this.git.cwd({ cwd, root: false }) }

  async initProject( remote, force ){

    if( !this.git )
      throw new Error('Git is not initialized')

    const 
    isRepository = await this.git.checkIsRepo('root'),
    sync = async () => {
      console.log( remote || this.remote )
      return await this.git.add('./*')
                            .commit('Initial commit!')
                            .addRemote( 'origin', remote || this.remote )
                            // .fetch() 
                            .push([ '--set-upstream', 'origin', 'master'])
    }

    if( isRepository ){
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

  async cloneProject( repository, path, clean ){
    // Clone Git repository to local
    await this.git.clone( repository || this.repository, path )
    
    // Completely uninitialize (remove) .git after project cloned
    if( clean ){
      const options = { 
        cwd: Path.resolve( this.cwd, path ), 
        stdio: 'pipe', 
        shell: false 
      }
      
      await rs('rm -rf .git', options )
    }
  }

}