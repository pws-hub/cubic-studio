
import Fs from 'fs-inter'
import Path from 'path-inter'
import Emulator from './Emulator'
import PackageManager from './CPM'
import LPSServer from './LPSServer'
import GitManager from './GitManager'
import FileSystem from './FileSystem'
import * as GenericFile from './GenericFile'

async function processJSPackage( action, packages, directory, source, _process ){

  const processName = `${action }-packages`
  source = source || 'cpm'

  try {
    if( !Array.isArray( packages ) )
      throw new Error('Invalid packages argument. Expecte an <Array>')

    if( !directory || !( await Fs.pathExists( directory ) ) )
      throw new Error('Invalid project directory.')

    _process.watcher( processName,
                      false,
                      {
                        percent: 1,
                        processor: source,
                        message: 'Installing dependency pagkages'
                      })

    const pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: _process.debugMode })

    packages = packages.map( ({ name, version }) => { return name +( action == 'install' && version ? `@${ version}` : '' ) } )

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
  catch( error ) {
    _process.debug('Error occured: ', error )
    _process.watcher( processName, error )
  }
}
async function processCubicPackage( action, packages, directory, _process ){

  const
  processName = `${action}-packages`
  processor = 'cpm'

  try {
    if( !Array.isArray( packages ) )
      throw new Error('Invalid package references argument. Expected an <Array>')

    if( !directory || !( await Fs.pathExists( directory ) ) )
      throw new Error('Invalid project directory.')

    _process.watcher( processName,
                      false,
                      {
                        percent: 1,
                        processor,
                        message: 'Installing pagkages'
                      })

    const pm = new PackageManager({ cwd: directory, debug: _process.debugMode })

    await pm[ action ]( packages.join(' '), '-f -d', ( error, bytes, message ) => {
      // Installation progress tracking
      error ?
        _process.watcher( processName, error )
        : _process.watcher( processName,
                            error,
                            {
                              percent: bytes,
                              processor,
                              message
                            })
    } )

    // Completed
    _process.watcher( processName,
                      false,
                      {
                        percent: 100,
                        processor,
                        message: `Installation ${action.replace(/e$/, '')}ed`
                      })
  }
  catch( error ) {
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
    // Locale Package Store
    this.LPS = LPSServer().Interface
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
      if( specs.code ) {
        // Create new project directory
        this.watcher( 'setup',
                      false,
                      {
                        percent: 0,
                        processor: 'fs',
                        message: 'Creating project directory'
                      })
        await fs.newDir( directory )

        /* -------------------------------------------------------------------------*/
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

        /**
         * IMPORTANT: Define git's current working directory
         *              for all next commands cause project
         *              directory is now created
         */
        git.setCWD( directory )

        /* -------------------------------------------------------------------------*/
        // Add generic files: .cubic, .metadata, README.md
        this.watcher( 'setup',
                      false,
                      {
                        percent: 26,
                        processor: 'fs',
                        message: 'Creating generic configurations'
                      })
        const
        dotCubic = await GenericFile.dotCubic( dataset ),
        dotMetadata = await GenericFile.dotMetadata( dataset ),
        dotGitignore = await GenericFile.dotGitignore( directory )

        await fs.newFile( `${directory }/.cubic`, JSON.stringify( dotCubic, null, '\t' ) )
        await fs.newFile( `${directory }/.metadata`, JSON.stringify( dotMetadata, null, '\t' ) )
        await fs.newFile( `${directory }/.gitignore`, dotGitignore )

        /* -------------------------------------------------------------------------*/
        // Clone sandbox by language from Git
        this.watcher( 'setup',
                      false,
                      {
                        percent: 30,
                        processor: 'git',
                        message: 'Setup development sandbox'
                      })
        await git.cloneProject( `https://github.com/${Configs.INSTANCE_PROVIDER}/${plang}-sandbox.git`, `${directory }/.sandbox` )
        inSandbox = true

        /* -------------------------------------------------------------------------*/
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
          name: dotMetadata.nsi || name,
          description: description || `Short description of the ${type}`,
          version: dotMetadata.version || '1.0.0',
          private: true,
          scripts: {
            start: `cd ./.sandbox && ${starter} start`,
            test: `cd ./.sandbox && ${starter} test:dev`
          },
          main: `src/index.${plang}`,
          author: dotMetadata.author.name,
          repository: repository || '-',
          licence: 'GNU'
        }

        // Manage sandbox and its dependencies as workspace
        if( inSandbox ) packageJson.workspaces = [ '.sandbox' ]

        // Generate initial package.json at project root directory
        await pm.init( packageJson )

        /* -------------------------------------------------------------------------*/
        // Install dependencies packages
        this.watcher( 'setup',
                      false,
                      {
                        percent: 49,
                        processor: 'cpm',
                        message: 'Installing project dependencies'
                      })
        await pm.installDependencies( ( error, message, bytes ) => {
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

        /* -------------------------------------------------------------------------*/
        // Init Git & commit if repository is defined
        if( repository ) {
          this.watcher( 'setup',
                        false,
                        {
                          percent: 91,
                          processor: 'git',
                          message: 'Initialization and synchronize project to git repository'
                        })
          await git.initProject( null, true )
        }

        /* -------------------------------------------------------------------------*/
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
    catch( error ) {
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
      if( specs.code ) {
        // Specified programming language or Framework
        const plang = language.split('~')[0]

        /**
         * No directory found:
         * Create new project directory either by
         * fetching from its git repository when defined
         * or by initial project setup source files.
         *
         * Otherwise, directory will be only synchronized
         */
        if( !( await fs.exists( directory ) ) ) {
          // Clone project from its own repository
          if( repository ) {
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

        /**
         * IMPORTANT: Define git's current working directory
         *              for all next commands cause project
         *              directory is now created
         */
        git.setCWD( directory )

        /* -------------------------------------------------------------------------*/
        // Update/Create generic files: .cubic, .metadata, README.md
        this.watcher( 'import',
                      false,
                      {
                        percent: 18,
                        processor: 'fs',
                        message: 'Updating generic configurations'
                      })
        const
        dotCubic = await GenericFile.dotCubic( dataset ),
        dotMetadata = await GenericFile.dotMetadata( dataset ),
        dotGitignore = await GenericFile.dotGitignore( directory )

        await fs.newFile( `${directory }/.cubic`, JSON.stringify( dotCubic, null, '\t' ) )
        await fs.newFile( `${directory }/.metadata`, JSON.stringify( dotMetadata, null, '\t' ) )
        await fs.newFile( `${directory }/.gitignore`, dotGitignore )

        /* -------------------------------------------------------------------------*/
        // Clone and add new sandbox by language from Git
        if( !( await fs.exists(`${directory}/.sandbox`) ) ) {
          this.watcher( 'import',
                        false,
                        {
                          percent: 20,
                          processor: 'git',
                          message: 'Setup development sandbox'
                        })

          await git.cloneProject( `https://github.com/${Configs.INSTANCE_PROVIDER}/${plang}-sandbox.git`, `${directory }/.sandbox` )
          inSandbox = true
        }

        /* -------------------------------------------------------------------------*/
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
          name: dotMetadata.nsi || name,
          description: description || `Short description of the ${ type}`,
          version: dotMetadata.version || '1.0.0',
          private: true,
          scripts: {
            start: `cd ./.sandbox && ${starter} start`,
            test: `cd ./.sandbox && ${starter} test:dev`
          },
          main: `src/index.${ plang}`,
          author: dotMetadata.author.name,
          repository: repository || '-',
          licence: 'GNU'
        }

        // Manage sandbox and its dependencies as workspace
        if( inSandbox ) packageJson.workspaces = [ '.sandbox' ]

        // Merge & re-initialize package.json
        await pm.init( packageJson )

        /* -------------------------------------------------------------------------*/
        // Install dependency packages
        this.watcher( 'import',
                      false,
                      {
                        percent: 37,
                        processor: 'cpm',
                        message: 'Installing project dependencies'
                      })
        await pm.installDependencies( ( error, message, bytes ) => {
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

        /* -------------------------------------------------------------------------*/
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
    catch( error ) {
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
    catch( error ) {
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }
  async reloadEM( id, dataset ){
    // Reload emulator instance
    try {
      // Reconnect to process in case development server was reloaded
      if( !this.emulators[ id ] ) {
        const
        { name, specs } = dataset,
        { directory } = specs.code

        this.emulators[ id ] = new Emulator({ cwd: directory, name, debug: this.debugMode })
      }

      // Reload process
      return await this.emulators[ id ].reload()
    }
    catch( error ) {
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }
  async quitEM( id, dataset ){
    // Close emulator instance
    try {
      // Reconnect to process in case development server was reloaded
      if( !this.emulators[ id ] ) {
        const
        { name, specs } = dataset,
        { directory } = specs.code

        this.emulators[ id ] = new Emulator({ cwd: directory, name, debug: this.debugMode })
      }

      // Destory process
      return await this.emulators[ id ].exit()
    }
    catch( error ) {
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
      catch( error ) {
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

  // Install/Add JS dependency packages from NPM, CPM, ...
  async installJSPackages( packages, directory, source ){
    await processJSPackage( 'install', packages, directory, source, this )
  }
  // Remove dependency packages
  async removeJSPackages( packages, directory, source ){
    await processJSPackage( 'remove', packages, directory, source, this )
  }
  // Update dependency packages
  async updateJSPackages( packages, directory, source ){
    await processJSPackage( 'update', packages, directory, source, this )
  }
  // Reinstall dependency packages
  async refreshJSPackages( directory, source ){
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
      await pm.installDependencies( ( error, message, bytes ) => {
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
    catch( error ) {
      this.debug('Error occured: ', error )
      this.watcher( 'refresh-packages', error )
    }
  }

  // Install cubic packages from CPR
  async installCubicPackages( packages, directory ){
    await processCubicPackage( 'install', packages, directory, this )
  }
  // Remove cubic packages
  async removeCubicPackages( packages, directory ){
    await processCubicPackage( 'remove', packages, directory, this )
  }
  // Update cubic packages
  async updateCubicPackages( packages, directory ){
    await processCubicPackage( 'update', packages, directory, this )
  }

  async installApp( metadata ){
    try {
      if( !isApp( metadata ) )
        throw new Error('Invalid application metadata')

      this.watcher( 'install-app',
                    false,
                    {
                      percent: 1,
                      processor: false,
                      message: 'Installation started'
                    })

      const sid = await this.LPS.insert( metadata )

      // Completed
      this.watcher( 'install-app',
                    false,
                    {
                      percent: 100,
                      processor: false,
                      message: 'Installation completed'
                    })

      return sid
    }
    catch( error ) {
      this.debug('Failed to install app: ', error )
      this.watcher( 'install-app', error )
    }
  }
  async uninstallApp( sid ){
    try {
      if( !sid )
        throw new Error('Undefined application id')

      this.watcher( 'uninstall-app',
                    false,
                    {
                      percent: 1,
                      processor: false,
                      message: 'Removing application'
                    })

      await this.LPS.delete( sid )

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
    catch( error ) {
      this.debug('Failed to uninstall app: ', error )
      this.watcher( 'uninstall-app', error )
    }
  }
}