
import GitManager from '../src/core/GitManager'

;( async () => {
  try {
    const
    options = {
      cwd: './../projects/TestApp',
      debug: true,
      auth: {
        username: 'multipple-dev',
        token: 'rF9zpTMYAXSkseVFnHbg'
      },
      repository: 'https://gitlab.com/multipple/applications/test-app.git'
    },
    gp = new GitManager( options )

    await gp.initProject( false, true )
    await gp.cloneProject( 'https://github.com/multipple/create-app-marko', '../TestApp', true )
    console.log('clear: ', await gp.clear() )
  }
  catch( error ) {
    console.log( error )
  }
} )()