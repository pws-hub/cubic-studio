
import Path from 'path'
import Git from 'simple-git'

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

      if( typeof auth == 'object' && auth.username && auth.password ){
        const { username, password, token } = auth
        this.remote = `https://${username}:${token || password}@${repository.replace(/http(s?):\/\//, '')}`
      }
    }
    
    this.git = Git({
      baseDir: this.cwd, // process.cwd(),
      binary: 'git',
      maxConcurrentProcesses: 6
    })
  }

  async initProject( force ){
    const 
    isRepository = await this.git.checkIsRepo('root'),
    sync = async () => {
      return await this.git.add('./*')
                            .commit('Initial commit!')
                            .addRemote( 'origin', this.remote )
                            .push('origin', 'master')
    }

    if( isRepository ){
      if( !force )
        throw new Error('Directory is a git repository')

      // Force init on .git initialize repo: Just replace current remote origin
      await this.git.removeRemote('origin')
      await sync()
    }

    await this.git.init()
    await sync()
  }

  async cloneProject( repository, path ){
    await this.git.clone( repository || this.repository, path )
  }

}