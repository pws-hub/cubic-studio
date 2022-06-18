
import PStore from 'all-localstorage'

export default $ => {

  $.fs = false
  $.pm = false
  $.pstore = false

  const State = $.state

  $.initialProjectWS = async () => {
    // Declare filesystem I/O handler at the project's current working directory
    if( $.state.project.specs.code ){
      const cwd = $.state.project.specs.code.directory

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

    // Close active ResetProject modal
    $.onShowResetProjectToggle( false )
    // Console to previous show/hide state
    $.state.showConsole = $.pstore.get('active-console')
  }
  $.getProject = async ( workspaceId, projectId ) => {
    try {
      const { error, message, project } = await RGet(`/workspaces/${workspaceId}/projects/${projectId}`)
      if( error ) throw new Error( message )
      
      $.state.project = project
      // locale store for only this project
      $.pstore = new PStore({ prefix: `cs-${project.name}`, encrypt: true })
      await $.SetupProject()
    }
    catch( error ){
      console.log('Failed retreiving project: ', error )
      $.state.project = null

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

    $.state.Code.directories = await $.fs.directory( path || null, dirOptions )
    $.state.Code = newObject( $.state.Code )
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
    
    $.state.Code.dependencies = deps
    $.state.Code = newObject( $.state.Code )
  }
  $.SetupProject = async flag => {
    try {
      if( flag ) $.flag = flag

      // Initialize project's UI workspace
      await $.initialProjectWS()
      
      // Init Code related project's section
      $.hasCodeSection() && await initCodeSection()
      // Init API related project's section
      $.hasAPISection() && await initAPISection()


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
    $.pstore.flush(`cs-${$.state.project.name}`)
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
      url = `/workspaces/${$.state.workspace.workspaceId}/projects/${$.state.project.projectId}`,
      { error, message } = await await RDelete( url )

      if( error ) throw new Error( message )
    }
    catch( error ){}
    await delay(3)
    
    // Clear open tabs
    $.ongoing({ headline: 'Clearing project workspace' })
    $.state.project = false
    
    // Reset operators
    $.fs = false
    $.pm = false
    $.packager = false
    $.emulator = false
    await delay(2)
    
    // Move back to workspace
    $.ongoing( false )
    navigate(`/workspace/${$.state.workspace.workspaceId}`)
  }

  async function initCodeSection(){
    
    $.state.sections.push('Code')
    $.setStateDirty('sections')
    let AUTORUN = true

    // Load project directory
    await $.getDirectory()

    // Project has no directory: Setup or Import (Depending of flag value)
    if( isEmpty( $.state.Code.directories ) ){
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
      await $.pm[ action ]( $.state.project, ( error, stats ) => {
        
        
          
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
    else {
      // Mount project's last states
      $.state.tabs = $.pstore.get('tabs') || []
      $.state.activeElement = $.pstore.get('active-element') || null
      
      // Reload cached emulator state of this project
      const cachedEMImage = $.pstore.get('emulator')
      if( AUTORUN && cachedEMImage )
        window.env == 'production' ? 
                      $.ReloadEmulator() // Reload backend process
                      : $.RunEmulator() // Connect frontend to process or run process if not available
    }

    // Load project dependencies
    await $.getDependencies()
  }
  async function initAPISection(){
    
    $.state.sections.push('API')

  }
}