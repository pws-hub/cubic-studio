
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
    State.device = {
      ...State.device,
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

  Self.CollectionOperator = async ( action, key, element ) => {
    switch( action ) {
      case 'add': {
        if( !State[ State.activeSection ].collections )
          State[ State.activeSection ].collections = []

        State[ State.activeSection ].collections.push({ type: State.activeSection.toLowerCase(), _new: true, name: '' })
        Self.setStateDirty( State.activeSection )
      } break

      case 'rename': {
        if( !Array.isArray( State[ State.activeSection ].collections )
            || !State[ State.activeSection ].collections.length ) return

        State[ State.activeSection ].collections[ key ] = element
        Self.setStateDirty( State.activeSection )
      } break

      case 'delete': {
        if( !Array.isArray( State[ State.activeSection ].collections )
            || !State[ State.activeSection ].collections.length ) return

        State[ State.activeSection ].collections.splice( key, 1 )
        Self.setStateDirty( State.activeSection )
      } break
    }
  }

  Self.DeviceOperator = async ( action, options ) => {
    switch( action ) {
      case 'start': {
        // Start device
        if( !Self.pm ) {
          debugLog('[Device Event] error: Undeclared process manager')
          return
        }

        // Create device instance
        if( !Self.em )
          Self.em = Self.pm.Emulator( State.project, EMWatcher )

        // Start
        State.deviceStatus = 'loading'
        GState.ws.layout({ mode: 'auto' })

        /**
         * TODO: Re-implement device metadata cache
         *
         * Try cached metadata to reconnect device without
         * restarting it, when project got refreshed and
         * servers are up
         */
        const metadata = await Self.em.start()
        if( !metadata ) {
          State.deviceStatus = false
          State.deviceError = 'Device failed to start. Check your code and retry'
          return
        }

        State.device = metadata
      } break

      case 'restart': {
        // Restart device
        if( !Self.pm ) {
          debugLog('[Device Event] error: Undeclared process manager')
          return
        }

        // Create device instance
        if( !Self.em )
          Self.em = Self.pm.Emulator( State.project, EMWatcher )

        State.deviceStatus = 'restarting'
        State.device = await Self.em.restart()
      } break

      case 'stop': {
        // Stop device
        if( !Self.pm ) {
          debugLog('[Device Event] error: Undeclared process manager')
          return
        }

        if( !Self.em ) {
          debugLog('[Device Event] error: No active Device found')
          return
        }

        // Stop
        State.device = false
        State.deviceStatus = 'stopping'

        await Self.em.stop()

        State.deviceStatus = false
        GState.ws.layout({ mode: 'ns' })
      }
    }
  }
}