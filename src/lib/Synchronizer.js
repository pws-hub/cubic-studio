
import Path from 'path'
import Fs from 'fs-extra'
import { encrypt, decrypt } from './DTCrypt'

/** Variable holder of "online/offline" state of 
 * local mode app user updated by socket `SYNC::IS_ONLINE` 
 * events.
 * 
 * NOTE: Only used for local based application
 */
let LOCAL_USER_ONLINE = false

function isOnline(){
  // Whether user have internet

  /** As a backend process, cloud based app
   * service is already online
   */
  if( isOncloud() ) return true

  return LOCAL_USER_ONLINE
}

function initChannel( socket ){
  // Synchronize with font-client
  console.log('SYNC New Connection: ', socket.id )

  socket
  .on( 'SYNC::IS_ONLINE', state => LOCAL_USER_ONLINE = state )
}

async function getPath( type ){
  let path
  switch( type ){
    case 'credentials': path = Path.resolve('sync/credentials' )
                        await Fs.ensureDir( path )
                        return path

    case 'session':
    case 'install': path = Path.resolve('sync')
                    await Fs.ensureDir( path )
                    return path
  }
}

async function storeCredentials( provider, data ){
  // Cache access credentials directory as
  if( isOncloud() ) return
  
  const creddir = await getPath('credentials')
  await Fs.writeFile( `${creddir}/${provider}.dtf`, encrypt( data ) )
}

async function setSession( data ){
  // Cache user session for backup in offline mode
  if( isOncloud() ) return
  
  const sessdir = await getPath('session')
  await Fs.writeFile( `${sessdir}/session.dtf`, encrypt( data ), 'UTF-8' )
}
async function getSession( type, req ){
  
  switch( type ){
    /** Get current user authentication session value
     * 
     * For users on cloud based app service of local
     * base app but online, strictly rely on req.session
     * value.
     * 
     * Otherwise, fetch cached session (Offline) 
     * NOTE: Cached session are destroyed only when user
     *        signout manually.
     */
    case 'auth': if( isOnline() || ( req.session && req.session.isConnected ) )
                    return {
                      isConnected: req.session.isConnected,
                      user: req.session.user
                    }
                  
                  // Fetch cached session
                  try {
                    const 
                    token = await Fs.readFile( await getPath('session') +'/session.dtf', 'UTF-8' ),
                    session = decrypt( token )

                    if( typeof session !== 'object' ) return {}

                    // Load cache to session
                    req.session.authError = session.authError
                    req.session.isConnected = session.isConnected
                    req.session.user = session.user

                    return session
                  }
                  catch( error ){
                    console.log('Failed fetching cached session: ', error )
                    return {}
                  }
                    
  }
}

async function setApp( appId, dataset ){
  // TODO: Add app to a database on `cloud` base mode
  if( isOncloud() ){}
  // Add app to `temp` folder on `local` base mode
  else await Fs.writeFile(`${ await getPath('install') }/${appId}.app`, encrypt( dataset ), 'UTF-8' )
}
async function getApp( appId ){
  // TODO: Get app information from a database on `cloud` base mode
  if( isOncloud() ){}
  // Get app information from `temp` folder on `local` base mode
  else decrypt( await Fs.readFile(`${ await getPath('install') }/${appId}.app`, 'UTF-8') )
}
async function clearApp( appId ){
  // TODO: Remove app from a database on `cloud` base mode
  if( isOncloud() ){}
  // Remove app from `temp` folder on `local` base mode
  else await Fs.remove(`${ await getPath('install') }/${appId}.app`)
}

export default ioServer => {

  ioServer.on( 'connection', initChannel )

  global.Sync = {
    storeCredentials,

    setSession,
    getSession,

    setApp,
    getApp,
    clearApp
  }
}