import type { ProjectState } from '../../../../../types/project'

export default ( __: Marko.Component ) => {
  const
  State = __.state as ProjectState,
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

  __.FSOperator = async ( action, element ) => {
    switch( action ) {
      case 'new-dir': if( !element.path || !__.fs ) return
                      await __.fs.newDir( element.path )
          break
      case 'new-file': if( !element.path || !__.fs ) return
                      await __.fs.newFile( element.path )
          break
      case 'rename': if( !element.path || !element.name || !__.fs ) return
                            await __.fs.rename( element.path, element.name )
          break
      case 'remove': if( !element.path || !__.fs ) return
                            await __.fs.remove( element.path )
          break
      case 'move': if( !element.source || !element.destination || !__.fs ) return
                          await __.fs.move( element.source, element.destination )
          break
    }
  }

  __.JSPackageOperator = async ( action, packages ) => {
    if( !__.pm ) {
      window.debugLog('[AddElement Event] error: Undeclared process manager')
      return
    }

    const _action = action.replace('-packages', '')

    const
    cwd = State.project?.specs.code.directory,
    progress = ( error, stats ) => {

      if( error ) {
        // TODO: Manage process exception errors
        console.log('--Progress Error: ', error )
        return
      }

      // TODO: Display progression stats on Footer
      __.progression( stats )
    }

    // Dependency Package Manager
    __.dpm = __.pm.JSPackageManager( packages, cwd )

    await __.dpm[ _action ]( progress )
    await __.getDependencies()
  }

  __.CPackageOperator = async ( action, packages ) => {
    if( !__.pm ) {
      window.debugLog('[AddElement Event] error: Undeclared process manager')
      return
    }
    
    const
    cwd = State.project?.specs.code.directory,
    progress = ( error, stats ) => {
      if( error ) {
        // TODO: Manage process exception errors
        console.log('--Progress Error: ', error )
        return
      }

      // TODO: Display progression stats on Footer
      __.progression( stats )
    }

    // Cubic Dependency Package Manager
    __.cpm = __.pm.CPackageManager( packages, cwd )

    await __.cpm[ action ]( progress )
    await __.getDependencies()
  }

  __.CollectionOperator = async ( action, key, element ) => {
    if( !State.activeSection ) return

    switch( action ) {
      case 'add': {
        if( !State[ State.activeSection ].collections )
          State[ State.activeSection ].collections = []

        State[ State.activeSection ].collections.push({ type: State.activeSection.toLowerCase(), _new: true, name: '' })
        __.setStateDirty( State.activeSection as never )
      } break

      case 'rename': {
        if( !Array.isArray( State[ State.activeSection ].collections )
            || !State[ State.activeSection ].collections.length ) return

        State[ State.activeSection ].collections[ key ] = element
        __.setStateDirty( State.activeSection as never )
      } break

      case 'delete': {
        if( !Array.isArray( State[ State.activeSection ].collections )
            || !State[ State.activeSection ].collections.length ) return

        State[ State.activeSection ].collections.splice( key, 1 )
        __.setStateDirty( State.activeSection as never )
      } break
    }
  }

  __.DeviceOperator = async ( action, options = {} ) => {
    if( !State.project ) return
    
    switch( action ) {
      case 'start': {
        // Start device
        if( !__.pm ) {
          window.debugLog('[Device Event] error: Undeclared process manager')
          return
        }

        // Create device instance
        if( !__.em )
          __.em = __.pm.Emulator( State.project, EMWatcher )

        // Start
        State.deviceStatus = 'loading'
        window.GState.ws.layout({ mode: 'auto' })

        /**
         * TODO: Re-implement device metadata cache
         *
         * Try cached metadata to reconnect device without
         * restarting it, when project got refreshed and
         * servers are up
         */
        const metadata = await __.em.start()
        if( !metadata ) {
          State.deviceStatus = false
          State.deviceError = 'Device failed to start. Check your code and retry'
          return
        }

        State.device = metadata
      } break

      case 'restart': {
        // Restart device
        if( !__.pm ) {
          window.debugLog('[Device Event] error: Undeclared process manager')
          return
        }

        // Create device instance
        if( !__.em )
          __.em = __.pm.Emulator( State.project, EMWatcher )

        State.deviceStatus = 'restarting'
        State.device = await __.em.restart()
      } break

      case 'stop': {
        // Stop device
        if( !__.pm ) {
          window.debugLog('[Device Event] error: Undeclared process manager')
          return
        }

        if( !__.em ) {
          window.debugLog('[Device Event] error: No active Device found')
          return
        }

        // Stop
        State.device = false
        State.deviceStatus = 'stopping'

        await __.em.stop()

        State.deviceStatus = false
        window.GState.ws.layout({ mode: 'ns' })
      }
    }
  }
}