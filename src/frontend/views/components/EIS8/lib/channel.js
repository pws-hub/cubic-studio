
import IOF from 'iframe.io'
import { Install, Uninstall } from './installer'

export default function( e ){
  // Remove all previous listeners when iframe reloaded
  this.iof && this.iof.removeListeners()

  this.iof = new IOF({ type: 'window', debug: true })
  this.iof.initiate( e.target.contentWindow, this.input.meta.hostname )

  this.iof
  .once( 'connect', async () => {
    this.iof
    // Get created test manifest of app/plugin
    .emit( 'get:tests', ( error, manifest ) => {
      if( error ) return
      this.setState( 'tests', manifest )
    } )
    // Initial workspace state
    .emit( 'ws:change', GState.get('ws') )

    /*
     * Get supported languages manifest of app/plugin
     * after a second assuming <Extension/> is mounted
     */
    await delay(0.5)
    this.iof.emit( 'get:languages', ( error, manifest ) => {
      if( error ) return console.error( error )
      this.setState( 'languages', manifest )
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
      const
      { url, method, ...rest } = options.body,
      response = await ___.Request( url, method, rest )
      callback( false, response )
    }
    catch( error ) { callback( error ) }
  } )
  .on( 'request:install', async ( payload, callback ) => {
    // Request callback function default to empty function
    callback = typeof callback == 'function' ? callback : () => {}

    try { callback( false, await Install( payload ) ) }
    catch( error ) { callback( error ) }
  } )

  // Communicate workspace and screen change to iframe
  GState.on( 'ws', data => this.iof.emit( 'ws:change', data ) )
  GState.on( 'screen', data => this.iof.emit( 'screen:change', data ) )
}