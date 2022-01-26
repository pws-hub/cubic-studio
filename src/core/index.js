
import path from 'path'
import socketServer from 'socket.io'
import FBRConnect from '../lib/Connect/FBR'
import FSTConnect from '../lib/Connect/FST'
import FileSystem from '../lib/FileSystem'
import GitManager from '../lib/GitManager'

;( async () => {
  try {
    // const fsys = new FileSystem({ cwd: './src/core', debug: false })

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
    // watcher = fsys.watch({ ignore: ['./node_modules'] }, listener )

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
    
    // await gp.initProject( true )
    // await gp.cloneProject('https://github.com/multipple/create-app-marko', '../TestApp')

  }
  catch( error ){ 
    console.log( error )
  }
} )()

export const init = server => {


  // Use Socket.io Connection between Backend and Frontend in local environment
  const io = socketServer( server )

  // Frontend-Backend Request channel
  FBRConnect( io )
  // File System Transaction channel
  FSTConnect( io )

  return { io }
}