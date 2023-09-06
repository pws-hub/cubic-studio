
export default function SectionManager( Self ){

  Self.fs = false

  const State = Self.state

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
  async function initCode(){
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
    // define('tabs', [] )
    // define('activeConsole', [] )
    // define('activeElement', null )

    // Load project dependencies
    await Self.getDependencies('Code')
  }

  async function initAPIWS(){

  }
  async function initAPI(){
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
    // define('tabs', [] )
    // define('activeConsole', [] )
    // define('activeElement', null )
  }

  async function initSocketWS(){

  }
  async function initSocket(){
    // Initialize project's Sockets Test section
    State.sections.push('Socket')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'Socket')
    // Socket Test workspace
    await initSocketWS()

    // Mount project's last states of the active section
    // define('tabs', [] )
    // define('activeConsole', [] )
    // define('activeElement', null )
  }

  async function initDocWS(){

  }
  async function initDoc(){
    // Initialize project's Documentation Editor section
    State.sections.push('Documentation')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'Documentation')
    // Documentation Editor workspace
    await initDocWS()

    // Mount project's last states of the active section
    // define('activeElement', null )

    // Load project dependencies
    await Self.getDependencies('Documentation')
  }

  async function initRoadmapWS(){

  }
  async function initRoadmap(){
    // Initialize project's Roadmap section
    State.sections.push('Roadmap')
    // Default section
    !State.activeSection && Self.setState('activeSection', 'Roadmap')
    // Roadmap workspace
    await initRoadmapWS()
  }

  this.hasRoadmap = () => { return State.project && State.project.specs.roadmap && !isEmpty( State.project.specs.roadmap ) }
  this.hasCode = () => { return State.project && State.project.specs.code && !isEmpty( State.project.specs.code ) }
  this.hasAPI = () => { return State.project && Array.isArray( State.project.specs.API ) }
  this.hasSocket = () => { return State.project && Array.isArray( State.project.specs.sockets ) }
  this.hasUnit = () => { return State.project && Array.isArray( State.project.specs.units ) }
  this.hasDoc = () => { return State.project && Array.isArray( State.project.specs.documentations ) }

  // define = ( key, defaultValue = null ) => {
  //   this.set( key, Self.pstore.get( key ) || defaultValue )
  // }

  this.init = async () => {
    // Init roadmap related project's section
    this.hasRoadmap() && await initRoadmap()
    // Init Code related project's section
    this.hasCode() && await initCode()
    // Init API related project's section
    this.hasAPI() && await initAPI()
    // Init Socket related project's section
    this.hasSocket() && await initSocket()
    // Init Documentation related project's section
    this.hasDoc() && await initDoc()
  }

  this.set = ( key, value ) => {
    // if( !State[ State.activeSection ] ) return

    State[ State.activeSection ][ key ] = value
    Self.setStateDirty( State.activeSection )
    Self.pstore.set( key, value )
  }
  this.get = key => {
    return key !== undefined && State[ State.activeSection ] ?
        State[ State.activeSection ][ key ] // Specific field of the section
        : State[ State.activeSection ] // All section set
  }
  this.clear = key => {
    // Specific field of the section
    if( key ) {
      State[ State.activeSection ][ key ] = null
      Self.pstore.clear( key )
    }
    else State[ State.activeSection ] = {}

    Self.setStateDirty( State.activeSection )
  }
}