
export default async ( req, res ) => {
  // Direct request to appropriete handler
  try {
    const { provider } = req.params

    // Check whether request handle is defined
    if( !Configs.REQUEST_HANDLERS[ provider ] )
      throw new Error(`Undefined <${provider}> Request Handler`)

    const requestHandler = require(`handlers/${Configs.REQUEST_HANDLERS[ provider ]}`).default

    return await requestHandler( req, res )
  }
  catch( error ) {
    console.log('Failed sending API request: ', error )
    res.status(400)
        .json({ error: true, message: error })
  }
}