
export default $ => {

  $.emulator = false
  const State = $.state

  $.RunEmulator = async force => {
    // Run/Stop emulator
    if( !$.pm ){
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }
    
    // Create emulator instance
    if( !$.emulator )
      $.emulator = $.pm.Emulator( State.project )

    // Run
    State.emulatorStatus = 'loading'
    GState.ws.layout({ mode: 'auto' })
    
    /* Try cached config to reconnect emulator without
      restarting it, when project got refreshed and
      servers are up
    */
    const cachedEMImage = !force ? $.pstore.get('emulator') : false
    if( cachedEMImage )
      State.emulator = cachedEMImage
      
    else {
      const metadata = await $.emulator.run()
      if( !metadata ){
        State.emulatorStatus = false
        State.emulatorError = 'Emulator failed to run. Check your code and retry'
        return
      }

      State.emulator = metadata
    }

    State.emulatorStatus = 'running'
    $.pstore.set('emulator', State.emulator )
  }
  $.ReloadEmulator = async () => {
    // Reload emulator
    if( !$.pm ){
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }
    
    // Create emulator instance
    if( !$.emulator )
      $.emulator = $.pm.Emulator( State.project )
    
    State.emulatorStatus = 'reloading'

    State.emulator = await $.emulator.reload()
    State.emulatorStatus = 'running'
  }
  $.QuitEmulator = async () => {
    // Run/Stop emulator
    if( !$.pm ){
      debugLog('[Emulator Event] error: Undeclared process manager')
      return
    }
    
    if( !$.emulator ){
      debugLog('[Emulator Event] error: No active Emulator found')
      return
    }

    // Quit
    State.emulator = false
    State.emulatorStatus = 'stopping'
  
    await $.emulator.quit()
    State.emulatorStatus = false

    GState.ws.layout({ mode: 'ns' })

    // Clear cached config
    $.pstore.clear('emulator')
  }
}