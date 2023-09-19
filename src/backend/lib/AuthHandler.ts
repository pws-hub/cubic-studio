import type { Request, Response } from 'express'
import type { User } from '../../types/user'

type AuthResponse = {
  error: boolean
  message: string
  user: User
}
type AuthInitiateHandle = ( origin: string ) => Promise<string>
type AuthCallbackHandler = ( data: { [index: string]: any }, origin: string ) => Promise<AuthResponse>

async function _initiate( provider: string, handler: AuthInitiateHandle, req: Request, res: Response ){
  const
  origin = toOrigin( req.headers.host, !isOncloud() ),
  authURL = await handler( origin )
  if( !authURL )
    throw new Error(`Expected a <${provider}> auth redirection URL`)

  res.redirect( authURL )
}

async function _callback( provider: string, handler: AuthCallbackHandler, req: Request, res: Response ){
  // Handle auth callback process
  const
  origin = toOrigin( req.headers.host, !isOncloud() ),
  { error, message, user } = await handler( req.query, origin )

  if( error ) {
    // Delete existing user session data
    delete req.session.user

    req.session.authError = message
    req.session.isConnected = false
  }
  else {
    // Store credentials in session for API request checks
    const credentials = {
      ...(req.session.credentials || {}),
      [ provider ]: req.query
    }

    user.provider = provider

    req.session.user = user
    req.session.authError = false
    req.session.isConnected = true
    req.session.credentials = credentials

    // Store locally updated user session
    await Sync.setSession({ credentials, isConnected: true, user, authError: false })
  }

  // Back to home: Make request from there to check session status
  res.redirect('/')
}

export default async ( req: Request, res: Response ) => {
  try {
    const { phase, provider } = req.params

    if( !['initiate', 'callback'].includes( phase ) || !provider )
      throw new Error('Invalide Auth Parameters')

    // Check whether request handler is defined
    if( !Configs.AUTH_HANDLERS[ provider ] )
      throw new Error(`Undefined <${provider}> Auth Handler`)

    // Get auth handler module for this provider
    const { initiate, callback } = require(`handlers/${Configs.AUTH_HANDLERS[ provider ]}`)

    if( typeof initiate !== 'function'
        || typeof callback !== 'function' )
      throw new Error(`Invalid <${provider}> Auth Handler Methods. Expected <initiate> and <callback> method functions`)

    switch( phase ) {
      case 'initiate': await _initiate( provider, initiate, req, res ); break
      case 'callback': await _callback( provider, callback, req, res ); break
    }
  }
  catch( error ) {
    console.log('[ERROR] Unexpected Error Occured:', error )

    req.session.authError = 'Unexpected Error Occured'
    res.redirect('/')
  }
}