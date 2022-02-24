
import IProcess from '../src/core/IProcess'

;( async () => {
  try {
    const
    options = {
      debug: true,
      watcher: ( process, error, stats ) => {
        error ?
          console.error( error )
          : console.log( `${process} -- [${stats.percent}]: ${stats.message}`)
      }
    },
    ps = new IProcess( options )
    
    // await ps.setupProject({
    //   type: 'application',
    //   name: 'TestApp',
    //   description: 'Test multipple micro-application',
    //   specs: {
    //     code: {
    //       language: 'marko~5+',
    //       platforms: [ 'multipple~2.0' ],
    //       directory: '/Users/fabricemarlboro/dev-pro/Myapp-labs/Extensions/TestApp',
    //       repository: 'https://gitlab.com/multipple/applications/Test-App'
    //     }
    //   }
    // })
    // await ps.importProject({
    //   type: 'application',
    //   name: 'Calendar',
    //   description: 'Calendar multipple micro-application',
    //   specs: {
    //     code: {
    //       language: 'marko~5+',
    //       platforms: [ 'multipple~2.0' ],
    //       directory: '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Calendar',
    //       repository: 'https://gitlab.com/multipple/applications/Calendar'
    //     }
    //   }
    // })
    // const appId = await ps.installApp({
    //   "type": "application",
    //   "name": "Library",
    //   "namespace": "multipple",
    //   "nsi": "library",
    //   "description": "Search, Store books, documents, ... with access to multiple online library document right into your institution",
    //   "version": "1.0",
    //   "favicon": "favicon.png",
    //   "categories": [
    //     "library"
    //   ],
    //   "runscript": {
    //     "*": {
    //       "workspace": "qs",
    //       "autoload": true
    //     }
    //   },
    //   "resource": {
    //     "dependencies": [],
    //     "permissions": {
    //       "scope": [
    //         {
    //           "type": "user.*",
    //           "access": "GRANTED"
    //         },
    //         {
    //           "type": "tenant.*",
    //           "access": "GRANTED"
    //         }
    //       ]
    //     },
    //     "services": {
    //       "editor": [
    //         "BOOK",
    //         "XDOC",
    //         "ESHL"
    //       ]
    //     }
    //   },
    //   "author": {
    //     "type": "developer",
    //     "name": "Multipple"
    //   },
    //   "info": {}
    // })
    // console.log('Installed: ', appId )
    // await ps.uninstallApp( appId )
    // await ps.addComponents({ name: 'Locale', package: 'Switch' }, '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions' )
    // await ps.addPackages( [{ source: 'npm', name: 'express', version: '1.0.0' }], '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Calendar' )
    // await ps.updatePackages( [{ source: 'npm', name: 'express', version: '1.0.0' }], '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Calendar' )
    await ps.removePackages( [{ source: 'npm', name: 'express', version: '1.0.0' }], '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Calendar' )
  }
  catch( error ){ 
    console.log( error )
  }
} )()