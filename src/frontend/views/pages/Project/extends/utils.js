
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
    
    let tabs = []
    Array.isArray( arg ) ?
            tabs = newObject( arg ) // Update the whole tabs list
            // Change on single tab
            : tabs = ($.getSection('tabs') || []).map( tab => {
              // Tab already exist
              if( tab.path === arg.path )
                return arg

              return tab
            } )
    
    $.setSection('tabs', tabs )
  }
  
  $.hasCodeSection = () => { return State.project && State.project.specs.code && !isEmpty( State.project.specs.code ) }
  $.hasAPISection = () => { return State.project && Array.isArray( State.project.specs.API ) }
  $.hasSocketSection = () => { return State.project && Array.isArray( State.project.specs.sockets ) }
  $.hasUnitSection = () => { return State.project && Array.isArray( State.project.specs.units ) }

  $.initSection = ( key, defaultValue = null ) => {
    $.setSection( key, $.pstore.get( key ) || defaultValue )
  }
  $.setSection = ( key, value ) => {
    State[ State.activeSection ][ key ] = value
    $.setStateDirty( State.activeSection )
    $.pstore.set( key, value )
  }
  $.getSection = key => {
    return key !== undefined ?
        State[ State.activeSection ][ key ] // Specific field of the section
        : State[ State.activeSection ] // All section set
  }
  $.clearSection = key => {
    // Specific field of the section
    if( key ){
      State[ State.activeSection ][ key ] = null 
      $.pstore.clear( key )
    }
    else State[ State.activeSection ] = {}

    $.setStateDirty( State.activeSection )
  }
}