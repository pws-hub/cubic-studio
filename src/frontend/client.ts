import type { InitialScope } from '../types'
import './globals'

import Sync from './lib/SyncClient'
import Override from './lib/Override'
import RequestClient from './lib/CARClient'
import FileSystemClient from './lib/FSTClient'
import IProcessClient from './lib/IPTClient'
import Locales from './json/languages.json'
// @ts-ignore
import App from './views/App'
// @ts-ignore
import Home from 'pages/Home'
// @ts-ignore
import Project from 'pages/Project'
// @ts-ignore
import Workspace from 'pages/Workspace'

// import LPSTest from 'test/lps.client.test'
// import ProcessManagerTest from 'test/fpm.test'

function getInitialScope(): Promise<InitialScope> {

	function resolveScope( initStr: string ){
		const
		b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
		[ str, salt ] = initStr.split('$')

		if( !str || !salt ) return false
		let result = '', i = 0

		// Remove the unknown striing portion
		initStr = str.replace( new RegExp( salt.split('').reverse().join(''), 'g' ), '')
									.split('').reverse().join('')

		do {
			const
			b1 = b64.indexOf( initStr.charAt(i++) ),
			b2 = b64.indexOf( initStr.charAt(i++) ),
			b3 = b64.indexOf( initStr.charAt(i++) ),
			b4 = b64.indexOf( initStr.charAt(i++) ),

			a = ( ( b1 & 0x3F ) << 2 ) | ( ( b2 >> 4 ) & 0x3 ),
			b = ( ( b2 & 0xF ) << 4 ) | ( ( b3 >> 2 ) & 0xF ),
			c = ( ( b3 & 0x3 ) << 6 ) | ( b4 & 0x3F )

			result += String.fromCharCode( a )+( b ? String.fromCharCode( b ) : '' )+( c ? String.fromCharCode( c ) : '' )
		}
		while( i < initStr.length )

		try { return JSON.parse( result ) }
		catch( error ) {
			console.log('Failed Parsing Init Scope String: ', error )
			return false
		}
	}

	return new Promise( ( resolve, reject ) => {
			// Scope set at www. page rendereing
			const data = window.Store.get('init')
			if( data ) return resolve( resolveScope( data ) )

			// Explicitly fetch the scope
			fetch('/init')
					.then( res => { return !res.ok ? reject( res.status ) : res.json() } )
					.then( ({ data }) => resolve( resolveScope( data ) ) )
	} )
}

function initScreenSet( e?: Event ){
  const
  $window = window.$( e && e.target ? this : document ),
  width = $window.width(),
  height = $window.height()

  let media = 'xs'

  if( width >= 576 ) media = 'sm'
  if( width >= 768 ) media = 'md'
  if( width >= 992 ) media = 'lg'
  if( width >= 1200 ) media = 'xl'

  window.GState.set( 'screen', { media, width, height } )
}

async function handleLocale(): Promise<void>{
	// Init locale language handlers
	function initLocale( locale: string ): Promise<void>{
		return new Promise( ( resolve, reject ) => {
				const [ language, variant ] = locale.split('-')
				// Fetch another dictionary
				try {
					const dictionary = require(`./json/locales/${ language }.json`)
					window.GState.set( 'locale', { language, variant, dictionary } )

					resolve()
				}
				catch( error ) { reject( error ) }
		} )
	}

	try { await initLocale( navigator.language ) }
	catch( error ) {
		console.error('[CLIENT-LOAD]- Failed to init Locale language: ', error )
		// Fetch en-US dictionary by default
		await initLocale('en-US')
	}

	/*
	 * Locale text translation method from
	 * JS script. Helps when the need of transation
	 * is out of a component
	 */
	window.GState.set( 'locales', Locales )
	window.Locale = text => {
		/*
		 * Static translation
		 * {
		 * ...
		 * "User account": "Compte utilisateur",
		 * ...
		 * }
		 */
		const { language, variant, dictionary } = window.GState.get('locale')

		let translation = dictionary[ text ] || text

		/*
		 * Select defined variance
		 * {
		 * ...
		 * "Buy now": {
		 *	 "US": "Buy now",
		 *	 "UK": "Purchase now",
		 *	 "default": "US"
		 * }
		 * ...
		 * }
		 */
		if( typeof translation == 'object' ) {
			// Specified variant defined
			if( variant
					&& translation[ variant ] )
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
	window.GState
	.define('locale')
	.action( 'switch', async locale => {
		await initLocale( locale )
		// await updateUser({ 'language': locale }, 'settings' )
	} )
}

async function fetchWorkspaces(): Promise<boolean>{
	try {
		const { error, message, workspaces } = await window.RGet('/workspaces')
		if( error ) throw new Error( message )

		window.GState.set('workspaces', workspaces )
		return true
	}
	catch( error ) {
		console.log('Failed fetching workspaces: ', error )
		window.GState.set('workspaces', [] )
		return false
	}
}

async function Client(){
	// Init client
	const {
		env,
		asm,
		mode,
		instance,
		providers,
		namespaces,
		isConnected,
		atoken,
		user
	} = await getInitialScope()

	window.env = env
	window.asm = asm
	window.mode = mode
	window.instance = instance
	window.providers = providers

	/* ----------------------------------------------------------------*/
	// Set of overwridden process functions
	window.___ = Override({ env })

	/* ----------------------------------------------------------------*/
	// Default global states
	window.GState.set('theme', 'dark')
	window.GState.set('isConnected', isConnected )
	window.GState.set('accessToken', atoken )
	window.GState.set('user', user )

	/* ----------------------------------------------------------------*/
	/*
	 * Initial Workspace State:
	 * - Context: Use for extensions & user activities tracking by page
	 *				 @params:
	 *					 - accountType(Admin, Instructor, Learner)
	 *					 - page( route name )
	 *					 - event( name, ID )
	 * - Layout: Display or main blocks of the workspace
	 *	 @params:
	 *		 - mode: UI segmentation mode
	 *				 - qs (Quater state)
	 *				 - hs (Half section)
	 *				 - ns (No-section)
	 */
	const 
	wsStoreAttr = 'ws-studio',
	accountType = 'AMDIN'

	window.GState.set('ws', { mode: 'ns', ...(window.Store.get( wsStoreAttr ) || {}) })
	window.GState
	.define('ws')
	// Update workspace Layout
	.action( 'layout', newState => {

		const recentState = window.GState.get('ws')
		if( newState.mode == 'ns' && recentState.mode !== 'ns' )
			newState.previousMode = recentState.mode

		else if( newState.mode == 'auto' )
			newState.mode = recentState.previousMode || 'qs'

		newState = Object.assign( {}, recentState, newState )

		window.GState.dirty( 'ws', newState )
		window.Store.set( wsStoreAttr, newState )
	} )
	// Set/Define workspace context
	.action( 'context', newState => {

		const wsState = window.GState.get('ws')
		wsState.context = Object.assign( wsState.context || {}, newState, { accountType } )

		window.GState.dirty( 'ws', wsState )
	} )

	/* ----------------------------------------------------------------*/
	// Initial Console State
	window.GState.set( 'logs', [] )
	window.GState
	.define('console')
	.action( 'log', log => {
		const logs = window.GState.get('logs')
		logs.push( log )

		window.GState.dirty( 'logs', logs )
	} )
	.action( 'clear', () => window.GState.dirty( 'logs', [] ) )

	/* ----------------------------------------------------------------*/
	// Initial media window sizes
	initScreenSet()
	// Watch screen resize for responsiveness updates
	window.$(window).on('resize', initScreenSet )

	/* ----------------------------------------------------------------*/
	// Locale translation
	handleLocale()

	/* ----------------------------------------------------------------*/
	// Init Fontend - Backend communication channels
	if( isConnected ) {
		// Request Handler
		atoken && await RequestClient( namespaces.CAR, atoken )

		// Internal Processes Manager
		window.IProcess = await IProcessClient( namespaces.IPT )

		// FileSystem Manager
		window.FSystem = await FileSystemClient( namespaces.FST )
		// Init Global FileSystem Explorer Interface
		window.FSExplorer = await window.FSystem.init('explorer', { ignore: false, debug: true })
	}

	/* ----------------------------------------------------------------*/
	// Initialize workspaces
	window.GState.set('workspaces', null )

	if( isConnected ) {
		window.GState
		.define('workspaces')
		.action( 'refresh', async () => await fetchWorkspaces() )
		.action( 'get', id => {
			const list = window.GState.get('workspaces') || []

			for( let w = 0; w < list.length; w++ )
				if( list[w].workspaceId == id )
					return list[w]

			return false
		} )

		await fetchWorkspaces()
	}

	/* ----------------------------------------------------------------*/
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

	/* ----------------------------------------------------------------*/
	// Initialize application
	App.renderSync({ Routes }).prependTo( document.body )
}

( async () => {
  try {
		// Cloud-Locale Synchronization Manager
		await Sync()
		// Initailize Client
		await Client()

		/*
		 * Test Scripts
		 * await LPSTest()
		 * await ProcessManagerTest()
		 */
  }
  catch( error ) { console.error('[CLIENT] - App Initialization Failed: ', error ) }
} )()