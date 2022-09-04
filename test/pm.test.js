
import path from 'path'
import numeral from 'numeral'
import PackageManager from '../src/backend/core/PackageManager'

/*
;( async () => {
  try {
    const
    options = {
      manager: 'yarn',
      cwd: path.resolve( process.cwd(), '../projects/TestApp' ),
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

    // Install Node packages
    // console.log( await pm.installPackages( ( _, length, message ) => console.log(`[${length}] -- ${message}`) ) )
    console.log( await pm.remove('express') )
  }
  catch( error ){ 
    console.log( error )
  }
} )()
*/

;( async () => {
  try {
    const
    options = {
      cpr: 'http://cpr.micros.io:60777/v1',
      cwd: path.resolve( process.cwd(), '../projects/TestApp' ),
      debug: true,
      watcher: ( error, length, message ) => {
        error ? 
          console.error( error ) 
          : console.log(`[${length !== null ? numeral( length ).format('0.0b') : '-'}] -- ${message}`)
      }
    },
    pm = new PackageManager( options )
    
    // console.log( await pm.install('application:multipple.SampleApp', '-d') )
    // console.log( await pm.publish() )
    // console.log( await pm.update('application:multipple.SampleApp', '-d') )
    console.log( await pm.remove('application:multipple.SampleApp') )
  }
  catch( error ){ 
    console.log( error )
  }
} )()