
import path from 'path'
import socketServer from 'socket.io'
import CARConnect from '../lib/Connect/CAR'
import FSTConnect from '../lib/Connect/FST'
import IPTConnect from '../lib/Connect/IPT'
import Emulator from './Emulator'
import FileSystem from './FileSystem'
import GitManager from './GitManager'
import IProcess from './IProcess'
import PackageManager from './PackageManager'

;( async () => {
  try {
    // const fsys = new FileSystem({ cwd: './src', debug: true })

    // const { name, path, content } = await fsys.directory('.', { ignore: ['node_modules'] } )
    // await fsys.newFile('dir.json', JSON.stringify( content ) )
    // await fsys.newDir('promo')
    // await fsys.exists('./promo/files')
    // await fsys.move('dir.json', './promo/files/dir.json')
    // await fsys.copy('./promo/files', 'mate') // dir to dir
    // await fsys.copy('./promo/files/dir.jso', './promo/dir.json') // file to file
    // await fsys.copy('./promo/files/dir.json', '.') // file to dir
    // await fsys.rename('dir.json', 'tree.json')
    // await fsys.remove('tree.json')
    // await fsys.remove(['./mate', 'promo'])
    // const 
    // listener = ( event, path, stat ) => console.log( event, path, stat ),
    // watcher = fsys.watch({ ignore: ['.git/**', 'build/**', 'cache/**', 'node_modules/**'] }, listener )


    // const
    // options = {
    //   cwd: './../projects/TestApp',
    //   debug: true,
    //   auth: {
    //     username: 'multipple-dev',
    //     token: 'rF9zpTMYAXSkseVFnHbg'
    //   },
    //   repository: 'https://gitlab.com/multipple/applications/test-app.git'
    // },
    // gp = new GitManager( options )
    
    // await gp.initProject( false, true )
    // await gp.cloneProject( 'https://github.com/multipple/create-app-marko', '../TestApp', true ) 
    // console.log('clear: ', await gp.clear()  )

    // const
    // options = {
    //   manager: 'yarn',
    //   cwd: './../projects/TestApp',
    //   debug: true
    // },
    // pm = new PackageManager( options )

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
    // console.log( await pm.remove('express') )

    // const
    // options = {
    //   cwd: '/Users/fabricemarlboro/dev-pro/Myapp-labs/multiple/Extensions/Notex',
    //   // name: 'sandbox-server',
    //   debug: true,
    //   watcher: ( process, error, stats ) => {
    //     error ?
    //       console.error( error )
    //       : console.log( `${process} -- [${stats.percent}]: ${stats.message}`)
    //   }
    // },
    // em = new Emulator( options )
    
    // console.log( await em.run() )
    // console.log( await em.reload() )
    // console.log( await em.stop() )
    // console.log( await em.metadata() )
    // console.log( await em.exit() )


    // const
    // options = {
    //   debug: true,
    //   watcher: ( process, error, stats ) => {
    //     error ?
    //       console.error( error )
    //       : console.log( `${process} -- [${stats.percent}]: ${stats.message}`)
    //   }
    // },
    // ps = new IProcess( options )
    
    // await ps.setup({
    //   type: 'application',
    //   name: 'TestApp',
    //   description: 'Test multipple micro-application',
    //   scope: {
    //     IDE: {
    //       language: 'marko~5+',
    //       platforms: [ 'multipple~2.0' ],
    //       directory: '/Users/fabricemarlboro/dev-pro/Myapp-labs/Extensions/TestApp',
    //       repository: 'https://gitlab.com/multipple/applications/Test-App'
    //     }
    //   }
    // })
    

  }
  catch( error ){ 
    console.log( error )
  }
} )()

export const init = server => {


  // Use Socket.io Connection between Backend and Frontend in local environment
  const io = socketServer( server )

  // Cubic Server Request channel
  CARConnect( io )
  // File System Transaction channel
  FSTConnect( io )
  // Internal Process Transaction channel
  IPTConnect( io )

  return { io }
}