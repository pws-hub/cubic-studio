
import type { Request } from 'express'
import type { Server, Socket } from 'socket.io'
import Path from 'path'
import Fs from 'fs-extra'
import { encrypt, decrypt } from './DTCrypt'

type SyncType = 'install' | 'credentials' | 'session'
type SyncSessionType = 'auth'
type SyncAuth = {
  isConnected?: boolean
  user?: any
  authError?: string
}

declare global {
  var Sync: {
    setSession: ( data: any ) => Promise<void>,
    getSession: ( type: SyncSessionType, req: Request ) => Promise<SyncAuth>

    setApp: ( appId: string, dataset: any ) => Promise<void>
    getApp: ( appId: string ) => Promise<any>
    clearApp: ( appId: string ) => Promise<any>
  }
}

/**
 * Variable holder of "online/offline" state of
 * local mode app user updated by socket `SYNC::IS_ONLINE`
 * events.
 *
 * NOTE: Only used for local based application
 */
let LOCAL_USER_ONLINE = false

function isOnline(){
  // Whether user have internet

  /**
   * As a backend process, cloud based app
   * service is already online
   */
  if( isOncloud() ) return true

  return LOCAL_USER_ONLINE
}

function initChannel( socket: Socket ){
  // Synchronize with font-client
  console.log('SYNC New Connection: ', socket.id )

  socket
  .on( 'SYNC::IS_ONLINE', state => LOCAL_USER_ONLINE = state )
}

async function getPath( type: SyncType ){
  let path
  switch( type ) {
    case 'install':
    case 'credentials': path = Path.resolve(`sync/${type}`)
                        await Fs.ensureDir( path )
                        return path

    case 'session': path = Path.resolve('sync')
                    await Fs.ensureDir( path )
                    return path
  }
}

async function setSession( data: any ){
  // Cache user session for backup in offline mode
  if( isOncloud() ) return

  const sessdir = await getPath('session')
  await Fs.writeFile(`${sessdir}/session.dtf`, encrypt( data ) )
}
async function getSession( type: SyncSessionType, req: Request ){
  switch( type ) {
    /**
     * Get current user authentication session value
     *
     * For users on cloud based app service of local
     * base app but online, strictly rely on req.session
     * value.
     *
     * Otherwise, fetch cached session (Offline)
     * NOTE: Cached session are destroyed only when user
     *        signout manually.
     */
    case 'auth': {
      if( isOnline() || req.session?.isConnected )
        return {
          isConnected: req.session.isConnected,
          user: req.session.user
        }

      // Fetch cached session
      try {
        const
        token = await Fs.readFile( `${await getPath('session') }/session.dtf`, 'UTF-8' ),
        session = decrypt( token )

        if( typeof session !== 'object' ) return {}

        // Load cache to session
        const { credentials, isConnected, user, authError } = session

        req.session.user = user
        req.session.authError = authError
        req.session.isConnected = isConnected
        req.session.credentials = credentials

        return { isConnected, user, authError }
      }
      catch( error: any ) {
        console.log('Failed fetching cached session: ', error.message )
        return {}
      }
    }
  }
}

async function setApp( appId: string, dataset: any ){
  // TODO: Add app to a database on `cloud` base mode
  if( isOncloud() ) {}
  // Add app to `temp` folder on `local` base mode
  else await Fs.writeFile(`${ await getPath('install') }/${appId}.app`, encrypt( dataset ) )
}
async function getApp( appId: string ){
  // TODO: Get app information from a database on `cloud` base mode
  if( isOncloud() ) {}
  // Get app information from `temp` folder on `local` base mode
  else {
    const content = await Fs.readFile(`${ await getPath('install') }/${appId}.app`, { encoding: 'UTF-8' }) as unknown
    return decrypt( content as string )
  }
}
async function clearApp( appId: string ){
  // TODO: Remove app from a database on `cloud` base mode
  if( isOncloud() ) {}
  // Remove app from `temp` folder on `local` base mode
  else await Fs.remove(`${ await getPath('install') }/${appId}.app`)
}

export default ( ioServer: Server ) => {

  ioServer.on( 'connection', initChannel )

  global.Sync = {
    setSession,
    getSession,

    setApp,
    getApp,
    clearApp
  }
}