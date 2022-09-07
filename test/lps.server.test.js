
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
    // console.log( await Interface.insert({ type: 'plugin', nsi: 'n-keypad', name: 'keypad', namespace: 'onetouch', version: '1.0' }) )
    // Insert Many
    // console.log( await Interface.insert( extensions ) )
    // Get
    // console.log( await Interface.get({ nsi: 'n-keypad' }) )
    // Fetch
    // console.log( await Interface.fetch({ type: 'plugin' }) )
    // Update
    // console.log( await Interface.update( '6ed8-d58c-40417-f283b53c', { name: 'KeyPad', version: '2.0' }) )
    // Delete
    console.log( await Interface.delete('6ed8-d58c-40417-f283b53c') )
  }
  catch( error ){ console.log('Failed: ', error ) }
} )()