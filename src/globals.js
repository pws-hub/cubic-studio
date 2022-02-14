
import dotenv from 'dotenv'

dotenv.config()

if( !process.env.ADDRESS ){
  console.log('[ERROR] .env file is not found')
  process.exit(0)
}

String.prototype.toCapitalCase = function(){
  // Fonction de capitalisation du premier caractère d'un mot
  this.toLowerCase()

  const First = this.charAt(0)
  return First.toUpperCase() + this.split( new RegExp( '^'+ First ) )[1]
}

global.Configs = require('./../cubic.json')

global.clc = require('colors')
global.serverVersion = Configs.APPVERSION || require('../package.json').version

global.isOncloud = () => { process.env.MODE === 'cloud' }

global.isEmpty = entry => {
  // test empty array or object
  if( typeof entry !== 'object' ) return null

  return Array.isArray( entry ) ?
              !entry.length
              : Object[ Object.entries ? 'entries' : 'keys' ]( entry ).length === 0 && entry.constructor === Object
}

global.ruuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
      return v.toString(16)
  })
}

global.Obj2Params = ( obj, excludes ) => {

  return Object.entries( obj )
                .map( ([ key, value ]) => {
                  if( !Array.isArray( excludes ) || !excludes.includes( key ) )
                    return key +'='+ value
                }).join('&')
}

global.Params2Obj = ( str, excludes ) => {

  let obj = {},
      array = str.split('&')

  array.map( each => {
          let [ key, value ] = each.split('=')

          if( !Array.isArray( excludes ) || !excludes.includes( key ) )
            obj[ key ] = value
        })

  return obj
}

global.getOrigin = hreq => {

  const origin = typeof hreq == 'object' ?
                                hreq.headers.origin ?
                                        new URL( hreq.headers.origin ).hostname
                                        : hreq.headers.host
                                : ( hreq || '' ).replace(/http(s?):\/\//,'')

  return ( origin || '' ).replace(/:[0-9]{4,}/,'')
}

global.toOrigin = domain => {

  if( /^http/.test( domain ) )
    domain = domain.replace(/^http(s?):\/\//, '')

  return 'http'+( process.env.HTTP_SECURE.includes('true') ? 's' : '' )+'://'+ domain
}

global.debugLog = ( ...args ) => {
  
  if( process.env.NODE_ENV == 'production' ) return
  console.log( ...args )
}