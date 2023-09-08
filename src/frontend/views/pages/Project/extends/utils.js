
export default __ => {

  const State = __.state

  __.ongoing = labels => {
    if( labels === false ) {
      State.ongoingSetup = false
      return
    }

    State.ongoingSetup = { ...(State.ongoingSetup || {}), ...labels }
  }
  __.progression = stats => {
    // Display ongoing process progression details on Footer
    if( !stats )
      State.ongoingProcess = false

    else {
      const { percent, processor, message } = stats

      State.ongoingProcess = {
        status: percent == 100 ? 'COMPLETED' : 'ONGOING',
        message: `[${percent}%] ${processor ? `${processor }: ` : ''}${message}`
      }
    }
  }
}