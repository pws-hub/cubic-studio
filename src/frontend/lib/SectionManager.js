import PStore from 'all-localstorage'

export default function SectionManager( __ ){

  __.fs = false
  __.pstore = false

  const State = __.state

  async function initCodeWS(){
    // Declare filesystem I/O handler at the project's current working directory
    if( !State.project.specs.code ) return
    const cwd = State.project.specs.code.directory

    __.fs = await window.FileSystem.init( 'project', { cwd, debug: true } )

    // Get project environment configuration
    State.env = await __.fs.readFile( '.cubic', { encoding: 'json' } )
    // Declare Project's background Process Manager
    __.pm = await window.IProcess.create({ debug: true })

    // Watch external/background operations on this directory
    let wait = 0
    __.fs.watch( async ( event, path, stats ) => {
      debugLog(`[DIRECTORY Event] ${event}: ${path}`, stats )

      switch( event ) {
        // New file/dir added: Refresh directory tree
        case 'add':
        case 'addDir': wait && clearTimeout( wait )
                        await __.getDirectory()
            break
        /**
         * Wait for `add` event to conclude file/dir moved:
         *  In that case `add event` will refresh the directory.
         *  otherwise, conclude `delete`
         */
        case 'unlink': wait = setTimeout( async () => await __.getDirectory(), 2000 ); break

      }
    } )
  }
  async function initCode(){
    // Initialize project's coding section
    State.sections.push('Code')
    // Default section
    !State.activeSection && __.setState('activeSection', 'Code')
    // Coding workspace
    await initCodeWS()

    const AUTORUN = true

    // Load project directory
    await __.getDirectory()

    // Project has no directory: Setup or Import (Depending of flag value)
    if( isEmpty( State.Code.directories ) ) {
      if( !__.flag ) {
        // TODO: Prompt modal for user to select project directory or setup new
        __.onShowResetProjectToggle( true )
        return
      }
    }
    // Import if project have no package.json file at the directory root
    else if( !( await __.fs.readFile( 'package.json', { encoding: 'json' } ) ) )
      __.flag = 'import'

    // Flag when something fishing about the setup
    if( ['setup', 'import'].includes( __.flag ) ) {
      // Importing project from specified repo (import) or setup new (default)
      const action = __.flag || 'setup'

      // Setup a completely new project
      __.ongoing({ headline: 'Setting up the project' })
      await delay(3)
      await __.pm[ action ]( State.project, ( error, stats ) => {
        if( error ) {
          // TODO: Manage process exception errors
          console.log('--Progress Error: ', error )
          __.ongoing({ error: typeof error == 'object' ? error.message : error })
          return
        }

        // TODO: Display progression stats
        __.ongoing({ headline: `[${stats.percent}%] ${stats.message}` })
        __.progression( stats )
      } )

      debugLog('-- Completed indeed --')

      // Automatically run project in 3 second
      await delay(3)
      __.ongoing( false )
      AUTORUN && __.DeviceOperator('start', true )
    }
    // Reload cached device state of this project
    else {
      const cachedEMImage = __.pstore.get('device')
      if( AUTORUN && cachedEMImage )
        window.env == 'production' ?
                      __.DeviceOperator('restart') // Reload backend process
                      : __.DeviceOperator('start') // Connect frontend to process or run process if not available
    }

    // Load project dependencies
    await __.getDependencies('Code')
  }

  async function initAPIWS(){

  }
  async function initAPI(){
    // Initialize project's API Test section
    State.sections.push('API')
    // Default section
    !State.activeSection && __.setState('activeSection', 'API')
    // API Test workspace
    await initAPIWS()

    // Fetch API data

    State.API.collections = [{ name: 'Wigo' }, { name: 'Multipple' }]
    State.API.environments = [{ name: 'Wigo Dev' }, { name: 'Wigo Pro' }]
  }

  async function initSocketWS(){

  }
  async function initSocket(){
    // Initialize project's Sockets Test section
    State.sections.push('Socket')
    // Default section
    !State.activeSection && __.setState('activeSection', 'Socket')
    // Socket Test workspace
    await initSocketWS()
  }

  async function initDocWS(){

  }
  async function initDoc(){
    // Initialize project's Documentation Editor section
    State.sections.push('Documentation')
    // Default section
    !State.activeSection && __.setState('activeSection', 'Documentation')
    // Documentation Editor workspace
    await initDocWS()

    // Load project dependencies
    await __.getDependencies('Documentation')
  }

  async function initRoadmapWS(){

  }
  async function initRoadmap(){
    // Initialize project's Roadmap section
    State.sections.push('Roadmap')
    // Default section
    !State.activeSection && __.setState('activeSection', 'Roadmap')
    // Roadmap workspace
    await initRoadmapWS()
  }

  this.hasRoadmap = () => { return State.project && State.project.specs.roadmap && !isEmpty( State.project.specs.roadmap ) }
  this.hasCode = () => { return State.project && State.project.specs.code && !isEmpty( State.project.specs.code ) }
  this.hasAPI = () => { return State.project && Array.isArray( State.project.specs.API ) }
  this.hasSocket = () => { return State.project && Array.isArray( State.project.specs.sockets ) }
  this.hasUnit = () => { return State.project && Array.isArray( State.project.specs.units ) }
  this.hasDoc = () => { return State.project && Array.isArray( State.project.specs.documentations ) }

  this.init = async () => {
    // Locale store for only this project
    __.pstore = new PStore({ prefix: `cs-${State.project.name}`, encrypt: true })

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
  this.define = ( key, defaultValue = null ) => {
    this.set( key, __.pstore.get(`${State.activeSection}:${key}`) || defaultValue )
  }
  this.set = ( key, value ) => {
    // if( !State[ State.activeSection ] ) return

    State[ State.activeSection ][ key ] = value
    __.setStateDirty( State.activeSection )
    __.pstore.set(`${State.activeSection}:${key}`, value )
  }

  this.get = ( key, section = null ) => {
    return key !== undefined && State[ section || State.activeSection ] ?
        State[ section || State.activeSection ][ key ] // Specific field of the section
        : State[ section || State.activeSection ] // All section set
  }
  this.clear = key => {
    // Specific field of the section
    if( key ) {
      State[ State.activeSection ][ key ] = null
      __.pstore.clear(`${State.activeSection}:${key}`)
    }
    else State[ State.activeSection ] = {}

    __.setStateDirty( State.activeSection )
  }

  this.applyTabChange = arg => {
    // Apply and reflect changes on tabs
    if( typeof arg !== 'object' ) return

    let tabs = []
    Array.isArray( arg ) ?
            tabs = newObject( arg ) // Update the whole tabs list
            // Change on single tab
            : tabs = (this.get('tabs') || []).map( tab => {
              // Tab already exist
              if( tab.path === arg.path )
                return arg

              return tab
            } )

    this.set('tabs', tabs )
  }
}