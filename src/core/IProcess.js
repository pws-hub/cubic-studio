
import GitManager from './GitManager'
import FileSystem from './FileSystem'
import * as GenericFile from './GenericFile'
import PackageManager from './PackageManager'
import Config from '../../cubic.json'
import Emulator from './Emulator'

export default class IProcess {

  constructor( options = {} ){
    // Debuging mode
    this.debugMode = options.debug
    // Process watcher
    this.watcher = typeof options.watcher === 'function' ? options.watcher : () => {}
    // Active emulators
    this.emulators = {}
  }

  // Internal operation log: Debug mode
  debug( ...args ){ this.debugMode && console.log( ...args ) }

  async setup( dataset ){
    try {
      const 
      { type, name, description, scope } = dataset,
      { language, directory, repository } = scope.IDE,
      
      pm = new PackageManager({ cwd: directory, manager: Config.PACKAGE_MANAGER, debug: this.debugMode }),
      git = new GitManager({ debug: this.debugMode, repository }),
      fs = new FileSystem({ cwd: false, debug: this.debugMode })

      // Project will run in a sandbox
      let inSandbox = false
      
      // Setup code project
      if( scope.IDE ){
        // Create new project directory
        this.watcher( 'setup',
                      false,
                      {
                        percent: 0,
                        processor: 'fs',
                        message: 'Creating project directory' 
                      })
        await fs.newDir( directory )

        /*-------------------------------------------------------------------------*/
        // Clone & add Initial project src & files by extension type from Git
        this.watcher( 'setup',
                      false,
                      {
                        percent: 5,
                        processor: 'git',
                        message: 'Adding initial project source files' 
                      })
        const 
        sampleType = type == 'application' ? 'app' : type,
        plang = language.split('~')[0] // Specified programming language or Framework

        // Append template project to the directory
        await git.cloneProject( `https://github.com/multipple/create-${sampleType}-${plang}.git`, directory, true )

        /** IMPORTANT: Define git's current working directory 
         *              for all next commands cause project
         *              directory is now created
         */
        git.setCWD( directory )

        /*-------------------------------------------------------------------------*/
        // Add generic files: .cubic, config.json, README.md
        this.watcher( 'setup',
                      false,
                      {
                        percent: 26,
                        processor: 'fs',
                        message: 'Creating generic configurations' 
                      })
        const
        dotCubic = await GenericFile.dotCubic( dataset ),
        configJson = await GenericFile.configJson( dataset )

        await fs.newFile( directory +'/.cubic', JSON.stringify( dotCubic, null, '\t' ) )
        await fs.newFile( directory +'/config.json', JSON.stringify( configJson, null, '\t' ) )

        /*-------------------------------------------------------------------------*/
        // Clone sandbox by language from Git
        this.watcher( 'setup',
                      false,
                      {
                        percent: 30,
                        processor: 'git',
                        message: 'Setup development sandbox'
                      })
        await git.cloneProject( `https://github.com/multipple/${plang}-sandbox.git`, directory +'/sandbox' )
        inSandbox = true

        /*-------------------------------------------------------------------------*/
        // Init yarn & package.json + sandbox workspace
        this.watcher( 'setup',
                      false,
                      {
                        percent: 47,
                        processor: 'cpm',
                        message: 'Generating package.json & workspaces'
                      })

        const 
        starter = `${pm.manager}${pm.manager == 'npm' ? ' run' : ''}`,
        packageJson = {
          name: configJson.nsi || name,
          description: description || 'Short description of the '+ type,
          version: configJson.version || '1.0.0',
          private: true,
          scripts: {
            start: `cd ./sandbox && ${starter} start`,
            test: `cd ./sandbox && ${starter} test:dev`
          },
          main: 'src/index.'+ plang,
          author: configJson.author.name,
          repository: repository || '-',
          licence: 'GNU'
        }

        // Manage sandbox and its dependencies as workspace
        if( inSandbox ) packageJson.workspaces = [ 'sandbox' ]

        // Generate initial package.json at project root directory
        await pm.init( packageJson )

        /*-------------------------------------------------------------------------*/
        // Install dependencies
        this.watcher( 'setup',
                      false,
                      {
                        percent: 49,
                        processor: 'cpm',
                        message: 'Installing project dependencies'
                      })
        await pm.install( ( _, length, message ) => {
          // Installation progress tracking
          this.watcher( 'setup',
                        false,
                        {
                          percent: Math.floor( 59 + ( length / 40 ) ),
                          processor: 'cpm',
                          message
                        })
        } )

        /*-------------------------------------------------------------------------*/
        // Init Git & commit if repository is defined
        if( repository ){
          this.watcher( 'setup',
                        false,
                        {
                          percent: 91,
                          processor: 'git',
                          message: 'Initialization and synchronize project to git repository'
                        })
          await git.initProject( null, true )
        }
        
        /*-------------------------------------------------------------------------*/
        // Done
        this.watcher( 'setup',
                      false,
                      {
                        percent: 100,
                        processor: false,
                        message: 'Setup completed'
                      })
      }

      // Setup testing project

    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'setup', error )
    }
  }

  async runEM( id, dataset ){
    // Start an Emulator Instance
    try {
      const
      { type, name, scope } = dataset,
      { directory } = scope.IDE,
      
      fs = new FileSystem({ cwd: directory, debug: this.debugMode }),
      em = this.emulators[ id ] // Use cached instance
            || new Emulator({ cwd: directory, name, debug: this.debugMode })

      if( !( await fs.exists() ) )
        throw new Error('Project directory not found')
        
      if( !( await fs.exists('sandbox') ) )
        throw new Error('Project setup not found. Synchronize with CPM may solve the problem')

      // Run
      const metadata = await em.run()
      // Cash instance for post control operations. Eg. restart, quit
      this.emulators[ id ] = em

      return metadata
    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }

  async reloadEM( id, dataset ){
    // Reload emulator instance
    try {
      // Reconnect to process in case development server was reloaded
      if( !this.emulators[ id ] ){
        const
        { type, name, scope } = dataset,
        { directory } = scope.IDE
      
        this.emulators[ id ] = new Emulator({ cwd: directory, name, debug: this.debugMode })
      }
        
      // Reload process
      return await this.emulators[ id ].reload()
    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }

  async quitEM( id ){
    // Close emulator instance
    try {
      if( !this.emulators[ id ] )
        throw new Error('Emulator instance not found')
        
      // Destory process
      return await this.emulators[ id ].exit()
    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }
}