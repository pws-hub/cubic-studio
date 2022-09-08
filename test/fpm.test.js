
import LPSClient from '../src/frontend/lib/LPSClient'
import ProcessManager from '../src/frontend/lib/ProcessManager'

export default async () => {

  const
  configs = {
    CPR: { server: '', accessToken: '' },
    LPS: LPSClient,
    UAT: 'admin'
  },
  pm = new ProcessManager( configs )

  pm
  .on('alert', ( type, body ) => console.log(`Alert: [${type}] - `, body ) )
  .on('refresh', ({ loaded, actives }) => {
    console.log('Loaded: ', loaded )
    console.log('Actives: ', actives )
  })
  .on('permission-request', ({ type, requestor, list }, fn ) => {
    console.log('Ask Permission: ', type, requestor, list )

    // Grant permissions
    fn([
      { type: 'tenant.apps', access: 'GRANTED' },
      { type: 'user.*', access: 'GRANTED' },
      { type: 'tenant.*', access: 'GRANTED' }
    ])
  })

  await pm.load()

  console.log('Threads: ', pm.threads() )
  console.log('Filter: ', pm.filter('LATENT') )
  console.log('Exists: ', pm.exists('c169-8fb8-49b85-c2644dfa') )

  const metadata = pm.metadata('sample-app')
  console.log('Metadata: ', metadata )

  console.log('Permission Requirements: ', pm.requirePermission( metadata ) )

  // Run
  console.log('--Run--')
  pm.run('AssetLib')
  const app = pm.run('SampleApp')

  // Refresh
  console.log('--Refresh--')
  await app.refresh()

  /*
   * Implict Quit
   * console.log('--Implicit Quit--')
   * app.quit()
   */

  // Explicit Quit
  console.log('--Explicit Quit--')
  pm.quit('SampleApp')
}