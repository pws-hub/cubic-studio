
import request from 'request-promise'

// type AuthCallbackPayload = {
//   domain: string
//   token: string
//   deviceId: string
//   role: string
// }
// type AuthCallbackResponse = {
//   error: boolean
//   message?: string
//   user?: User
// }

export const initiate = async ( origin ) => {
  // Tenant's authentication initiation URL
  return `${process.env.MULTIPPLE_TENANT_DOMAIN}/auth?oauth=studio&v=1.a&dt=4000&curl=${encodeURIComponent(`${origin }/auth/multipple/callback`)}`
}

export const callback = async ({ domain, token, deviceId, role }) => {
  try {
    const
    options = {
      url: `${process.env.MULTIPPLE_API_BASE_URL}/user/account`,
      method: 'GET',
      headers: {
        'Origin': decodeURIComponent( domain ),
        'MP-User-Agent': 'MP.studio/1.0',
        'MP-Auth-Token': token,
        'MP-Auth-Device': deviceId,
        'MP-Auth-Role': role
      },
      json: true
    },
    response = await request( options )

    // Pu user data in CubicStudio User Format
    if( response.user ) {
      const { email, first_name, last_name, photo, bio } = response.user
      response.user = {
        id: email, // Email, phone number, whatever is unique us identifier of the user
        username: (first_name + last_name).toLowerCase(),
        name: `${first_name} ${last_name}`,
        photo,
        role: 'DEVELOPER',
        bio: bio || null
      }
    }

    return response
  }
  catch( error ) {
    console.log('Authentication Checking failed: ', error )
    return { error: true, message: error.message }
  }
}