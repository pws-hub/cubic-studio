
import jQuery from 'jquery'
import moment from 'moment'
import numeral from 'numeral'
import SS from 'markojs-shared-state'
import { navigate } from 'marko-router5'
import UIStore from 'all-localstorage'

String.prototype.toCapitalCase = function(){
  // Fonction de capitalisation du premier caractère d'un mot
  this.toLowerCase()

  const
  First = this.charAt(0),
  regex = new RegExp('^'+ First )

  return First.toUpperCase() + this.split( regex )[1]
}

/*--------------------------------------------------------------------------*/
// Init JS plugins
window.$ =
window.jQuery = jQuery
window.navigate = navigate // To navigate routers by function call
window.uiStore = new UIStore({ prefix: 'CSUS-70', encrypt: true })

/*--------------------------------------------------------------------------*/
// Add to shared-state library an easy DX API
const 
shareState = SS(),
GState = shareState
GState.bind = shareState.bind
GState.unbind = shareState.unbind
GState.get = shareState.getState
GState.set = shareState.setState
GState.dirty = shareState.setStateDirty
GState.define = shareState.defineAPI

window.GState = GState

/*--------------------------------------------------------------------------*/
// Util functions
window.isEmpty = entry => {
  // Test empty array or object
  if( typeof entry !== 'object' ) return null

  return Array.isArray( entry ) ?
              !entry.length
              : Object[ Object.entries ? 'entries' : 'keys' ]( entry ).length === 0 && entry.constructor === Object
}
window.Obj2Params = ( obj, excludes ) => {
  return Object.entries( obj )
                .map( ([ key, value ]) => {
                  if( !Array.isArray( excludes ) || !excludes.includes( key ) )
                    return key +'='+ value
                }).join('&')
}
window.Params2Obj = ( str, excludes ) => {

  let obj = {},
      array = str.split('&')

  array.map( each => {
          let [ key, value ] = each.split('=')

          if( !Array.isArray( excludes ) || !excludes.includes( key ) )
            obj[ key ] = value
        })

  return obj
}
window.random = ( min, max ) => {
  // generate random number at a range
  return Math.floor( Math.random() * ( max - min + 1 )+( min + 1 ) )
}
window.debugLog = ( ...args ) => {
  if( window.env == 'production' ) return
  console.log( ...args )
}
window.cleanLog = str => { return (str || '').replace( new RegExp('\s?\[[1-9]+[KGm]', 'g'), '') }
window.delay = time => { return new Promise( resolve => setTimeout( resolve, ( time || 1 ) * 1000 ) ) }
window.newObject = obj => { return typeof obj == 'object' && JSON.parse( JSON.stringify( obj ) ) }
window.deepAssign = ( obj1, obj2 ) => { return Object.assign( newObject( obj1 ), obj2 || {} ) }

window.corsProxy = ( url, type ) => {
  // Ignore wrapping same origin URL
  return new RegExp( location.origin ).test( url ) 
          || !/^http(s?):\/\//.test( url ) ? 
                        url : `/proxy?url=${encodeURIComponent( url )}&responseType=${type || 'blob'}` 
}
window.proName = str => {
  return str.split(/-|\s+/)
            .map( each => { return each.toCapitalCase() } )
            .join(' ')
}

window.CreateRequest = provider => {
  return ( url, method, body ) => {
    return new Promise( ( resolve, reject ) => {
      
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method: method || 'GET', body })
      }
      
      fetch( `/api/${provider}`, options )
          .then( res => { return !res.ok ? reject( res.status ) : res.json() } )
          .then( resolve )
          .catch( reject )
    } )
  }
}
