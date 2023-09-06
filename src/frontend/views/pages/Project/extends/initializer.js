
import PStore from 'all-localstorage'
import SectionManager from 'frontend/lib/SectionManager'

export default Self => {

  Self.sm = false
  Self.pstore = false

  const State = Self.state

  Self.getProject = async ( workspaceId, projectId ) => {
    try {
      const { error, message, project } = await RGet(`/workspaces/${workspaceId}/projects/${projectId}`)
      if( error ) throw new Error( message )

      State.project = project
      await Self.SetupProject()
    }
    catch( error ) {
      console.log('Failed retreiving project: ', error )
      State.project = null

      Self.ongoing({ headline: 'Project Not Found', noLoading: true })
    }
  }
  Self.getDirectory = async path => {
    // Get project directory content
    if( !Self.fs ) return

    const dirOptions = {
      ignore: '\\.git|(.+)\\.lock|\\.sandbox|node_modules',
      subdir: true
    }

    State.Code.directories = await Self.fs.directory( path || null, dirOptions )
    State.Code = newObject( State.Code )
  }
  Self.getDependencies = async section => {
    // Get project dependencies in package.json
    if( !Self.fs ) return

    switch( section || State.activeSection ) {
      // JS/TS project dependencies
      case 'Code': {
        const packageJson = await Self.fs.readFile( 'package.json', { encoding: 'json' } )
        if( !packageJson )
          throw new Error('[Dependency] No package.json file found at the project root')

        const
        { dependencies, devDependencies } = packageJson,
        deps = [],
        collector = async ( name, version, dev ) => {
          // Get more information about the package in node_modules
          let dep = { name, version: version.replace('^', ''), dev }
          try {
            const { description, repository } = await Self.fs.readFile(`./node_modules/${name}/package.json`, { encoding: 'json' } )
            dep = { ...dep, description, repository }
          }
          catch( error ) {
            // Failed fetching package.json of the dependency
          }

          deps.push( dep )
        }

        for( const name in dependencies )
          await collector( name, dependencies[ name ] )

        for( const name in devDependencies )
          await collector( name, devDependencies[ name ], true )

        State.Code.dependencies = deps
        State.Code = newObject( State.Code )
      } break

      // Documentation templates/plugins dependencies
      case 'Documentation': {

        State.Documentation.dependencies = []
      }
    }
  }
  Self.SetupProject = async flag => {
    try {
      if( flag ) Self.flag = flag

      // Locale store for only this project
      Self.pstore = new PStore({ prefix: `cs-${State.project.name}`, encrypt: true })

      // Initialize project sections
      Self.sm = new SectionManager( Self )
      await Self.sm.init()

      // Close active ResetProject modal
      Self.onShowResetProjectToggle( false )
    }
    catch( error ) {
      console.log('Failed setting up project: ', error )
      Self.ongoing({
        noLoading: true,
        headline: 'Project setup failed',
        error: error.message
      })
    }
  }
  Self.DeleteProject = async () => {
    // Close running device
    Self.ongoing({ headline: 'Dropping all running device instances' })
    await Self.DeviceOperator('stop')
    await delay(2)

    // Clear store
    Self.ongoing({ headline: 'Flushing project cache' })
    Self.pstore.flush(`cs-${State.project.name}`)
    await delay(3)

    // Clear directory
    Self.ongoing({ headline: 'Clearing project directory' })
    await Self.fs.remove('')
    Self.setState({
      tabs: [],
      Code: {},
      API: {}
    })
    await delay(5)

    // Delete project specs from cubic server
    Self.ongoing({ headline: 'Deleting project specifications from cubic servers' })
    try {
      const
      url = `/workspaces/${State.workspace.workspaceId}/projects/${State.project.projectId}`,
      { error, message } = await await RDelete( url )

      if( error ) throw new Error( message )
    }
    catch( error ) {}
    await delay(3)

    // Clear open tabs
    Self.ongoing({ headline: 'Clearing project workspace' })
    State.project = false

    // Reset operators
    Self.fs = false // File System (fs)
    Self.pm = false // Process Manager (pm)
    Self.sm = false // Section Manager (sm)
    Self.em = false // Device Manager (em)
    Self.dpm = false // Dependency Package Manager (dpm)
    await delay(2)

    // Move back to workspace
    Self.ongoing( false )
    navigate(`/workspace/${State.workspace.workspaceId}`)
  }
}