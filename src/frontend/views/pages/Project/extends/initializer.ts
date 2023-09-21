
import type { Metadata, ProjectState } from '../../../../../types/project'
import type { JSPackageDependency, CPackageDependency } from '../../../../../types/package'
import SectionManager from '../../../../lib/SectionManager'
import WorkspaceManager from '../../../../lib/WorkspaceManager'

export default ( __: Marko.Component ) => {

  __.ws = new WorkspaceManager( __ )
  __.sm = new SectionManager( __ )

  const State = __.state as ProjectState

  __.getProject = async ( workspaceId, projectId ) => {
    try {
      const { error, message, project } = await window.RGet(`/workspaces/${workspaceId}/projects/${projectId}`)
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
      ignore: '^\\.(git|sandbox)|(.+)\\.lock|(.+)-error\\.log|node_modules$',
      subdir: true
    }

    State.Code.directories = await __.fs.directory( path, dirOptions )
    State.Code = window.newObject( State.Code )
  }
  __.getDependencies = async section => {
    // Get project dependencies in package.json
    if( !__.fs ) return

    async function getJSDependencies(){
      const packageJson = await __.fs.readFile( 'package.json', { encoding: 'json' } )
      if( !packageJson )
        throw new Error('[Dependency] No package.json file found at the project root')

      const
      { dependencies, devDependencies } = packageJson,
      deps: JSPackageDependency[] = [],
      collector = async ( name: string, version: string, dev?: boolean ) => {
        // Get more information about the package in node_modules
        let dep: JSPackageDependency = { name, version: version.replace('^', ''), dev }
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

      return deps
    }
    async function getCubicDependencies(){
      const metadata: Metadata = await __.fs.readFile( '.metadata', { encoding: 'json' } )
      if( !metadata )
        throw new Error('[Dependency] No .metadata file found at the project root')
      
      const deps: CPackageDependency[] = []

      if( !metadata.resource )
        throw new Error('[Dependency] No .metadata dependency file found at the project root')

      const
      { dependencies } = metadata.resource,
      collector = async ( reference: string ) => {
        // Get more information about the plugin from CPR
        let dep = window.parsePackageReference( reference )
        if( !dep ) return
        // try {
        //   const { description, repository } = await window.RGet(`/v1/registry/${reference}`)
        //   dep = { ...dep, description, repository }
        // }
        // catch( error ) {
        //   // Failed fetching package.json of the dependency
        // }

        deps.push( dep )
      }

      for( const reference in dependencies )
          await collector( reference )

      return deps
    }

    switch( section || State.activeSection ) {
      // JS/TS project dependencies
      case 'Code': {
        State.Code.dependencies = {
          packages: await getJSDependencies(),
          plugins: await getCubicDependencies()
        }
        State.Code = window.newObject( State.Code )
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
    if( !State.project ) return

    // Close running device
    __.ongoing({ headline: 'Dropping all running device instances' })
    await __.DeviceOperator('stop')
    await window.delay(2)

    // Clear store
    __.ongoing({ headline: 'Flushing project cache' })
    __.pstore.flush(`cs-${State.project.name}`)
    await window.delay(3)

    // Clear directory
    __.ongoing({ headline: 'Clearing project directory' })
    await __.fs.remove('')
    __.setState({
      tabs: [],
      Code: {},
      API: {}
    })
    await window.delay(5)

    // Delete project specs from cubic server
    __.ongoing({ headline: 'Deleting project specifications from cubic servers' })
    try {
      const
      url = `/workspaces/${State.workspace.workspaceId}/projects/${State.project.projectId}`,
      { error, message } = await await window.RDelete( url )

      if( error ) throw new Error( message )
    }
    catch( error ) {}
    await window.delay(3)

    // Clear open tabs
    __.ongoing({ headline: 'Clearing project workspace' })
    State.project = null

    // Reset operators
    // __.fs = undefined // File System (fs)
    // __.pm = undefined // Process Manager (pm)
    // __.sm = undefined // Section Manager (sm)
    // __.em = undefined // Device Manager (em)
    // __.dpm = undefined // Dependency Package Manager (dpm)
    await window.delay(2)

    // Move back to workspace
    __.ongoing( false )
    window.navigate(`/workspace/${State.workspace.workspaceId}`)
  }
}