
export default function Connect( utils, { name, token, isHost } ){

  if( !token )
    throw new Error('Undefined Session Token')

  const
  baseURL = window.asm === 'cloud' ? 'https://cws.webmicros.com' : 'http://api.cubic.studio:7777',
  options = {
    query: { name, isHost },
    reconnectionDelayMax: 20000,
    withCredentials: true,
    auth: { token }
  },
  channel = utils.ioclient( `${baseURL }/`, options )

  channel
  .on('connect', () => {
    console.log('Connected: ', channel.id )
  })
  .on('connect_error', error => {
    console.log('Connection Error: ', error )
  })

  function JoinGranted(){
    console.log('Joined Granted------')
    !isHost && channel.emit('JOIN') // Join

    channel
    .on('PARTICIPANT_JOINED', participant => {
      console.log('New Participant Joined: ', participant )
    })
    .on('HOST_DISCONNECTED', participant => {
      console.log('Host Disconnect: ', participant )
    })
    .on('PARTICIPANT_DISCONNECTED', participant => {
      console.log('Participant Disconnect: ', participant )
    })
  }

  /*
   * Function StreamScreen(){
   *   interval = setInterval( () => {
   *     const image = await screenshot()
   */

  /*
   *     Socket.emit('STREAM_SCREEN', {
   *       image: new Buffer.from( image ).toString('base64'),
   *       dimension: sizeOf( image )
   *     })
   *   }, 500)
   * }
   */

  if( !isHost )
    return channel.on('JOIN_GRANTED', JoinGranted )

  // Reserved processes for Host-only
  JoinGranted()

  channel.on('JOIN_REQUEST', participant => {

    console.log('Join Request: ', participant )

    // Grant permission to connect
    setTimeout( () => channel.emit('JOIN_GRANTED', participant ), 3000 )
  })
}