
export default $ => {

  const State = $.state

  $.ongoing = labels => {

    if( labels === false ){
      State.ongoingSetup = false
      return
    }
    
    State.ongoingSetup = { ...(State.ongoingSetup || {}), ...labels }
  }
  $.progression = stats => {
    // Display ongoing process progression details on Footer
    if( !stats )
      State.ongoingProcess = false

    else {
      const { percent, processor, message } = stats

      State.ongoingProcess = {
        status: percent == 100 ? 'COMPLETED' : 'ONGOING',
        message: `[${percent}%] ${processor ? processor +': ' : ''}${message}`
      }
    }
  }
  $.applyTabsChange = arg => {
    // Apply and reflect changes on tabs
    if( typeof arg !== 'object' ) return
    
    Array.isArray( arg ) ?
            State.tabs = newObject( arg ) // Update the whole tabs list
            // Change on single tab
            : State.tabs = State.tabs.map( tab => {
              // Tab already exist
              if( tab.path === arg.path )
                return arg

              return tab
            } )
    
    $.setStateDirty('tabs')
    $.pstore.set('tabs', State.tabs )
  }
  
  $.hasCodeSection = () => { return State.project && !isEmpty( State.project.specs.code ) }
  $.hasAPISection = () => { return State.project && !isEmpty( State.project.specs.API ) }
  $.hasSocketSection = () => { return State.project && !isEmpty( State.project.specs.sockets ) }
  $.hasUnitSection = () => { return State.project && !isEmpty( State.project.specs.units ) }
}