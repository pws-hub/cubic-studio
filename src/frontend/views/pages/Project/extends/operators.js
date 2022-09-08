
export default $ => {

  $.packager = false
  const State = $.state

  $.FSOperator = async ( type, element ) => {
    switch( type ) {
      case 'new-dir': if( !element.path || !$.fs ) return
                      await $.fs.newDir( element.path )
          break
      case 'new-file': if( !element.path || !$.fs ) return
                      await $.fs.newFile( element.path )
          break
      case 'rename-element': if( !element.path || !element.name || !$.fs ) return
                            await $.fs.rename( element.path, element.name )
          break
      case 'remove-element': if( !element.path || !$.fs ) return
                            await $.fs.remove( element.path )
          break
      case 'move-element': if( !element.source || !element.destination || !$.fs ) return
                          await $.fs.move( element.source, element.destination )
          break
    }
  }
  $.PackageOperator = async ( type, element ) => {

    if( !$.pm ) {
      debugLog('[AddElement Event] error: Undeclared process manager')
      return
    }

    type = type.replace('-packages', '')

    const
    cwd = State.project.specs.code.directory,
    progress = ( error, stats ) => {

      if( error ) {
        // TODO: Manage process exception errors
        console.log('--Progress Error: ', error )
        return
      }

      // TODO: Display progression stats on Footer
      $.progression( stats )
    }

    $.packager = $.pm.Packager( element, cwd )

    await $.packager[ type ]( progress )
    await $.getDependencies()
  }
}