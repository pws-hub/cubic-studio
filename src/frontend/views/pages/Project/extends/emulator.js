
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

  Self.StartEmulator = 
  Self.RestartEmulator = async () => {
    
  }
  Self.StopEmulator = async () => {
    
  }
}