
export default Self => {

  Self.em = false
  Self.dpm = false

  const
  State = Self.state,
  EMWatcher = ( error, data ) => {
    if( error ) return console.log('--: ', error )

    const { message, percent, started, killed, exit } = data || {}
    if( killed ) return

    // Process Started
    State.emulator = {
      ...State.emulator,
      process: {
        exit,
        started,
        output: { message, percent }
      }
    }
  }

  Self.FSOperator = async ( action, element ) => {
    switch( action ) {
      case 'new-dir': if( !element.path || !Self.fs ) return
                      await Self.fs.newDir( element.path )
          break
      case 'new-file': if( !element.path || !Self.fs ) return
                      await Self.fs.newFile( element.path )
          break
      case 'rename': if( !element.path || !element.name || !Self.fs ) return
                            await Self.fs.rename( element.path, element.name )
          break
      case 'remove': if( !element.path || !Self.fs ) return
                            await Self.fs.remove( element.path )
          break
      case 'move': if( !element.source || !element.destination || !Self.fs ) return
                          await Self.fs.move( element.source, element.destination )
          break
    }
  }

  Self.PackageOperator = async ( action, packages ) => {

    if( !Self.pm ) {
      debugLog('[AddElement Event] error: Undeclared process manager')
      return
    }

    action = action.replace('-packages', '')

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

    await Self.dpm[ action ]( progress )
    await Self.getDependencies()
  }

  Self.CollectionOperator = async ( action, dataset ) => {
    switch( action ) {
      case 'new-collection': if( !element.path || !Self.fs ) return
                      await Self.Documentation.push({})
          break
    }
  }

  Self.EmulatorOperator = async ( action, options ) => {
    switch( action ) {
      case 'start': {
        // Start emulator
        if( !Self.pm ) {
          debugLog('[Emulator Event] error: Undeclared process manager')
          return
        }

        // Create emulator instance
        if( !Self.em )
          Self.em = Self.pm.Emulator( State.project, EMWatcher )

        // Start
        State.emulatorStatus = 'loading'
        GState.ws.layout({ mode: 'auto' })

        /**
         * TODO: Re-implement emulator metadata cache
         *
         * Try cached metadata to reconnect emulator without
         * restarting it, when project got refreshed and
         * servers are up
         */
        const metadata = await Self.em.start()
        if( !metadata ) {
          State.emulatorStatus = false
          State.emulatorError = 'Emulator failed to start. Check your code and retry'
          return
        }

        State.emulator = metadata
      } break

      case 'restart': {
        // Restart emulator
        if( !Self.pm ) {
          debugLog('[Emulator Event] error: Undeclared process manager')
          return
        }

        // Create emulator instance
        if( !Self.em )
          Self.em = Self.pm.Emulator( State.project, EMWatcher )

        State.emulatorStatus = 'restarting'
        State.emulator = await Self.em.restart()
      } break

      case 'stop': {
        // Stop emulator
        if( !Self.pm ) {
          debugLog('[Emulator Event] error: Undeclared process manager')
          return
        }

        if( !Self.em ) {
          debugLog('[Emulator Event] error: No active Emulator found')
          return
        }

        // Stop
        State.emulator = false
        State.emulatorStatus = 'stopping'

        await Self.em.stop()

        State.emulatorStatus = false
        GState.ws.layout({ mode: 'ns' })
      }
    }
  }
}