
export default Self => {

  Self.em = false
  const
  State = Self.state,
  watcher = ( error, data ) => {
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

  Self.StartEmulator = async force => {
    // Start emulator
    if( !Self.pm ) {
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }

    // Create emulator instance
    if( !Self.em )
      Self.em = Self.pm.Emulator( State.project, watcher )

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
  }
  Self.RestartEmulator = async () => {
    // Restart emulator
    if( !Self.pm ) {
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }

    // Create emulator instance
    if( !Self.em )
      Self.em = Self.pm.Emulator( State.project, watcher )

    State.emulatorStatus = 'restarting'
    State.emulator = await Self.em.restart()
  }
  Self.StopEmulator = async () => {
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