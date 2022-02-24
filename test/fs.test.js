
import FileSystem from '../src/core/FileSystem'

;( async () => {
  try {
    const fs = new FileSystem({ cwd: './src', debug: true })

    const { name, path, content } = await fs.directory('.', { ignore: ['node_modules'] } )
    await fs.newFile('dir.json', JSON.stringify( content ) )
    await fs.newDir('promo')
    await fs.exists('./promo/files')
    await fs.move('dir.json', './promo/files/dir.json')
    await fs.copy('./promo/files', 'mate') // dir to dir
    await fs.copy('./promo/files/dir.jso', './promo/dir.json') // file to file
    await fs.copy('./promo/files/dir.json', '.') // file to dir
    await fs.rename('dir.json', 'tree.json')
    await fs.remove('tree.json')
    await fs.remove(['./mate', 'promo'])
    const 
    listener = ( event, path, stat ) => console.log( event, path, stat ),
    watcher = fs.watch({ ignore: ['.git/**', 'build/**', 'cache/**', 'node_modules/**'] }, listener )
  }
  catch( error ){ 
    console.log( error )
  }
} )()