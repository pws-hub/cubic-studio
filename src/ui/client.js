
import './globals'
import App from './views/App'
import Home from './views/pages/Home'
import Project from './views/pages/Project'
import Workspace from './views/pages/Workspace'
import Locales from './json/languages.json'

import Overwride from '../lib/Overwride'
import RequestClient from '../lib/Connect/CARClient'
import FileSystemClient from '../lib/Connect/FSTClient'
import IProcessClient from '../lib/Connect/IPTClient'


function getInitialScope(){

	function resolveScope( initStr ){

		const
		b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
		[ str, salt ] = initStr.split('$')

		if( !str || !salt ) return false
		let result = '', i = 0

		// Remove the unknown striing portion
		initStr = str.replace( new RegExp( salt.split('').reverse().join(''), 'g' ), '')
									.split('').reverse().join('')

		do {
			let
			b1 = b64.indexOf( initStr.charAt(i++) ),
			b2 = b64.indexOf( initStr.charAt(i++) ),
			b3 = b64.indexOf( initStr.charAt(i++) ),
			b4 = b64.indexOf( initStr.charAt(i++) ),

			a = ( ( b1 & 0x3F ) << 2 ) | ( ( b2 >> 4 ) & 0x3 ),
			b = ( ( b2 & 0xF  ) << 4 ) | ( ( b3 >> 2 ) & 0xF ),
			c = ( ( b3 & 0x3  ) << 6 ) | ( b4 & 0x3F )

			result += String.fromCharCode( a )+( b ? String.fromCharCode( b ) : '' )+( c ? String.fromCharCode( c ) : '' )
		}
		while( i < initStr.length )

		try { return JSON.parse( result ) }
		catch( error ){
			console.log('Failed Parsing Init Scope String: ', error )
			return false
		}
	}

	return new Promise( ( resolve, reject ) => {
			// Scope set at www. page rendereing
			let data = uiStore.get('init')
			if( data ) return resolve( resolveScope( data ) )

			// Explicitly fetch the scope
			fetch('/init')
					.then( res => { return !res.ok ? reject( res.status ) : res.json() } )
					.then( res => resolve( resolveScope( res ) ) )
	} )
}

function initScreenSet( e ){

  const
  $window =  $( e && e.target ? this : document ),
  width = $window.width(),
  height = $window.height()

  let media = 'xs'

  if( width >= 576 ) media = 'sm'
  if( width >= 768 ) media = 'md'
  if( width >= 992 ) media = 'lg'
  if( width >= 1200 ) media = 'xl'
  
  GState.set( 'screen', { media, width, height } )
}

async function handleLocale(){
	// Init locale language handlers
	function initLocale( locale ){
		return new Promise( ( resolve, reject ) => {
				const [ language, variant ] = locale.split('-')
				// Fetch another dictionary
				try {
					const dictionary = require('./json/locales/'+ language +'.json')
					GState.set( 'locale', { language, variant, dictionary } )
					resolve()
				}
				catch( error ){ reject( error ) }
		} )
	}

	try { await initLocale( navigator.language ) }
	catch( error ){
		console.error('[CLIENT-LOAD]- Failed to init Locale language: ', error )
		// Fetch en-US dictionary by default
		await initLocale('en-US')
	}
		
	/* Locale text translation method from
		JS script. Helps when the need of transation
		is out of a component
	*/
	GState.set( 'locales', Locales )
	window.Locale = text => {
		/* Static translation
			{
				...
				"User account": "Compte utilisateur",
				...
			}
		*/
		const { language, variant, dictionary } = GState.get('locale')

		let translation = dictionary[ text ] || text

		/* Select defined variance
			{
				...
				"Buy now": {
						"US": "Buy now",
						"UK": "Purchase now",
						"default": "US"
				}
				...
			}
		*/
		if( typeof translation == 'object' ){
			// Specified variant defined
			if( variant
					&& translation.hasOwnProperty( variant ) )
				translation = translation[ variant ]

			// User default define variant
			else {
				const defaultVariant = translation['default']

				translation = ( defaultVariant
												&& translation[ defaultVariant ] )
											|| text
			}
		}

		return translation
	}

	// Language Switcher
	GState
	.define('locale')
	.action( 'switch', async locale => {
		await initLocale( locale )
		await updateUser({ 'language': locale }, 'settings' )
	} )
}

async function fetchWorkspaces(){
	try {
		const { error, message, workspaces } = await RGet('/workspaces')
		if( error ) throw new Error( message )
		
		GState.set('workspaces', workspaces )
		return
	}
	catch( error ){ 
		console.log('Failed fetching workspaces: ', error ) 
		return false
	}
}

;( async () => {
  try {
    const { 
			env, mode, 
			namespaces,
			isConnected,
			user
		} = await getInitialScope()
		
		window.env = env
		window.mode = mode

    /*----------------------------------------------------------------*/
		// Set of overwridden process functions
		window.___ = Overwride({ env })

    /*----------------------------------------------------------------*/
		// Default global states
		GState.set('theme', 'dark')
		GState.set('isConnected', isConnected )
		GState.set('user', user )

    /*----------------------------------------------------------------*/
    /* Initial Workspace State: 
      - Context: Use for extensions & user activities tracking by page
                  @params: 
                    - accountType(Admin, Instructor, Learner)
                    - page( route name )
                    - event( name, ID )
      - Layout: Display or main blocks of the workspace
            @params:
              - mode: UI segmentation mode
                  - qs (Quater state)
                  - hs (Half section)
                  - ns (No-section)
    */
    const wsStoreAttr = 'ws-studio'
    
    GState.set('ws', { mode: 'ns', ...(uiStore.get( wsStoreAttr ) || {}) })
    GState
    .define('ws')
    // Update workspace Layout
    .action( 'layout', newState => {

      const recentState = GState.get('ws')
      if( newState.mode == 'ns' && recentState.mode !== 'ns' )
        newState.previousMode = recentState.mode

      else if( newState.mode == 'auto' )
        newState.mode = recentState.previousMode || 'qs'
      
      newState = Object.assign( {}, recentState, newState )

      GState.dirty( 'ws', newState )
      uiStore.set( wsStoreAttr, newState )
    } )
    // Set/Define workspace context
    .action( 'context', newState => {

      const wsState = GState.get('ws')
      wsState.context = Object.assign( wsState.context || {}, newState, { accountType } )

      GState.dirty( 'ws', wsState )
    } )

    /*----------------------------------------------------------------*/
    // Initial Console State
    GState.set( 'logs', [] )
    GState
    .define('console')
    .action( 'log', log => {
			const logs = GState.get('logs')
			logs.push( log )
      GState.dirty( 'logs', logs )
    } )

    /*----------------------------------------------------------------*/
    // Initial media window sizes
    initScreenSet()
    // Watch screen resize for responsiveness updates
    $(window).on( 'resize', initScreenSet )

		/*----------------------------------------------------------------*/
		// Locale translation
		handleLocale()

		/*----------------------------------------------------------------*/
		// Init Fontend - Backend communication channels
		if( isConnected ){
			// Request Handler
			await RequestClient( namespaces.CAR, user )

			// Internal Processes Manager
			window.IProcess = await IProcessClient( namespaces.IPT )

			// FileSystem Manager
			window.FileSystem = await FileSystemClient( namespaces.FST )
			// Init Global FileSystem Explorer Interface
			window.FSExplorer = await FileSystem.init( 'explorer', { ignore: false, debug: true } )
		}
		
		/*----------------------------------------------------------------*/
		// Initialize workspaces
		GState.set('workspaces', null )

		if( isConnected ){
			GState
			.define('workspaces')
			.action( 'refresh', async () => await fetchWorkspaces() )
			.action( 'get', id => {
				const list = GState.get('workspaces') || []

				for( let w = 0; w < list.length; w++ )
					if( list[w].workspaceId == id )
						return list[w]

				return false
			} )

			await fetchWorkspaces()
		}
		
		/*----------------------------------------------------------------*/
		// Define routes
		let Routes = [
			{ name: 'home', path: '/', component: Home } 
		]

		if( isConnected )
			Routes = [
				...Routes,
				{ name: 'workspace', path: '/workspace/:id', component: Workspace },
				{ name: 'project', path: '/workspace/:id/:project', component: Project }
			]

		/*----------------------------------------------------------------*/
		// Initialize application
		App.renderSync({ Routes })
				.replace( document.querySelector('#root') )
  }
  catch( error ){ console.error('[CLIENT-LOAD] - App Initialization Failed: ', error ) }
} )()