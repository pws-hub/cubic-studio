
import './globals/window'
import App from './views/App.marko'
import Home from './views/Home.marko'
import Project from './views/Project'
import Workspace from './views/Workspace.marko'
import Locales from '../json/languages.json'


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

async function handleLocale(){
	// Init locale language handlers
	function initLocale( locale ){
		return new Promise( ( resolve, reject ) => {
				const [ language, variant ] = locale.split('-')
				// Fetch another dictionary
				try {
					const dictionary = require('../json/locales/'+ language +'.json')
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

;( async () => {
  try {
    const { env } = await getInitialScope()

		handleLocale()

		GState.set('theme', false )
		GState.set('workspaces', [
			{
				id: 1234567890,
				type: 'personal',
				name: 'Personal Space',
				members: [],
				collections: [],
				environments: [],
				task: [],
				state: {}
			},
			{
				id: 1234567890,
				type: 'team',
				name: 'Multipple Dev',
				members: [],
				collections: [],
				environments: [],
				task: [],
				state: {}
			}
		])

    /*----------------------------------------------------------------*/
		// Handle access to marketplace UI
		GState.set('marketplace', uiStore.get('active-marketplace') )
		GState
		.define('marketplace')
		.action( 'open', payload => {
			GState.set('marketplace', payload || true )
			uiStore.set('active-marketplace', payload || true )
			
			// Open aside when no active extension
			!Object.keys( GState.get('activeExtensions') ).length
			&& GState.workspace.layout({ mode: 'hs' })
		} )
		.action( 'close', () => {
			GState.set('marketplace', false )
			uiStore.clear('active-marketplace')
			
			// Close aside when no active extension
			!Object.keys( GState.get('activeExtensions') ).length
			&& GState.workspace.layout({ mode: 'ns' })
		} )

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
    
    GState.set('workspace', { mode: 'ns', ...(uiStore.get( wsStoreAttr ) || {}) })
    GState
    .define('workspace')
    // Update workspace Layout
    .action( 'layout', newState => {

      const recentState = GState.get('workspace')
      if( newState.mode == 'ns' && recentState.mode !== 'ns' )
        newState.previousMode = recentState.mode

      else if( newState.mode == 'auto' )
        newState.mode = recentState.previousMode || 'qs'
      
      newState = Object.assign( {}, recentState, newState )

      GState.dirty( 'workspace', newState )
      uiStore.set( wsStoreAttr, newState )
    } )
    // Set/Define workspace context
    .action( 'context', newState => {

      const wsState = GState.get('workspace')
      wsState.context = Object.assign( wsState.context || {}, newState, { accountType } )

      GState.dirty( 'workspace', wsState )
    } )

		/*----------------------------------------------------------------*/
		// Handle API server requests
		window.Request = ( endpoint, method, data ) => {

			if( !apiRequest || isEmpty( apiRequest ) ) return

			return new Promise( ( resolve, reject ) => {
				const options = {
					method: method || 'GET',
					headers: {
						...apiRequest.headers,
						'Content-Type': 'application/json'
					}
				}
				
				if( data ) options.body = JSON.stringify( data )
				
				fetch( endpoint, options )
						.then( res => res.json() )
						.then( resolve )
						.catch( reject )
			} )
		}

		const Routes = [
			{ name: 'home', path: '/', component: Home },
			{ name: 'workspace', path: '/workspace/:id', component: Workspace },
			{ name: 'project', path: '/workspace/:id/:project', component: Project }
		]
		
		App.renderSync({ Routes })
				.replace( document.querySelector('#root') )
  }
  catch( error ){ console.error('[CLIENT-LOAD] - App Initialization Failed: ', error ) }
} )()