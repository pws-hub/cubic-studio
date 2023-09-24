import type { FrontendRequest, Overridables } from '../types'
import type { FSTClientManager, FSHandler } from './lib/FSTClient'
import type { EmulatorHandler, IPTClientManager, IProcessHandler, JSPackageManager, CPackageManager } from './lib/IPTClient'
import type { CollectionOperatorAction, DeviceOperatorAction, FSOperatorAction, FSOperatorPayload, JSPackageOperatorAction } from '../types/operators'
import type { FSDirectory } from '../backend/core/FileSystem'
import type { CPackage, CPackageDependency, JSPackage } from '../types/package'
import type SectionManager from './lib/SectionManager'
import type WorkspaceManager from './lib/WorkspaceManager'
import jQuery from 'jquery'
import SS from 'markojs-shared-state'
import UIStore from 'all-localstorage'

type GStateAPI = {
  action: ( method: string, fn: ( ...args: any[] ) => void ) => GStateAPI
}
interface GState {
  bind: ( _: Marko.Component, fields: string[] ) => void
  unbind: ( _: Marko.Component, fields?: string[] ) => void
  get: ( key: string ) => any
  set: ( key: string, value: any ) => void
  dirty: ( key: string, value: any ) => void
  define: ( namespace: string ) => GStateAPI
}

const
shareState = SS(),
GState: GState = shareState
GState.bind = shareState.bind
GState.unbind = shareState.unbind
GState.get = shareState.getState
GState.set = shareState.setState
GState.dirty = shareState.setStateDirty
GState.define = shareState.defineAPI

declare global {
  interface Window {
    env: string
    asm: string
    mode: string
    isOnline: boolean
    instance: string
    providers: string[]
    $: typeof jQuery
    jQuery: typeof jQuery
    GState: typeof GState
    Store: UIStore
    ___: Overridables
    IProcess: IPTClientManager
    FSystem: FSTClientManager
    FSExplorer: FSHandler

    navigate: ( path: string, back?: boolean ) => void
    isEmpty: ( entry: any ) => boolean
    Obj2Params: ( obj: { [index: string]: string }, excludes?: string[] ) => string
    Params2Obj: ( str: string, excludes?: string[] ) => { [index: string]: string }
    random: ( min: number, max: number ) => number
    debugLog: ( ...args: any[] ) => void
    newObject: ( obj: any ) => any
    corsProxy: ( url: string, type?: string ) => string
    cleanLog: ( str: string ) => string
    delay: ( time: number ) => Promise<void>
    deepAssign: ( obj1: any, obj2: any ) => any
    proName: ( str: string ) => string

    CreateRequest: ( provider: string ) => FrontendRequest
    Locale: ( text: string, notrack?: boolean ) => string

    parsePackageReference: ( reference: string ) => CPackageDependency | null
  }
  interface String {
    toCapitalCase: () => string
  }
  interface Array<T> {
    pmap: ( fn: any ) => any
  }

  namespace Marko {
    interface Component {
      fs: FSHandler // File system handler
      em: EmulatorHandler // Emulator handler
      pm: IProcessHandler // IProcess handler
      sm: SectionManager
      ws: WorkspaceManager
      dpm: JSPackageManager // Dependency package manager
      cpm: CPackageManager // Cubic Dependency package manager
      pstore?: UIStore // Project UI store interface
      
      flag?: 'setup' | 'import'

      // getDirectory: () => FSDirectory
      onShowResetProjectToggle: ( status: boolean ) => void
      onShowDeleteProjectToggle: ( status: boolean ) => void
      ongoing: ( labels: { error?: Error | string | boolean, headline?: string, noLoading?: boolean } | false ) => void
      progression: ( stats: { percent: number, processor: string, message: string } ) => void
      FSOperator: ( action: FSOperatorAction, element: FSOperatorPayload ) => void
      CPackageOperator: ( action: keyof CPackageManager, element: CPackage[] ) => void
      JSPackageOperator: ( action: keyof JSPackageManager, element: JSPackage[] ) => void
      DeviceOperator: ( action: DeviceOperatorAction, options?: {} ) => void
      PackageOperator: ( action: JSPackageOperatorAction, package: JSPackage[] ) => void
      CollectionOperator: ( action: CollectionOperatorAction, key: string, element: any ) => void

      getProject: ( workspaceId: string, projectId: string ) => Promise<void>
      SetupProject: ( flag?: 'setup' | 'import' ) => Promise<void>
      DeleteProject: () => Promise<void>

      getDirectory: ( path?: string ) => Promise<void>
      getDependencies: ( section?: string ) => Promise<void>
    }
  }
}

String.prototype.toCapitalCase = function(){
  return this.toLowerCase().replace(/(?:^|\s)\w/g, match => {
    return match.toUpperCase()
  })
}

/* --------------------------------------------------------------------------*/
// Init JS plugins
window.$ =
window.jQuery = jQuery
window.Locale = ( value: string, notrack?: boolean ) => { return value } // Init locale translation function
window.Store = new UIStore({ prefix: 'CSUS-70', encrypt: true })

/* --------------------------------------------------------------------------*/
// Add to shared-state library an easy DX API
window.GState = GState

/* --------------------------------------------------------------------------*/
// Util functions
window.isEmpty = entry => {
  // Test empty array or object
  if( typeof entry !== 'object' ) return false

  return Array.isArray( entry ) ?
              !entry.length
              : Object.keys( entry ).length === 0 && entry.constructor === Object
}
window.Obj2Params = ( obj, excludes ) => {
  return Object.entries( obj )
                .map( ([ key, value ]) => {
                  if( !Array.isArray( excludes ) || !excludes.includes( key ) )
                    return `${key }=${ value}`
                }).join('&')
}
window.Params2Obj = ( str, excludes ) => {

  const obj = {},
      array = str.split('&')

  array.map( each => {
          const [ key, value ] = each.split('=')

          if( !Array.isArray( excludes ) || !excludes.includes( key ) )
            obj[ key ] = value
        })

  return obj
}
window.random = ( min, max ) => {
  // Generate random number at a range
  return Math.floor( Math.random() * ( max - min + 1 )+( min + 1 ) )
}
window.debugLog = ( ...args ) => {
  if( window.env == 'production' ) return
  console.log( ...args )
}
window.cleanLog = str => { return (str || '').replace( new RegExp('\\s?\\[[1-9]+[KGm]', 'g'), '') }
window.delay = time => { return new Promise( resolve => setTimeout( resolve, ( time || 1 ) * 1000 ) ) }
window.newObject = obj => { return typeof obj == 'object' && JSON.parse( JSON.stringify( obj ) ) }
window.deepAssign = ( obj1, obj2 ) => { return Object.assign( window.newObject( obj1 ), obj2 || {} ) }

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

window.parsePackageReference = ( reference: string ) => {
  const sequence = reference.match(/(\w+):([a-zA-Z0-9_\-+]+).([a-zA-Z0-9_\-+]+)(~(([0-9]\.?){2,3}))?/)
  if( !sequence || sequence.length < 4 )
    return null

  const [ _, type, namespace, nsi, __, version ] = sequence
  return { type, namespace, nsi, version }
}