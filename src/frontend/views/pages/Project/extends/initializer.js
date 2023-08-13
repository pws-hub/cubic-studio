
import PStore from 'all-localstorage'

export default Self => {

  async function initCodeWS(){
    // Declare filesystem I/O handler at the project's current working directory
    if( !State.project.specs.code ) return
    const cwd = State.project.specs.code.directory

    Self.fs = await window.FileSystem.init( 'project', { cwd, debug: true } )

    // Get project environment configuration
    State.env = await Self.fs.readFile( '.cubic', { encoding: 'json' } )
    // Declare Project's background Process Manager
    Self.pm = await window.IProcess.create({ debug: true })

    // Watch external/background operations on this directory
    let wait = 0
    Self.fs.watch( async ( event, path, stats ) => {
      debugLog(`[DIRECTORY Event] ${event}: ${path}`, stats )

      switch( event ) {
        // New file/dir added: Refresh directory tree
        case 'add':
        case 'addDir': wait && clearTimeout( wait )
                        await Self.getDirectory()
            break
        /**
         * Wait for `add` event to conclude file/dir moved:
         *  In that case `add event` will refresh the directory.
         *  otherwise, conclude `delete`
         */
        case 'unlink': wait = setTimeout( async () => await Self.getDirectory(), 2000 ); break

      }
    } )
  }
  async function initCodeSection(){
    // Initialize project's coding section
    State.sections.push('Code')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'Code')
    // Coding workspace
    await initCodeWS()

    const AUTORUN = true

    // Load project directory
    await Self.getDirectory()

    // Project has no directory: Setup or Import (Depending of flag value)
    if( isEmpty( State.Code.directories ) ) {
      if( !Self.flag ) {
        // TODO: Prompt modal for user to select project directory or setup new
        Self.onShowResetProjectToggle( true )
        return
      }
    }
    // Import if project have no package.json file at the directory root
    else if( !( await Self.fs.readFile( 'package.json', { encoding: 'json' } ) ) )
      Self.flag = 'import'

    // Flag when something fishing about the setup
    if( ['setup', 'import'].includes( Self.flag ) ) {
      // Importing project from specified repo (import) or setup new (default)
      const action = Self.flag || 'setup'

      // Setup a completely new project
      Self.ongoing({ headline: 'Setting up the project' })
      await delay(3)
      await Self.pm[ action ]( State.project, ( error, stats ) => {


        if( error ) {
          // TODO: Manage process exception errors
          console.log('--Progress Error: ', error )
          Self.ongoing({ error: typeof error == 'object' ? error.message : error })
          return
        }

        // TODO: Display progression stats
        Self.ongoing({ headline: `[${stats.percent}%] ${stats.message}` })
        Self.progression( stats )
      } )

      debugLog('-- Completed indeed --')

      // Automatically run project in 3 second
      await delay(3)
      Self.ongoing( false )
      AUTORUN && Self.DeviceOperator('start', true )
    }
    // Reload cached device state of this project
    else {
      const cachedEMImage = Self.pstore.get('device')
      if( AUTORUN && cachedEMImage )
        window.env == 'production' ?
                      Self.DeviceOperator('restart') // Reload backend process
                      : Self.DeviceOperator('start') // Connect frontend to process or run process if not available
    }

    // Mount project's last states of the active section
    Self.initSection('tabs', [] )
    Self.initSection('activeConsole', [] )
    Self.initSection('activeElement', null )

    // Load project dependencies
    await Self.getDependencies('Code')
  }

  async function initAPIWS(){

  }
  async function initAPISection(){
    // Initialize project's API Test section
    State.sections.push('API')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'API')
    // API Test workspace
    await initAPIWS()

    // Fetch API data

    State.API.collections = [{ name: 'Wigo' }, { name: 'Multipple' }]
    State.API.environments = [{ name: 'Wigo Dev' }, { name: 'Wigo Pro' }]

    // Mount project's last states of the active section
    Self.initSection('tabs', [] )
    Self.initSection('activeConsole', [] )
    Self.initSection('activeElement', null )
  }

  async function initSocketWS(){

  }
  async function initSocketSection(){
    // Initialize project's Sockets Test section
    State.sections.push('Socket')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'Socket')
    // Socket Test workspace
    await initSocketWS()

    // Mount project's last states of the active section
    Self.initSection('tabs', [] )
    Self.initSection('activeConsole', [] )
    Self.initSection('activeElement', null )
  }

  async function initDocWS(){

  }
  async function initDocSection(){
    // Initialize project's Documentation Editor section
    State.sections.push('Documentation')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'Documentation')
    // Documentation Editor workspace
    await initDocWS()

    // Mount project's last states of the active section
    Self.initSection('activeElement', null )

    // Load project dependencies
    await Self.getDependencies('Documentation')
  }

  Self.fs = false
  Self.pm = false
  Self.pstore = false

  const State = Self.state

  Self.getProject = async ( workspaceId, projectId ) => {
    try {
      const { error, message, project } = await RGet(`/workspaces/${workspaceId}/projects/${projectId}`)
      if( error ) throw new Error( message )

      State.project = project
      // Locale store for only this project
      Self.pstore = new PStore({ prefix: `cs-${project.name}`, encrypt: true })
      await Self.SetupProject()
    }
    catch( error ) {
      console.log('Failed retreiving project: ', error )
      State.project = null

      Self.ongoing({ headline: 'Project Not Found', noLoading: true })
    }
  }
  Self.getDirectory = async path => {
    // Get project directory content
    if( !Self.fs ) return

    const dirOptions = {
      ignore: '\\.git|(.+)\\.lock|\\.sandbox|node_modules',
      subdir: true
    }

    State.Code.directories = await Self.fs.directory( path || null, dirOptions )
    State.Code = newObject( State.Code )
  }
  Self.getDependencies = async section => {
    // Get project dependencies in package.json
    if( !Self.fs ) return

    switch( section || State.activeSection ) {
      // JS/TS project dependencies
      case 'Code': {
        const packageJson = await Self.fs.readFile( 'package.json', { encoding: 'json' } )
        if( !packageJson )
          throw new Error('[Dependency] No package.json file found at the project root')

        const
        { dependencies, devDependencies } = packageJson,
        deps = [],
        collector = async ( name, version, dev ) => {
          // Get more information about the package in node_modules
          let dep = { name, version: version.replace('^', ''), dev }
          try {
            const { description, repository } = await Self.fs.readFile(`./node_modules/${name}/package.json`, { encoding: 'json' } )
            dep = { ...dep, description, repository }
          }
          catch( error ) {
            // Failed fetching package.json of the dependency
          }

          deps.push( dep )
        }

        for( const name in dependencies )
          await collector( name, dependencies[ name ] )

        for( const name in devDependencies )
          await collector( name, devDependencies[ name ], true )

        State.Code.dependencies = deps
        State.Code = newObject( State.Code )
      } break

      // Documentation templates/plugins dependencies
      case 'Documentation': {

        State.Documentation.dependencies = []
      }
    }
  }
  Self.SetupProject = async flag => {
    try {
      if( flag ) Self.flag = flag

      // Init Code related project's section
      Self.hasCodeSection() && await initCodeSection()
      // Init API related project's section
      Self.hasAPISection() && await initAPISection()
      // Init Socket related project's section
      Self.hasSocketSection() && await initSocketSection()
      // Init Documentation related project's section
      Self.hasDocSection() && await initDocSection()

      // Close active ResetProject modal
      Self.onShowResetProjectToggle( false )
    }
    catch( error ) {
      console.log('Failed setting up project: ', error )
      Self.ongoing({
        noLoading: true,
        headline: 'Project setup failed',
        error: error.message
      })
    }
  }
  Self.DeleteProject = async () => {
    // Close running device
    Self.ongoing({ headline: 'Dropping all running device instances' })
    await Self.DeviceOperator('stop')
    await delay(2)

    // Clear store
    Self.ongoing({ headline: 'Flushing project cache' })
    Self.pstore.flush(`cs-${State.project.name}`)
    await delay(3)

    // Clear directory
    Self.ongoing({ headline: 'Clearing project directory' })
    await Self.fs.remove('')
    Self.setState({
      tabs: [],
      Code: {},
      API: {}
    })
    await delay(5)

    // Delete project specs from cubic server
    Self.ongoing({ headline: 'Deleting project specifications from cubic servers' })
    try {
      const
      url = `/workspaces/${State.workspace.workspaceId}/projects/${State.project.projectId}`,
      { error, message } = await await RDelete( url )

      if( error ) throw new Error( message )
    }
    catch( error ) {}
    await delay(3)

    // Clear open tabs
    Self.ongoing({ headline: 'Clearing project workspace' })
    State.project = false

    // Reset operators
    Self.fs = false // File System (fs)
    Self.pm = false // Process Manager (pm)
    Self.em = false // Device Manager (em)
    Self.dpm = false // Dependency Package Manager (dpm)
    await delay(2)

    // Move back to workspace
    Self.ongoing( false )
    navigate(`/workspace/${State.workspace.workspaceId}`)
  }
}