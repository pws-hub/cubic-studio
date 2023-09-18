
import dotenv from 'dotenv'
import kebabCase from 'kebab-case'
import Configs from '../../cubic.yml'

dotenv.config()

if( !process.env.ADDRESS ) {
  console.log('[ERROR] .env file is not found')
  process.exit(0)
}

declare global {
  var Configs: { [index: string]: any }
  var serverVersion: string
  var isOncloud: () => boolean
  var isApp: ( dataset: any ) => boolean
  var isEmpty: ( entry: any ) => boolean
  var random: ( min: number, max: number ) => number
  var ruuid: ( sequence?: string ) => string
  var toNSI: ( name: string ) => string
  var toOrigin: ( domain: string, local?: boolean ) => string
  var debugLog: ( ...arg: any ) => void
  var Obj2Params: ( obj: { [index: string]: string }, excludes?: string[] ) => string
  var Params2Obj: ( str: string, excludes?: string[] ) => { [index: string]: string }

  interface String {
    toCapitalCase: () => string
  }
}

String.prototype.toCapitalCase = function(){
  return this.toLowerCase().replace(/(?:^|\s)\w/g, match => {
    return match.toUpperCase()
  })
}

global.Configs = Configs
global.serverVersion = Configs.APPVERSION || require('../../package.json').version

global.isOncloud = () => { return process.env.MODE === 'cloud' }
global.isApp = dataset => { return true }

global.isEmpty = entry => {
  // Test empty array or object
  if( typeof entry !== 'object' ) return false

  return Array.isArray( entry ) ?
              !entry.length
              : Object.keys( entry ).length === 0 && entry.constructor === Object
}
global.ruuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
      return v.toString(16)
  })
}
global.random = ( min, max ) => {
  // Generate random number at a range
  return Math.floor( Math.random() * ( max - min + 1 )+( min + 1 ) )
}
global.Obj2Params = ( obj, excludes ) => {

  return Object.entries( obj )
                .map( ([ key, value ]) => {
                  if( !Array.isArray( excludes ) || !excludes.includes( key ) )
                    return `${key }=${ value}`
                }).join('&')
}
global.Params2Obj = ( str, excludes ) => {
  const
  obj: any = {},
  array = str.split('&')

  array.map( each => {
    const [ key, value ] = each.split('=')

    if( !Array.isArray( excludes ) || !excludes.includes( key ) )
      obj[ key ] = value
  })

  return obj
}
global.toOrigin = ( domain, local ) => {
  if( /^http/.test( domain ) )
    domain = domain.replace(/^http(s?):\/\//, '')

  return `http${!local && (process.env.HTTP_SECURE as string).includes('true') ? 's' : ''}://${ domain}`
}

global.toNSI = name => {
  return kebabCase( name.toLowerCase().replace(/\s+/g, '-') ).replace(/^-/, '')
}
global.debugLog = ( ...args ) => {

  if( process.env.NODE_ENV == 'production' ) return
  console.log( ...args )
}