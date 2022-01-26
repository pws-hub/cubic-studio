
import fs from 'fs-extra'
import Config from '../../cubic.json'

async function saveCredentials( name, data ){
  // Cache access credentials directory
  if( process.env.CUBIC_ENV !== 'local' ) return

  const creddir = './../credentials'

  await fs.ensureDir( creddir )
  await fs.writeFile( `${creddir}/${name}.json`, JSON.stringify( data ) )
}

export default async ( req, res ) => {
  try {
    const provider = req.query.provider
    
    // Check whether request handler is defined
    if( !Config.AUTH_HANDLERS[ provider ] )
      throw new Error(`Undefined <${provider}> Auth Handler`)
      
    // Get auth handler module for this provider
    const 
    authHandler = require('handlers/'+ Config.AUTH_HANDLERS[ provider ] ).default,
    { error, message, user } = await authHandler( req.query )
    
    if( error ){
      // Delete existing user session data
      delete req.session.user

      req.session.authError = message
      req.session.isConnected = false
    }
    else {
      // Save credentials in session
      req.session.credentials = {
        ...(req.session.credentials || {}),
        [ provider ]: req.query
      }
      // Save credentials in the JSON-file beside the session
      await saveCredentials( provider, req.query )
      
      req.session.user = user
      req.session.authError = false
      req.session.isConnected = true
    }
      
    // Back to home: Make request from there to check session status
    res.redirect('/')
  }
  catch( error ){
    console.log(`[${clc.red('ERROR')}] Unexpected Error Occured:`, error )

    req.session.authError = 'Unexpected Error Occured'
    res.redirect('/')
  }
}