
import Fs from 'fs-inter'
import Path from 'path-inter'
import randtoken from 'rand-token'
import Emulator from './Emulator'
import GitManager from './GitManager'
import FileSystem from './FileSystem'
import * as GenericFile from './GenericFile'
import PackageManager from './PackageManager'

async function generateId( name ){

  const 
  dirpath = Path.resolve('sync'),
  filepath = `${dirpath}/ids.json`
  try {
    const IDs = await Fs.readJson( filepath )
    if( typeof IDs != 'object' )
      throw new Error('Not Exist')

    if( !IDs[ name ] ){
      IDs[ name ] = 'EXT-'+ random( 10, 99999 )
                          +'-'+ randtoken.generate(4).toUpperCase()
                          +'-'+ randtoken.generate(8).toUpperCase()

      await Fs.ensureDir( dirpath )
      await Fs.writeFile( filepath, JSON.stringify( IDs, null, '\t' ), 'UTF-8' )

      return IDs[ name ]
    }

    return IDs[ name ]
  }
  catch( error ){
    const ID = 'EXT-'+ random( 10, 99999 )
                        +'-'+ randtoken.generate(4).toUpperCase()
                        +'-'+ randtoken.generate(8).toUpperCase()

    await Fs.ensureDir( dirpath )
    await Fs.writeFile( filepath, JSON.stringify({ [name]: ID }, null, '\t' ), 'UTF-8' )

    return ID
  }
}

async function PackageProcess( action, dataset, directory, source, _process ){
  
  const processName = action +'-packages'
  source = source || 'cpm'

  try {
    if( !Array.isArray( dataset ) )
      throw new Error('Invalid packages dataset argument. Expecte an <Array>')

    if( !directory || !( await Fs.pathExists( directory ) ) )
      throw new Error('Invalid project directory.')
    
    _process.watcher( processName,
                      false,
                      {
                        percent: 1,
                        processor: source,
                        message: 'Installing dependency pagkages'
                      })

    const
    pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: _process.debugMode }),
    packages = dataset.map( ({ name, version }) => { return name +( action == 'install' && version ? '@'+ version : '' ) } )
    
    await pm[ action ]( packages, '-W', ( error, message, bytes ) => {
      // Installation progress tracking
      error ? 
        _process.watcher( processName, error )
        : _process.watcher( processName,
                            error,
                            {
                              percent: Math.floor( 19 + ( bytes / 40 ) ),
                              processor: source,
                              message
                            })
    } )

    // Completed
    _process.watcher( processName,
                      false,
                      {
                        percent: 100,
                        processor: source,
                        message: `Dependency packages ${action.replace(/e$/, '')}ed`
                      })
  }
  catch( error ){
    _process.debug('Error occured: ', error )
    _process.watcher( processName, error )
  }
}

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

  async setupProject( dataset ){
    try {
      const 
      { type, name, description, specs } = dataset,
      { language, directory, repository } = specs.code,
      
      pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: this.debugMode }),
      git = new GitManager({ debug: this.debugMode, repository }),
      fs = new FileSystem({ cwd: false, debug: this.debugMode })

      // Project will run in a sandbox
      let inSandbox = false
      
      // Setup code project
      if( specs.code ){
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
        templateType = type == 'application' ? 'app' : type,
        plang = language.split('~')[0] // Specified programming language or Framework

        // Append template project to the directory
        await git.cloneProject( `https://github.com/${Configs.INSTANCE_PROVIDER}/create-${templateType}-${plang}.git`, directory, true )

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
        configJson = await GenericFile.configJson( dataset ),
        dotGitignore = await GenericFile.dotGitignore( directory )

        await fs.newFile( directory +'/.cubic', JSON.stringify( dotCubic, null, '\t' ) )
        await fs.newFile( directory +'/config.json', JSON.stringify( configJson, null, '\t' ) )
        await fs.newFile( directory +'/.gitignore', dotGitignore )

        /*-------------------------------------------------------------------------*/
        // Clone sandbox by language from Git
        this.watcher( 'setup',
                      false,
                      {
                        percent: 30,
                        processor: 'git',
                        message: 'Setup development sandbox'
                      })
        await git.cloneProject( `https://github.com/${Configs.INSTANCE_PROVIDER}/${plang}-sandbox.git`, directory +'/.sandbox' )
        inSandbox = true

        /*-------------------------------------------------------------------------*/
        // Init yarn & package.json + .sandbox workspace
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
            start: `cd ./.sandbox && ${starter} start`,
            test: `cd ./.sandbox && ${starter} test:dev`
          },
          main: 'src/index.'+ plang,
          author: configJson.author.name,
          repository: repository || '-',
          licence: 'GNU'
        }

        // Manage sandbox and its dependencies as workspace
        if( inSandbox ) packageJson.workspaces = [ '.sandbox' ]

        // Generate initial package.json at project root directory
        await pm.init( packageJson )

        /*-------------------------------------------------------------------------*/
        // Install dependencies packages
        this.watcher( 'setup',
                      false,
                      {
                        percent: 49,
                        processor: 'cpm',
                        message: 'Installing project dependencies'
                      })
        await pm.installPackages( ( error, message, bytes ) => {
          // Installation progress tracking
          error ?
            this.watcher( 'setup', error )
            : this.watcher( 'setup',
                            error,
                            {
                              percent: Math.floor( 59 + ( bytes / 40 ) ),
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
  async importProject( dataset ){
    try {
      const 
      { type, name, description, specs } = dataset,
      { language, directory, repository } = specs.code,
      
      pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: this.debugMode }),
      git = new GitManager({ debug: this.debugMode, repository }),
      fs = new FileSystem({ cwd: false, debug: this.debugMode })

      // Project will run in a sandbox
      let inSandbox = false
      
      // Import code project
      if( specs.code ){
        // Specified programming language or Framework
        const plang = language.split('~')[0]

        /** No directory found: 
         * Create new project directory either by
         * fetching from its git repository when defined
         * or by initial project setup source files.
         * 
         * Otherwise, directory will be only synchronized
         */
        if( !( await fs.exists( directory ) ) ){
          // Clone project from its own repository
          if( repository ){
            this.watcher( 'import',
                          false,
                          {
                            percent: 5,
                            processor: 'git',
                            message: 'Cloning project repository' 
                          })

            await git.cloneProject( repository, directory, true )
          }
          
          // Append template project to the directory
          else {
            this.watcher( 'import',
                          false,
                          {
                            percent: 5,
                            processor: 'git',
                            message: 'Adding initial project source files' 
                          })

            const templateType = type == 'application' ? 'app' : type
            await git.cloneProject( `https://github.com/${Configs.INSTANCE_PROVIDER}/create-${templateType}-${plang}.git`, directory, true )
          }
        }
        
        /** IMPORTANT: Define git's current working directory 
         *              for all next commands cause project
         *              directory is now created
         */
        git.setCWD( directory )

        /*-------------------------------------------------------------------------*/
        // Update/Create generic files: .cubic, config.json, README.md
        this.watcher( 'import',
                      false,
                      {
                        percent: 18,
                        processor: 'fs',
                        message: 'Updating generic configurations' 
                      })
        const
        dotCubic = await GenericFile.dotCubic( dataset ),
        configJson = await GenericFile.configJson( dataset ),
        dotGitignore = await GenericFile.dotGitignore( directory )

        await fs.newFile( directory +'/.cubic', JSON.stringify( dotCubic, null, '\t' ) )
        await fs.newFile( directory +'/config.json', JSON.stringify( configJson, null, '\t' ) )
        await fs.newFile( directory +'/.gitignore', dotGitignore )

        /*-------------------------------------------------------------------------*/
        // Clone and add new sandbox by language from Git
        if( !( await fs.exists(`${directory}/.sandbox`) ) ){
          this.watcher( 'import',
                        false,
                        {
                          percent: 20,
                          processor: 'git',
                          message: 'Setup development sandbox'
                        })
                        
          await git.cloneProject( `https://github.com/${Configs.INSTANCE_PROVIDER}/${plang}-sandbox.git`, directory +'/.sandbox' )
          inSandbox = true
        }

        /*-------------------------------------------------------------------------*/
        // Update yarn & package.json + .sandbox workspace
        this.watcher( 'import',
                      false,
                      {
                        percent: 36,
                        processor: 'cpm',
                        message: 'Updating package.json & workspaces'
                      })

        const 
        starter = `${pm.manager}${pm.manager == 'npm' ? ' run' : ''}`,
        packageJson = {
          name: configJson.nsi || name,
          description: description || 'Short description of the '+ type,
          version: configJson.version || '1.0.0',
          private: true,
          scripts: {
            start: `cd ./.sandbox && ${starter} start`,
            test: `cd ./.sandbox && ${starter} test:dev`
          },
          main: 'src/index.'+ plang,
          author: configJson.author.name,
          repository: repository || '-',
          licence: 'GNU'
        }

        // Manage sandbox and its dependencies as workspace
        if( inSandbox ) packageJson.workspaces = [ '.sandbox' ]

        // Merge & re-initialize package.json
        await pm.init( packageJson )

        /*-------------------------------------------------------------------------*/
        // Install dependency packages
        this.watcher( 'import',
                      false,
                      {
                        percent: 37,
                        processor: 'cpm',
                        message: 'Installing project dependencies'
                      })
        await pm.installPackages( ( error, message, bytes ) => {
          // Installation progress tracking
          error ?
            this.watcher( 'import', error )
            : this.watcher( 'import',
                            error,
                            {
                              percent: Math.floor( 37 + ( bytes / 30 ) ),
                              processor: 'cpm',
                              message
                            })
        } )
        
        /*-------------------------------------------------------------------------*/
        // Done
        this.watcher( 'import',
                      false,
                      {
                        percent: 100,
                        processor: false,
                        message: 'Project import completed'
                      })
      }

      // Import testing project

    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'import', error )
    }
  }

  async runEM( id, dataset ){
    // Start an Emulator Instance
    try {
      const
      { type, name, specs } = dataset,
      { directory } = specs.code,
      
      fs = new FileSystem({ cwd: directory, debug: this.debugMode }),
      em = this.emulators[ id ] // Use cached instance
            || new Emulator({ cwd: directory, name, debug: this.debugMode })

      if( !( await fs.exists() ) )
        throw new Error('Project directory not found')
        
      if( !( await fs.exists('.sandbox') ) )
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
        { name, specs } = dataset,
        { directory } = specs.code
      
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
  async quitEM( id, dataset ){
    // Close emulator instance
    try {
      // Reconnect to process in case development server was reloaded
      if( !this.emulators[ id ] ){
        const
        { name, specs } = dataset,
        { directory } = specs.code
      
        this.emulators[ id ] = new Emulator({ cwd: directory, name, debug: this.debugMode })
      }
        
      // Destory process
      return await this.emulators[ id ].exit()
    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }

  async addComponents( dataset, directory ){
    // Copy a component package from store to a project's components folder
    const
    project = `${directory}/components`,
    fs = new FileSystem({ debug: this.debugMode }),
    add = async payload => {
      try {
        const 
        storeComponent = Path.join( process.cwd(), `/store/components/${payload.package}` ),
        exists = await fs.exists( project )

        if( !exists ) await fs.newDir( project )
        await fs.copy( storeComponent, project )
      }
      catch( error ){
        this.debug('Error occured: ', error )
        this.watcher( 'add-component', error )
      }
    }

    // Add multiple component at once
    if( Array.isArray( dataset ) )
      for( const x in dataset )
        await add( dataset[ x ] )
    
    // Single component to add
    else await add( dataset )

    // Completed
    this.watcher( 'add-component',
                  false,
                  {
                    percent: 100,
                    processor: false,
                    message: 'Components added'
                  })
  }

  async installPackages( dataset, directory, source ){
    // Install/Add dependency packages from MPM, CPM, ...
    await PackageProcess( 'install', dataset, directory, source, this )
  }
  async removePackages( dataset, directory, source ){
    // Remove dependency packages
    await PackageProcess( 'remove', dataset, directory, source, this )
  }
  async updatePackages( dataset, directory, source ){
    // Update dependency packages
    await PackageProcess( 'update', dataset, directory, source, this )
  }
  async refreshPackages( directory, source ){
    // Reinstall dependency packages
    try {
      if( !directory || !( await Fs.pathExists( directory ) ) )
        throw new Error('Invalid project directory.')

      source = source || 'cpm'

      this.watcher( 'refresh-packages',
                      false,
                      {
                        percent: 3,
                        processor: source,
                        message: 'Refreshing dependency packages'
                      })

      const pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: this.debugMode })
      await pm.installPackages( ( error, message, bytes ) => {
        // Installation progress tracking
        error ?
          this.watcher( 'refresh-packages', error )
          : this.watcher( 'refresh-packages',
                          error,
                          {
                            percent: Math.floor( 51 + ( bytes / 40 ) ),
                            processor: source,
                            message
                          })
      } )

      // Completed
      this.watcher( 'refresh-packages',
                    false,
                    {
                      percent: 100,
                      processor: source,
                      message: 'Dependency packages refreshed'
                    })
    }
    catch( error ){
      this.debug('Error occured: ', error )
      this.watcher( 'refresh-packages', error )
    }
  }
  
  async installApp( dataset ){
    try {
      if( !isApp( dataset ) )
        throw new Error('Invalid application dataset')

      this.watcher( 'install-app',
                    false,
                    {
                      percent: 1,
                      processor: false,
                      message: 'Installation started'
                    })
                    
      const appId =
      dataset.extensionId = await generateId( dataset.name )

      await Sync.setApp( appId, dataset )
      
      // Completed
      this.watcher( 'install-app',
                    false,
                    {
                      percent: 100,
                      processor: false,
                      message: 'Installation completed'
                    })

      return appId
    }
    catch( error ){
      this.debug('Failed to install app: ', error )
      this.watcher( 'install-app', error )
    }
  }
  async uninstallApp( appId ){
    try {
      if( !appId )
        throw new Error('Undefined application id')

      this.watcher( 'uninstall-app',
                    false,
                    {
                      percent: 1,
                      processor: false,
                      message: 'Removing application'
                    })

      await Sync.clearApp( appId )
      
      // Completed
      this.watcher( 'uninstall-app',
                    false,
                    {
                      percent: 100,
                      processor: false,
                      message: 'Application uninstalled'
                    })

      return true
    }
    catch( error ){
      this.debug('Failed to uninstall app: ', error )
      this.watcher( 'uninstall-app', error )
    }
  }
}