import type { Metadata, Project } from '../../types/project'
import type { JSPackage, JSSource, JSPackageAction, CPackageAction, CPRAccess } from '../../types/package'
import fs from '@cubic-bubble/fs'
import path from '@cubic-bubble/path'
import LPSServer from './LPSServer'
import PackageManager from '@cubic-bubble/cpm'
import Emulator from './Emulator'
import GitManager from './GitManager'
import FileSystem from './FileSystem'
import * as GenericFile from './GenericFile'

export type IProcessWatcher = ( processName: string, error: Error | string | boolean, stats?: any ) => void
export type IProcessOptions = {
  debug: boolean
  watcher?: IProcessWatcher
}

export default class IProcess {
  private LPS
  public debugMode = false
  public watcher: IProcessWatcher = () => {}

  // Active emulators
  private emulators: { [index: string]: Emulator } = {}

  constructor( options: IProcessOptions ){
    // Debuging mode
    this.debugMode = options.debug
    // Process watcher
    if( typeof options.watcher === 'function' )
      this.watcher = options.watcher

    // Locale Package Store
    this.LPS = LPSServer().Storage
  }

  // Internal operation log: Debug mode
  debug( ...args: any[] ){ this.debugMode && console.log( ...args ) }

  async setupProject( dataset: Project ){
    try {
      const
      { type, name, description, specs } = dataset,
      { language, directory, repository } = specs.code,

      pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: this.debugMode }),
      git = new GitManager({ debug: this.debugMode, repository }),
      fs = new FileSystem({ cwd: null, debug: this.debugMode })

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

        await fs.newFile( `${directory}/.cubic`, JSON.stringify( dotCubic, null, '\t' ) )
        await fs.newFile( `${directory}/.metadata`, JSON.stringify( dotMetadata, null, '\t' ) )
        await fs.newFile( `${directory}/.gitignore`, dotGitignore )

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
        packageJson: any = {
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
        await pm.installDependencies( '-f', ( error: string | boolean, message: string, bytes: number ) => {
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
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( 'setup', error )
    }
  }
  async importProject( dataset: Project ){
    try {
      const
      { type, name, description, specs } = dataset,
      { language, directory, repository } = specs.code,

      pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: this.debugMode }),
      git = new GitManager({ debug: this.debugMode, repository }),
      fs = new FileSystem({ cwd: null, debug: this.debugMode })

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
        packageJson: any = {
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
        await pm.installDependencies( '-f', ( error: string | boolean, message: string, bytes: number ) => {
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
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( 'import', error )
    }
  }
  async publishProject( dataset: Project, access?: CPRAccess ){
    try {
      // Use CPR's in-build configuration in `cubic.yml`
      if( !access 
          && Array.isArray( Configs.CPR_ACCESS ) 
          && Configs.CPR_ACCESS[0]?.source )
        access = Configs.CPR_ACCESS[0]
      
      if( !access?.source )
        throw new Error('Invalid CPR Configuration')
      
      const 
      { type, namespace, nsi, name, version, specs } = dataset,
      { directory, repository } = specs.code,
      git = new GitManager({ debug: this.debugMode, repository })

      if( specs.code ) {
        // Initialize project
        this.watcher( 'publish',
                      false,
                      {
                        percent: 0,
                        processor: 'cpm',
                        message: 'Initialize publication features'
                      })
                      
        const
        pm = new PackageManager({ 
          cpr: access,
          cwd: directory,
          manager: 'cpm',
          debug: this.debugMode
        }),
        fs = new FileSystem({ cwd: directory, debug: this.debugMode })

        // Publish new project
        this.watcher( 'publish',
                      false,
                      {
                        percent: 5,
                        processor: 'cpm',
                        message: 'Checking project metadata'
                      })
        const metadata = await fs.readFile(`${directory}/.metadata`, { encoding: 'json' })
        if( !metadata
            || metadata.type !== type
            || metadata.name !== name )
          throw new Error('Inconsistency detected in project .metadata')

        /**
         * IMPORTANT: Define git's current working directory
         *              for all next commands cause project
         *              directory is now created
         */
        git.setCWD( directory )

        // TODO: Push project to specified or archive repository


        // Publish new project
        this.watcher( 'publish',
                      false,
                      {
                        percent: 15,
                        processor: 'cpm',
                        message: 'Push project to git repository'
                      })

        /* -------------------------------------------------------------------------*/
        // Publish project
        this.watcher( 'publish',
                      false,
                      {
                        percent: 37,
                        processor: 'cpm',
                        message: 'Publishing project'
                      })
        await pm.publish( ( error: string | boolean, message: string, bytes: number ) => {
          // Publication progress tracking
          error ?
            this.watcher( 'publish', error )
            : this.watcher( 'publish',
                            error,
                            {
                              percent: Math.floor( 37 + ( bytes / 30 ) ),
                              processor: 'cpm',
                              message
                            })
        } )

        /* -------------------------------------------------------------------------*/
        // Done
        this.watcher( 'publish',
                      false,
                      {
                        percent: 100,
                        processor: false,
                        message: 'Project published'
                      })
      }
    }
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher('publish', error )
    }
  }

  async startEM( id: string, dataset: Project ){
    // Start an Emulator Instance
    try {
      const
      { name, specs } = dataset,
      { directory } = specs.code,
      watcher = ( error: boolean, data: any ) => this.watcher('emulator', error, data ),

      fs = new FileSystem({ cwd: directory, debug: this.debugMode }),
      em = this.emulators[ id ] // Use cached instance
            || new Emulator({ cwd: directory, name, debug: this.debugMode, watcher })

      if( !( await fs.exists( directory ) ) )
        throw new Error('Project directory not found')

      if( !( await fs.exists('.sandbox') ) )
        throw new Error('Project setup not found. Synchronize with CPM may solve the problem')

      const metadata = await em.start()
      // Cash instance for post control operations. Eg. restart, quit
      this.emulators[ id ] = em

      return metadata
    }
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }
  async restartEM( id: string, dataset: Project ){
    // Restart emulator instance
    try {
      // Reconnect to process in case development server was restarted
      if( !this.emulators[ id ] ) {
        const
        { name, specs } = dataset,
        { directory } = specs.code,
        watcher = ( error: boolean, data: any ) => this.watcher('emulator', error, data )

        this.emulators[ id ] = new Emulator({ cwd: directory, name, debug: this.debugMode, watcher })
      }

      // Restart process
      return await this.emulators[ id ].restart()
    }
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }
  async stopEM( id: string, dataset: Project ){
    // Close emulator instance
    try {
      // Reconnect to process in case development server was restarted
      if( !this.emulators[ id ] ) {
        const
        { name, specs } = dataset,
        { directory } = specs.code,
        watcher = ( error: boolean, data: any ) => this.watcher('emulator', error, data )

        this.emulators[ id ] = new Emulator({ cwd: directory, name, debug: this.debugMode, watcher })
      }

      // Destroy process
      return await this.emulators[ id ].stop()
    }
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( 'emulator', error )
    }
  }

  async addComponents( dataset: string[], directory: string ){
    // Copy a component package from store to a project's components folder
    const
    project = `${directory}/components`,
    fs = new FileSystem({ debug: this.debugMode }),
    add = async ( payload: any ) => {
      try {
        const
        storeComponent = path.join( process.cwd(), `/store/components/${payload.package}` ),
        exists = await fs.exists( project )

        if( !exists ) await fs.newDir( project )
        await fs.copy( storeComponent, project )
      }
      catch( error: any ) {
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

  private async processJSPackage( action: JSPackageAction, packages: JSPackage[], directory: string, source: JSSource ){

    const processName = `${action}-packages`
    source = source || 'cpm'

    try {
      if( !Array.isArray( packages ) )
        throw new Error('Invalid packages argument. Expecte an <Array>')

      if( !directory || !( await fs.pathExists( directory ) ) )
        throw new Error('Invalid project directory.')

      this.watcher( processName,
                    false,
                    {
                      percent: 1,
                      processor: source,
                      message: 'Installing dependency pagkages'
                    })

      const 
      pm = new PackageManager({ cwd: directory, manager: Configs.NODE_PACKAGE_MANAGER, debug: this.debugMode }),
      pkgList = packages.map( ({ item }) => {
        return item.name +( action == 'install' && item.version ? `@${item.version}` : '' )
      } )

      await pm[ action ]( pkgList, '-W', ( error: string, message: string, bytes: number ) => {
        // Installation progress tracking
        error ?
          this.watcher( processName, error )
          : this.watcher( processName,
                          error,
                          {
                            percent: Math.floor( 19 + ( bytes / 40 ) ),
                            processor: source,
                            message
                          })
      } )

      // Completed
      this.watcher( processName,
                    false,
                    {
                      percent: 100,
                      processor: source,
                      message: `Dependency packages ${action.replace(/e$/, '')}ed`
                    })
    }
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( processName, error )
    }
  }
  // Install/Add JS dependency packages from NPM, CPM, ...
  async installJSPackages( packages: JSPackage[], directory: string, source: JSSource ){
    await this.processJSPackage( 'install', packages, directory, source )
  }
  // Remove dependency packages
  async removeJSPackages( packages: JSPackage[], directory: string, source: JSSource ){
    await this.processJSPackage( 'remove', packages, directory, source )
  }
  // Update dependency packages
  async updateJSPackages( packages: JSPackage[], directory: string, source: JSSource ){
    await this.processJSPackage( 'update', packages, directory, source )
  }
  // Reinstall dependency packages
  async refreshJSPackages( directory: string, source: JSSource ){
    try {
      if( !directory || !( await fs.pathExists( directory ) ) )
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
      await pm.installDependencies( '-f', ( error: string | boolean, message: string, bytes: number ) => {
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
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( 'refresh-packages', error )
    }
  }

  private async updateDotMetadata( action: CPackageAction, dependencies: string[], directory: string ){
    // Update dependencies list in project's .metadata file
    if( !dependencies.length ) return

    const dotMetadata = await fs.readJson(`${directory}/.metadata`) as Metadata
    if( !dotMetadata )
      throw new Error('Project .metadata file not found')

    if( !dotMetadata.resource )
      dotMetadata.resource = { dependencies: dependencies }

    else if( !dotMetadata.resource.dependencies )
      dotMetadata.resource.dependencies = dependencies
    
    else if( Array.isArray( dotMetadata.resource?.dependencies ) && !dotMetadata.resource.dependencies.length )
      dotMetadata.resource.dependencies = dependencies

    else {
      const Deps: string[] = []
      dependencies.forEach( each => {
        dotMetadata.resource?.dependencies?.forEach( dep => {
          if( !dep.includes( each.replace(/~(.+)$/, '') ) ){
            // Retain the existing & different package references
            Deps.push( dep )
            // New package reference
            action !== 'remove' && Deps.push( each )
          }			
          // Replace package reference only during: `install` or `update`
          else action !== 'remove' && Deps.push( each )
        })
      })

      dotMetadata.resource.dependencies = Deps
    }

    await fs.writeFile(`${directory}/.metadata`, JSON.stringify( dotMetadata, null, '\t' ) )
  }
  // Install/Remove/Update cubic packages from CPR
  async cubicCPackage( action: CPackageAction, packages: string[], directory: string, access?: CPRAccess ){
    const
    processName = `${action}-plugins`,
    processor = 'cpm'

    try {
      if( !Array.isArray( packages ) )
        throw new Error('Invalid package references argument. Expected an <Array>')

      if( !directory || !( await fs.pathExists( directory ) ) )
        throw new Error('Invalid project directory.')

      this.watcher( processName,
                    false,
                    {
                      percent: 1,
                      processor,
                      message: 'Installing plugin packages'
                    })

      // Use CPR's in-build configuration in `cubic.yml`
      if( !access 
          && Array.isArray( Configs.CPR_ACCESS ) 
          && Configs.CPR_ACCESS[0]?.source )
        access = Configs.CPR_ACCESS[0]
      
      if( !access?.source )
        throw new Error('Invalid CPR Configuration')
      
      const pm = new PackageManager({
        cpr: access,
        cwd: directory,
        debug: this.debugMode
      })

      await pm[ action ]( packages, '-f -d', ( error: string, bytes: number, message: string ) => {
        // Installation progress tracking
        error ?
          this.watcher( processName, error )
          : this.watcher( processName,
                          error,
                          {
                            percent: bytes,
                            processor,
                            message
                          })
      } )

      // TODO: Remove `failed to install` packages from the list


      // Refresh/Update .metadata file
      await this.updateDotMetadata( action, packages, directory )

      // Completed
      this.watcher( processName,
                    false,
                    {
                      percent: 100,
                      processor,
                      message: `Installation ${action.replace(/e$/, '')}ed`
                    })
    }
    catch( error: any ) {
      this.debug('Error occured: ', error )
      this.watcher( processName, error )
    }
  }

  async installApp( metadata: Metadata ){
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
    catch( error: any ) {
      this.debug('Failed to install app: ', error )
      this.watcher( 'install-app', error )
    }
  }
  async uninstallApp( sid: string ){
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
    catch( error: any ) {
      this.debug('Failed to uninstall app: ', error )
      this.watcher( 'uninstall-app', error )
    }
  }
}