
import IOF from 'iframe.io'
import { Install, Uninstall } from './installer'

export default function( e ){
  // Remove all previous listeners when iframe reloaded
  this.iof && this.iof.removeListeners()
  
  this.iof = new IOF({ type: 'window', debug: true })
  this.iof.initiate( e.target.contentWindow, this.input.meta.hostname )

  this.iof
  .once( 'connect', () => {
    // Get supported languages manifest of app/plugin
    this.iof.emit( 'get:languages', ( error, manifest ) => {
      if( error ) return
      this.setState( 'languages', manifest )
    } )

    // Get created test manifest of app/plugin
    this.iof.emit( 'get:tests', ( error, manifest ) => {
      if( error ) return
      this.setState( 'tests', manifest )
    } )
  } )
  .on( 'start', () => {
    // Clear console of sandbox start
    GState.console.clear()
  } )
  .on( 'console:log', GState.console.log )
  .on( 'request:api', async ( options, callback ) => {
    // Request callback function default to empty function
    callback = typeof callback == 'function' ? callback : () => {}

    try {
      const response = await window.APIRequest( options )
      console.log( response )
      callback( false, response )
    }
    catch( error ){ callback( error ) }
  } )
  .on( 'request:install', async ( payload, callback ) => {
    // Request callback function default to empty function
    callback = typeof callback == 'function' ? callback : () => {}

    try { callback( false, await Install( payload ) ) }
    catch( error ){ callback( error ) }
  } )

  // Communicate workspace and screen change to iframe
  GState.on( 'ws', data => this.iof.emit( 'ws:change', data ) )
  GState.on( 'screen', data => this.iof.emit( 'screen:change', data ) )
}