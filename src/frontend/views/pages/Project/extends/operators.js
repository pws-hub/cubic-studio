
export default Self => {

  Self.dpm = false
  const State = Self.state

  Self.FSOperator = async ( type, element ) => {
    switch( type ) {
      case 'new-dir': if( !element.path || !Self.fs ) return
                      await Self.fs.newDir( element.path )
          break
      case 'new-file': if( !element.path || !Self.fs ) return
                      await Self.fs.newFile( element.path )
          break
      case 'rename-element': if( !element.path || !element.name || !Self.fs ) return
                            await Self.fs.rename( element.path, element.name )
          break
      case 'remove-element': if( !element.path || !Self.fs ) return
                            await Self.fs.remove( element.path )
          break
      case 'move-element': if( !element.source || !element.destination || !Self.fs ) return
                          await Self.fs.move( element.source, element.destination )
          break
    }
  }
  Self.PackageOperator = async ( type, packages ) => {

    if( !Self.pm ) {
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
      Self.progression( stats )
    }

    // Dependency Package Manager
    Self.dpm = Self.pm.JSPackageManager( packages, cwd )

    await Self.dpm[ type ]( progress )
    await Self.getDependencies()
  }
}