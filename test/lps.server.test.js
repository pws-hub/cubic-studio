
import Store from '../src/backend/lib/LPSServer'

;( async () => {
  try {
    const
    { Interface } = Store(),
    extensions = [
      { type: 'application', nsi: 'notebook', name: 'NoteBook', namespace: 'adobe', version: '1.0' },
      { type: 'plugin', nsi: 'kill-pro', name: 'KProcess', namespace: 'google', version: '2.0' }
    ]

    // Insert one
    console.log( await Interface.insert({ type: 'plugin', nsi: 'n-keypad', name: 'keypad', namespace: 'onetouch', version: '1.0' }) )
    // Insert Many
    console.log( await Interface.insert( extensions ) )
    // Fetch
    console.log( await Interface.fetch({ type: 'plugin' }) )
    // Get
    const metadata = await Interface.get({ nsi: 'n-keypad' })
    console.log( metadata )

    if( metadata ) {
      // Update
      console.log( await Interface.update( metadata.sid, { name: 'KeyPad', version: '2.0' }) )
      // Delete
      console.log( await Interface.delete( metadata.sid ) )
    }
  }
  catch( error ) { console.log('Failed: ', error ) }
} )()