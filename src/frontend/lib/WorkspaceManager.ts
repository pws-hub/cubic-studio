
export default class WorkspaceManager {
  private __: Marko.Component

  constructor( __: Marko.Component ){
    this.__ = __

    __.setState({
      layouts: [],

      showSearch: false,
      showFeatures: false,
      showExplorer: false,
      showSettings: false,
      showPublisher: false,
      showResetProject: false,
      showDeleteProject: false,
    })
  }

  toggle = {
    feature: args => this.__.setState({ showFeatures: args }),
    search: args => this.__.setState({ showSearch: args }),
    settings: type => this.__.setState({ showSettings: type }),
    publish: status => this.__.setState({ showPublisher: status }),
    console: status => this.__.sm.set('activeConsole', status ),
    explorer: ( status, fn ) => this.__.setState({ showExplorer: status ? { fn } : false })
  }

  layouts = {
    change: blocks => this.__.setStateDirty('layouts' as never, blocks )
  }

  select = {
    menu: name => {
      this.__.setState('activeSection' as never, name )
      this.__.pstore.set('activeSection', name )
    },
    feature: type => {
      switch( type ) {
        case 'plugin':
        case 'component': this.toggle.search({ filters: { targets: [ type ] } }); break
        case 'dependency': this.toggle.search({ filters: { targets: ['package', 'library'] } }); break
        case 'share': this.toggle.settings('share'); break
        case 'publish': this.toggle.publish( true ); break
      }

      this.toggle.feature( false )
    }
  }

  monitor = {
    cursorPosition: position => this.__.setState({ editorCursorPosition: position })
  }
}