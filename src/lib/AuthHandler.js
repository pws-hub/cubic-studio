
async function _initiate( provider, handler, req, res ){

  const 
  origin = toOrigin( req.headers.host, !isOncloud() ),
  authURL = await handler( origin )
  if( !authURL )
    throw new Error(`Expected a <${provider}> auth redirection URL`)

  res.redirect( authURL )
}

async function _callback( provider, handler, req, res ){
  // Handle auth callback process
  const { error, message, user } = await handler( req.query )
  
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
    await Sync.storeCredentials( provider, req.query )
    
    req.session.user = user
    req.session.authError = false
    req.session.isConnected = true
    
    // Store locally updated user session
    await Sync.setSession({ isConnected: true, user, authError: false })
  }
    
  // Back to home: Make request from there to check session status
  res.redirect('/')
}

export default async ( req, res ) => {
  try {
    const 
    phase = req.params.phase,
    provider = req.query.provider

    if( !['initiate', 'callback'].includes( phase ) || !provider )
      throw new Error(`Invalide Auth Parameters`)
    
    // Check whether request handler is defined
    if( !Configs.AUTH_HANDLERS[ provider ] )
      throw new Error(`Undefined <${provider}> Auth Handler`)
      
    // Get auth handler module for this provider
    const { initiate, callback } = require('handlers/'+ Configs.AUTH_HANDLERS[ provider ] )

    if( typeof initiate !== 'function'
        || typeof callback !== 'function' )
      throw new Error(`Invalid <${provider}> Auth Handler Methods. Expected <initiate> and <callback> method functions`)

    switch( phase ){
      case 'initiate': await _initiate( provider, initiate, req, res ); break
      case 'callback': await _callback( provider, callback, req, res ); break
    }
  }
  catch( error ){
    console.log(`[${clc.red('ERROR')}] Unexpected Error Occured:`, error )

    req.session.authError = 'Unexpected Error Occured'
    res.redirect('/')
  }
}