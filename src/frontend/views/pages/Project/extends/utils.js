
export default Self => {

  const State = Self.state

  Self.ongoing = labels => {
    if( labels === false ) {
      State.ongoingSetup = false
      return
    }

    State.ongoingSetup = { ...(State.ongoingSetup || {}), ...labels }
  }
  Self.progression = stats => {
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
  Self.applyTabsChange = arg => {
    // Apply and reflect changes on tabs
    if( typeof arg !== 'object' ) return

    let tabs = []
    Array.isArray( arg ) ?
            tabs = newObject( arg ) // Update the whole tabs list
            // Change on single tab
            : tabs = (Self.getSection('tabs') || []).map( tab => {
              // Tab already exist
              if( tab.path === arg.path )
                return arg

              return tab
            } )

    Self.setSection('tabs', tabs )
  }

  Self.hasRoadmapSection = () => { return State.project && State.project.specs.roadmap && !isEmpty( State.project.specs.roadmap ) }
  Self.hasCodeSection = () => { return State.project && State.project.specs.code && !isEmpty( State.project.specs.code ) }
  Self.hasAPISection = () => { return State.project && Array.isArray( State.project.specs.API ) }
  Self.hasSocketSection = () => { return State.project && Array.isArray( State.project.specs.sockets ) }
  Self.hasUnitSection = () => { return State.project && Array.isArray( State.project.specs.units ) }
  Self.hasDocSection = () => { return State.project && Array.isArray( State.project.specs.documentations ) }

  Self.initSection = ( key, defaultValue = null ) => {
    Self.setSection( key, Self.pstore.get( key ) || defaultValue )
  }
  Self.setSection = ( key, value ) => {
    // if( !State[ State.activeSection ] ) return

    State[ State.activeSection ][ key ] = value
    Self.setStateDirty( State.activeSection )
    Self.pstore.set( key, value )
  }
  Self.getSection = key => {
    return key !== undefined && State[ State.activeSection ] ?
        State[ State.activeSection ][ key ] // Specific field of the section
        : State[ State.activeSection ] // All section set
  }
  Self.clearSection = key => {
    // Specific field of the section
    if( key ) {
      State[ State.activeSection ][ key ] = null
      Self.pstore.clear( key )
    }
    else State[ State.activeSection ] = {}

    Self.setStateDirty( State.activeSection )
  }
}