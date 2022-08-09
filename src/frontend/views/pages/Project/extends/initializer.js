
import PStore from 'all-localstorage'

export default $ => {

  $.fs = false
  $.pm = false
  $.pstore = false

  const State = $.state

  $.getProject = async ( workspaceId, projectId ) => {
    try {
      const { error, message, project } = await RGet(`/workspaces/${workspaceId}/projects/${projectId}`)
      if( error ) throw new Error( message )
      
      State.project = project
      // locale store for only this project
      $.pstore = new PStore({ prefix: `cs-${project.name}`, encrypt: true })
      await $.SetupProject()
    }
    catch( error ){
      console.log('Failed retreiving project: ', error )
      State.project = null

      $.ongoing({ headline: 'Project Not Found', noLoading: true })
    }
  }
  $.getDirectory = async path => {
    // Get project directory content
    if( !$.fs ) return

    const dirOptions = {
      ignore: '\\.git|(.+)\\.lock|\\.sandbox|node_modules',
      subdir: true
    }

    State.Code.directories = await $.fs.directory( path || null, dirOptions )
    State.Code = newObject( State.Code )
  }
  $.getDependencies = async () => {
    // Get project dependencies in package.json
    if( !$.fs ) return
    
    const packageJson = await $.fs.readFile( 'package.json', { encoding: 'json' } )
    if( !packageJson )
      throw new Error('[Dependency] No package.json file found at the project root')

    const 
    { dependencies, devDependencies } = packageJson,
    deps = [],
    collector = async ( name, version, dev ) => {
      // Get more information about the package in node_modules
      let dep = { name, version: version.replace('^', ''), dev }
      try {
        const { description, repository } = await $.fs.readFile(`./node_modules/${name}/package.json`, { encoding: 'json' } )
        dep = { ...dep, description, repository }
      }
      catch( error ){
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
  }
  $.SetupProject = async flag => {
    try {
      if( flag ) $.flag = flag
      
      // Init Code related project's section
      $.hasCodeSection() && await initCodeSection()
      // Init API related project's section
      $.hasAPISection() && await initAPISection()
      // Init Socket related project's section
      $.hasSocketSection() && await initSocketSection()

      // Close active ResetProject modal
      $.onShowResetProjectToggle( false )
    }
    catch( error ){
      console.log('Failed setting up project: ', error )
      $.ongoing({ 
        noLoading: true,
        headline: 'Project setup failed', 
        error: error.message
      })
    }
  }
  $.DeleteProject = async () => {
    // Close running emulator
    $.ongoing({ headline: 'Dropping all running emulator instances' })
    await $.QuitEmulator()
    await delay(2)

    // Clear store
    $.ongoing({ headline: 'Flushing project cache' })
    $.pstore.flush(`cs-${State.project.name}`)
    await delay(3)

    // Clear directory
    $.ongoing({ headline: 'Clearing project directory' })
    await $.fs.remove('')
    $.setState({
      tabs: [],
      Code: {},
      API: {}
    })
    await delay(5)

    // Delete project specs from cubic server
    $.ongoing({ headline: 'Deleting project specifications from cubic servers' })
    try {
      const 
      url = `/workspaces/${State.workspace.workspaceId}/projects/${State.project.projectId}`,
      { error, message } = await await RDelete( url )

      if( error ) throw new Error( message )
    }
    catch( error ){}
    await delay(3)
    
    // Clear open tabs
    $.ongoing({ headline: 'Clearing project workspace' })
    State.project = false
    
    // Reset operators
    $.fs = false
    $.pm = false
    $.packager = false
    $.emulator = false
    await delay(2)
    
    // Move back to workspace
    $.ongoing( false )
    navigate(`/workspace/${State.workspace.workspaceId}`)
  }

  async function initCodeWS(){
    // Declare filesystem I/O handler at the project's current working directory
    if( !State.project.specs.code ) return
    const cwd = State.project.specs.code.directory

    $.fs = await window.FileSystem.init( 'project', { cwd, debug: true } )
    // Declare Project's background Process Manager
    $.pm = await window.IProcess.create({ debug: true })

    // Watch external/background operations on this directory
    let wait = 0
    $.fs.watch( async ( event, path, stats ) => {
      debugLog(`[DIRECTORY Event] ${event}: ${path}`, stats )

      switch( event ){
        // New file/dir added: Refresh directory tree
        case 'add':
        case 'addDir': wait && clearTimeout( wait )
                        await $.getDirectory()
            break
        /** Wait for `add` event to conclude file/dir moved: 
            In that case `add event` will refresh the directory.
            otherwise, conclude `delete`
        */
        case 'unlink': wait = setTimeout( async () => await $.getDirectory(), 2000 ); break
                        
      }
    } )
  }
  async function initCodeSection(){
    // Initialize project's coding section
    State.sections.push('Code')
    // Default section
    if( !State.activeSection ) State.activeSection = 'Code'
    // Coding workspace
    await initCodeWS()

    let AUTORUN = true

    // Load project directory
    await $.getDirectory()

    // Project has no directory: Setup or Import (Depending of flag value)
    if( isEmpty( State.Code.directories ) ){
      if( !$.flag ){
        // TODO: Prompt modal for user to select project directory or setup new
        $.onShowResetProjectToggle( true )
        return
      }
    }
    // Import if project have no package.json file at the directory root
    else if( !( await $.fs.readFile( 'package.json', { encoding: 'json' } ) ) )
      $.flag = 'import'
    
    // Flag when something fishing about the setup
    if( ['setup', 'import'].includes( $.flag ) ){
      // Importing project from specified repo (import) or setup new (default)
      const action = $.flag || 'setup'

      // Setup a completely new project
      $.ongoing({ headline: 'Setting up the project' })
      await delay(3)
      await $.pm[ action ]( State.project, ( error, stats ) => {
        
        
          
        if( error ){
          // TODO: Manage process exception errors
          console.log('--Progress Error: ', error )
          $.ongoing({ error: typeof error == 'object' ? error.message : error })
          return
        }
        
        // TODO: Display progression stats
        $.ongoing({ headline: `[${stats.percent}%] ${stats.message}` })
        $.progression( stats )
      } )

      debugLog('-- Completed indeed --')
      
      // Automatically run project in 3 second
      await delay(3)
      $.ongoing( false )
      AUTORUN && $.RunEmulator( true )
    }
    // Reload cached emulator state of this project
    else {
      const cachedEMImage = $.pstore.get('emulator')
      if( AUTORUN && cachedEMImage )
        window.env == 'production' ? 
                      $.ReloadEmulator() // Reload backend process
                      : $.RunEmulator() // Connect frontend to process or run process if not available
    }

    // Mount project's last states of the active section
    $.initSection('tabs', [] )
    $.initSection('activeConsole', [] )
    $.initSection('activeElement', null )

    // Load project dependencies
    await $.getDependencies()
  }

  async function initAPIWS(){
    
  }
  async function initAPISection(){
    // Initialize project's API Test section
    State.sections.push('API')
    // Default section
    if( !State.activeSection ) State.activeSection = 'API'
    // API Test workspace
    await initAPIWS()

    // Fetch API data

    State.API.collections = [{ name: 'Wigo' }, { name: 'Multipple' }]
    State.API.environments = [{ name: 'Wigo Dev' }, { name: 'Wigo Pro' }]
    
    // Mount project's last states of the active section
    $.initSection('tabs', [] )
    $.initSection('activeConsole', [] )
    $.initSection('activeElement', null )
  }

  async function initSocketWS(){
    
  }
  async function initSocketSection(){
    // Initialize project's Sockets Test section
    State.sections.push('Socket')
    // Default section
    if( !State.activeSection ) State.activeSection = 'Socket'
    // Socket Test workspace
    await initSocketWS()

    // Mount project's last states of the active section
    $.initSection('tabs', [] )
    $.initSection('activeConsole', [] )
    $.initSection('activeElement', null )
  }
}