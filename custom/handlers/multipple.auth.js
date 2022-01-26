

import fetch from 'node-fetch'

export default async ({ domain, token, deviceId, role }) => {
  try {
    const 
    options = {
      method: 'GET',
      headers: {
        'Origin': decodeURIComponent( domain ),
        'MP-User-Agent': 'MP.studio/1.0',
        'MP-Auth-Token': token,
        'MP-Auth-Device': deviceId,
        'MP-Auth-Role': role
      }
    },
    response = await ( await fetch(`${toOrigin( process.env.MULTIPPLE_API_SERVER )}/user/account`, options ) ).json()

    // Pu user data in CubicStudio User Format
    if( response.user ){
      const { email, first_name, last_name, photo } = response.user
      response.user = {
        id: Buffer.from( email, 'binary').toString('base64'), // Use Base64-encoded user's email as Unique ID
        name: first_name +' '+ last_name,
        photo
      }
    }
    
    return response
  }
  catch( error ){
    console.log('Authentication Checking failed: ', error )
    return { error: true, message: error.message }
  }
}