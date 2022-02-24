
import PackageManager from '../src/core/PackageManager'

;( async () => {
  try {
    const
    options = {
      manager: 'yarn',
      cwd: './../projects/TestApp',
      debug: true
    },
    pm = new PackageManager( options )

    // await pm.init({
    //   name: 'sample-app',
    //   description: 'description of the application',
    //   version: '1.0.0',
    //   private: true,
    //   scripts: {
    //     start: 'cd ./sandbox && yarn start',
    //     test: 'cd ./sandbox && yarn test:dev'
    //   },
    //   main: 'src/index.marko',
    //   workspaces: [ 'sandbox' ],
    //   author: 'Me <me@me.com>',
    //   repository: 'https://gitlab.com/multipple/application/Test-App.git',
    //   keywords: [],
    //   licence: false
    // })

    // console.log( await pm.install( ( _, length, message ) => console.log(`[${length}] -- ${message}`) )
    console.log( await pm.remove('express') )
  }
  catch( error ){ 
    console.log( error )
  }
} )()