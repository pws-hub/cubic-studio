

import request from 'request-promise'
import { stringify } from 'query-string'

async function getToken( code, origin ){
  const params = {
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    redirect_uri: `${origin}/auth/github/callback`,
    code
  },
  options = {
    url: `${process.env.GITHUB_AUTH_BASE_URL}/access_token?${stringify( params )}`,
    method: 'GET',
    headers: { 'user-agent': 'Mozilla/5.0' },
    json: true
  },
  { error, error_description, access_token } = await request( options )
  if( error ) throw new Error( error_description )

  return access_token
}

async function getUser( token ){
  const
  options = {
    url: `${process.env.GITHUB_API_SERVER}/user`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Authorization': `token ${token}`
    },
    json: true
  }

  return await request( options )
}

export const initiate = async origin => {
  // Github authentication initiation URL
  const params = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${origin}/auth/github/callback`,
    scope: ['read:user', 'user:email'].join(' '), // Space seperated string
    allow_signup: true
  }

  return `${process.env.GITHUB_AUTH_BASE_URL}/authorize?${stringify( params )}`
}

export const callback = async ({ code }, origin ) => {
  try {
    const
    token = await getToken( code, origin ),
    user = await getUser( token ),
    response = { error: false }

    // Convert user data in CubicStudio User Format
    if( user ) {
      const
      { login, email, name, avatar_url, bio } = user,
      [ first_name, ...last_name ] = name.split(/\s+/)

      response.user = {
        id: email, // Use Base64-encoded user's email as Unique ID
        username: login,
        name: `${first_name} ${last_name.pop()}`,
        photo: avatar_url,
        role: 'DEVELOPER',
        bio
      }
    }

    return response
  }
  catch( error ) {
    console.log('Authentication Checking failed: ', error )
    return { error: true, message: error.message }
  }
}