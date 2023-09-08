
import SectionManager from 'frontend/lib/SectionManager'
import WorkspaceManager from 'frontend/lib/WorkspaceManager'

export default __ => {

  __.ws = new WorkspaceManager( __ )
  __.sm = new SectionManager( __ )

  const State = __.state

  __.getProject = async ( workspaceId, projectId ) => {
    try {
      const { error, message, project } = await RGet(`/workspaces/${workspaceId}/projects/${projectId}`)
      if( error ) throw new Error( message )

      State.project = project
      await __.SetupProject()
    }
    catch( error ) {
      console.log('Failed retreiving project: ', error )
      State.project = null

      __.ongoing({ headline: 'Project Not Found', noLoading: true })
    }
  }
  __.getDirectory = async path => {
    // Get project directory content
    if( !__.fs ) return

    const dirOptions = {
      ignore: '\\.git|(.+)\\.lock|\\.sandbox|node_modules',
      subdir: true
    }

    State.Code.directories = await __.fs.directory( path || null, dirOptions )
    State.Code = newObject( State.Code )
  }
  __.getDependencies = async section => {
    // Get project dependencies in package.json
    if( !__.fs ) return

    switch( section || State.activeSection ) {
      // JS/TS project dependencies
      case 'Code': {
        const packageJson = await __.fs.readFile( 'package.json', { encoding: 'json' } )
        if( !packageJson )
          throw new Error('[Dependency] No package.json file found at the project root')

        const
        { dependencies, devDependencies } = packageJson,
        deps = [],
        collector = async ( name, version, dev ) => {
          // Get more information about the package in node_modules
          let dep = { name, version: version.replace('^', ''), dev }
          try {
            const { description, repository } = await __.fs.readFile(`./node_modules/${name}/package.json`, { encoding: 'json' } )
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
  __.SetupProject = async flag => {
    try {
      if( flag ) __.flag = flag

      // Initialize project sections
      await __.sm.init()

      // Close active ResetProject modal
      __.onShowResetProjectToggle( false )
    }
    catch( error ) {
      console.log('Failed setting up project: ', error )
      __.ongoing({
        noLoading: true,
        headline: 'Project setup failed',
        error: error.message
      })
    }
  }
  __.DeleteProject = async () => {
    // Close running device
    __.ongoing({ headline: 'Dropping all running device instances' })
    await __.DeviceOperator('stop')
    await delay(2)

    // Clear store
    __.ongoing({ headline: 'Flushing project cache' })
    __.pstore.flush(`cs-${State.project.name}`)
    await delay(3)

    // Clear directory
    __.ongoing({ headline: 'Clearing project directory' })
    await __.fs.remove('')
    __.setState({
      tabs: [],
      Code: {},
      API: {}
    })
    await delay(5)

    // Delete project specs from cubic server
    __.ongoing({ headline: 'Deleting project specifications from cubic servers' })
    try {
      const
      url = `/workspaces/${State.workspace.workspaceId}/projects/${State.project.projectId}`,
      { error, message } = await await RDelete( url )

      if( error ) throw new Error( message )
    }
    catch( error ) {}
    await delay(3)

    // Clear open tabs
    __.ongoing({ headline: 'Clearing project workspace' })
    State.project = false

    // Reset operators
    __.fs = false // File System (fs)
    __.pm = false // Process Manager (pm)
    __.sm = false // Section Manager (sm)
    __.em = false // Device Manager (em)
    __.dpm = false // Dependency Package Manager (dpm)
    await delay(2)

    // Move back to workspace
    __.ongoing( false )
    navigate(`/workspace/${State.workspace.workspaceId}`)
  }
}