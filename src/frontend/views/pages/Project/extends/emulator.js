
export default Self => {

  Self.em = false
  const State = Self.state

  Self.RunEmulator = async force => {
    // Run/Stop emulator
    if( !Self.pm ) {
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }

    // Create emulator instance
    if( !Self.em )
      Self.em = Self.pm.Emulator( State.project )

    // Run
    State.emulatorStatus = 'loading'
    GState.ws.layout({ mode: 'auto' })

    /*
     * Try cached config to reconnect emulator without
     * restarting it, when project got refreshed and
     * servers are up
     */
    const cachedEMImage = !force ? Self.pstore.get('emulator') : false
    if( cachedEMImage )
      State.emulator = cachedEMImage

    else {
      const metadata = await Self.em.run()
      if( !metadata ) {
        State.emulatorStatus = false
        State.emulatorError = 'Emulator failed to run. Check your code and retry'
        return
      }

      State.emulator = metadata
    }

    State.emulatorStatus = 'running'
    Self.pstore.set('emulator', State.emulator )
  }
  Self.ReloadEmulator = async () => {
    // Reload emulator
    if( !Self.pm ) {
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }

    // Create emulator instance
    if( !Self.em )
      Self.em = Self.pm.Emulator( State.project )

    State.emulatorStatus = 'reloading'

    State.emulator = await Self.em.reload()
    State.emulatorStatus = 'running'
  }
  Self.QuitEmulator = async () => {
    // Run/Stop emulator
    if( !Self.pm ) {
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }

    if( !Self.em ) {
      debugLog('[Emulator Event] error: No active Emulator found')
      return
    }

    // Quit
    State.emulator = false
    State.emulatorStatus = 'stopping'

    await Self.em.quit()
    State.emulatorStatus = false

    GState.ws.layout({ mode: 'ns' })

    // Clear cached config
    Self.pstore.clear('emulator')
  }
}