
import PStore from 'all-localstorage'
import { Project, ProjectState } from '../../types/project'
import { IProcessHandler } from './IPTClient'

export default class SectionManager {
  private __: Marko.Component
  private State: ProjectState

  constructor( __: Marko.Component ){
    this.__ = __
    this.State = __.state as ProjectState
  }

  private async initCodeWS(){
    // Declare filesystem I/O handler at the project's current working directory
    if( !this.State.project?.specs.code ) return
    const cwd = this.State.project.specs.code.directory

    this.__.fs = await window.FSystem.init( 'project', { cwd, debug: true } )

    // Get project environment configuration
    this.State.env = await this.__.fs.readFile( '.cubic', { encoding: 'json' } )
    // Declare Project's background Process Manager
    this.__.pm = await window.IProcess.create({ debug: true })

    // Watch external/background operations on this directory
    let wait: NodeJS.Timeout
    this.__.fs.watch( async ( event, path, stats ) => {
      window.debugLog(`[DIRECTORY Event] ${event}: ${path}`, stats )

      switch( event ) {
        // New file/dir added: Refresh directory tree
        case 'add':
        case 'addDir': wait && clearTimeout( wait )
                        await this.__.getDirectory()
            break
        /**
         * Wait for `add` event to conclude file/dir moved:
         *  In that case `add event` will refresh the directory.
         *  otherwise, conclude `delete`
         */
        case 'unlink': wait = setTimeout( async () => await this.__.getDirectory(), 2000 ); break
      }
    } )
  }
  private async initCode(){
    // Initialize project's coding section
    this.State.sections.push('Code')
    // Default section
    if( !this.State.activeSection ) this.State.activeSection == 'Code'
    // Coding workspace
    await this.initCodeWS()

    const AUTORUN = true

    // Load project directory
    await this.__.getDirectory()

    // Project has no directory: Setup or Import (Depending of flag value)
    if( window.isEmpty( this.State.Code.directories ) ) {
      if( !this.__.flag ) {
        // TODO: Prompt modal for user to select project directory or setup new
        this.__.onShowResetProjectToggle( true )
        return
      }
    }
    // Import if project have no package.json file at the directory root
    else if( !( await this.__.fs.readFile( 'package.json', { encoding: 'json' } ) ) )
      this.__.flag = 'import'

    // Flag when something fishing about the setup
    if( ['setup', 'import'].includes( this.__.flag as string ) ) {
      // Importing project from specified repo (import) or setup new (default)
      const action = this.__.flag || 'setup'

      // Setup a completely new project
      this.__.ongoing({ headline: 'Setting up the project' })

      await window.delay(3)
      await ( this.__.pm as IProcessHandler )[ action ]( this.State.project as Project, ( error: Error | string | boolean, stats ) => {
        if( error ) {
          // TODO: Manage process exception errors
          console.log('--Progress Error: ', error )
          this.__.ongoing({ error: typeof error == 'object' ? error.message : error })
          return
        }

        // TODO: Display progression stats
        this.__.ongoing({ headline: `[${stats.percent}%] ${stats.message}` })
        this.__.progression( stats )
      } )

      window.debugLog('-- Completed indeed --')

      // Automatically run project in 3 second
      await window.delay(3)
      this.__.ongoing( false )
      AUTORUN && this.__.DeviceOperator('start', true )
    }
    // Reload cached device state of this project
    else {
      const cachedEMImage = this.__.pstore.get('device')
      if( AUTORUN && cachedEMImage )
        window.env == 'production' ?
                      this.__.DeviceOperator('restart') // Reload backend process
                      : this.__.DeviceOperator('start') // Connect frontend to process or run process if not available
    }

    // Load project dependencies
    await this.__.getDependencies('Code')
  }

  private async initAPIWS(){

  }
  private async initAPI(){
    // Initialize project's API Test section
    this.State.sections.push('API')
    // Default section
    !this.State.activeSection && this.__.setState({ activeSection: 'API' })
    // API Test workspace
    await this.initAPIWS()

    // Fetch API data

    this.State.API.collections = [{ name: 'Wigo' }, { name: 'Multipple' }]
    this.State.API.environments = [{ name: 'Wigo Dev' }, { name: 'Wigo Pro' }]
  }

  private async initSocketWS(){

  }
  private async initSocket(){
    // Initialize project's Sockets Test section
    this.State.sections.push('Socket')
    // Default section
    !this.State.activeSection && this.__.setState({ activeSection: 'Socket' })
    // Socket Test workspace
    await this.initSocketWS()
  }

  private async initDocWS(){

  }
  private async initDoc(){
    // Initialize project's Documentation Editor section
    this.State.sections.push('Documentation')
    // Default section
    !this.State.activeSection && this.__.setState({ activeSection: 'Documentation' })
    // Documentation Editor workspace
    await this.initDocWS()

    // Load project dependencies
    await this.__.getDependencies('Documentation')
  }

  private async initRoadmapWS(){

  }
  private async initRoadmap(){
    // Initialize project's Roadmap section
    this.State.sections.push('Roadmap')
    // Default section
    !this.State.activeSection && this.__.setState({ activeSection: 'Roadmap' })
    // Roadmap workspace
    await this.initRoadmapWS()
  }

  hasRoadmap(){ return this.State.project && this.State.project.specs.roadmap && !window.isEmpty( this.State.project.specs.roadmap ) }
  hasCode(){ return this.State.project && this.State.project.specs.code && !window.isEmpty( this.State.project.specs.code ) }
  hasAPI(){ return this.State.project && Array.isArray( this.State.project.specs.API ) }
  hasSocket(){ return this.State.project && Array.isArray( this.State.project.specs.sockets ) }
  hasUnit(){ return this.State.project && Array.isArray( this.State.project.specs.units ) }
  hasDoc(){ return this.State.project && Array.isArray( this.State.project.specs.documentations ) }

  init = async () => {
    if( !this.State.project ) return

    // Locale store for only this project
    this.__.pstore = new PStore({ prefix: `cs-${this.State.project.name}`, encrypt: true })

    // Init roadmap related project's section
    this.hasRoadmap() && await this.initRoadmap()
    // Init Code related project's section
    this.hasCode() && await this.initCode()
    // Init API related project's section
    this.hasAPI() && await this.initAPI()
    // Init Socket related project's section
    this.hasSocket() && await this.initSocket()
    // Init Documentation related project's section
    this.hasDoc() && await this.initDoc()
  }
  define( key: string, defaultValue: any = null ){
    this.set( key, this.__.pstore.get(`${this.State.activeSection}:${key}`) || defaultValue )
  }
  set( key: string, value: any ){
    if( !this.State.activeSection ) return
    // if( !this.State[ this.State.activeSection ] ) return

    this.State[ this.State.activeSection ][ key ] = value
    this.__.setStateDirty( this.State.activeSection as never )
    this.__.pstore.set(`${this.State.activeSection}:${key}`, value )
  }

  get( key: string, section?: string ){
    section = section || this.State.activeSection as string
    if( !section ) return null

    return this.State[ section ][ key ]
  }
  all( section?: string ){
    section = section || this.State.activeSection as string
    if( !section ) return null
    
    return this.State[ section ]
  }
  clear( key?: string ){
    // Specific field of the section
    if( !this.State.activeSection ) return

    if( key ) {
      this.State[ this.State.activeSection ][ key ] = null
      this.__.pstore.clear(`${this.State.activeSection}:${key}`)
    }
    else this.State[ this.State.activeSection ] = {}

    this.__.setStateDirty( this.State.activeSection as never )
  }
  open( element?: any ){
    // Open file, request, ...
    if( !element )
      return this.clear('activeElement')
    
    const activeElement = { ...element, active: true }
    this.set('activeElement', activeElement)

    // --- Next instructions reserved for only tabs related sections: Code, API, ...
    if( !this.get('tabs') ) return

    let
    isActive = false,
    focusIndex,
    counter = 0
    
    const tabs = this.get('tabs').map( tab => {
      // Tab already exist
      if( tab.path === element.path ){
        // Make tab active
        if( !tab.active ) tab.active = true
        // Changes state of this tab's content
        tab.hasChanges = element.hasChanges
          
        isActive = true
      }
      
      // Off previous active tab
      else if( tab.active ){
        delete tab.active
        focusIndex = counter
      }
      
      counter++
      return tab
    })
    
    // Add new active tab
    if( !isActive )
      focusIndex === undefined ?
                tabs.push( activeElement ) // At the end of the chain
                : tabs.splice( focusIndex + 1, 0, activeElement ) // Insert right after the last active tab

    this.set('tabs', tabs )
  }
  applyTabChange( arg: any ){
    // Apply and reflect changes on tabs
    if( typeof arg !== 'object' ) return

    let tabs = []
    Array.isArray( arg ) ?
            tabs = window.newObject( arg ) // Update the whole tabs list
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