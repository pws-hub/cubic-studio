
import LPSClient from '../src/frontend/lib/LPSClient'

export default async () => {

  const
  appConfig = {
    type: 'application',
    name: 'SampleApp',
    namespace: 'multipple',
    nsi: 'sample-app',
    description: 'Sample micro-application',
    version: '2.0',
    favicon: 'favicon.png',
    categories: ['test'],
    runscript: {
      '*': {
        workspace: 'qs',
        autoload: true
      }
    },
    resource: {
      dependencies: [ 'plugin:multipple.asset-lib~1.0' ],
      permissions: {
        scope: [
          'tenant.apps',
          { type: 'user.*', access: 'GRANTED' },
          { type: 'tenant.*', access: 'GRANTED' }
        ]
      },
      services: {}
    },
    author: {
      type: 'developer',
      name: 'Multipple'
    },
    maintainers: [
      {
        name: 'Fabrice Marlboro',
        email: 'fabrice.xyclone@gmail.com'
      }
    ],
    bugs: 'https://github.com/sampleApp/issues',
    docs: 'https://docs.sampleapp.com'
  },
  pluginConfig = {
    type: 'plugin',
    name: 'AssetLib',
    namespace: 'multipple',
    nsi: 'asset-lib',
    description: 'Display, Search Documents, Books, Lessons, ...',
    version: '1.0',
    favicon: 'favicon.png',
    categories: ['library'],
    author: {
      type: 'developer',
      name: 'Multipple'
    },
    maintainers: [
      {
        name: 'Fabrice Marlboro',
        email: 'fabrice.xyclone@gmail.com'
      }
    ]
  }

  console.log( await LPSClient.set( appConfig ) )
  console.log( await LPSClient.set( pluginConfig ) )

  console.log( await LPSClient.fetch() )

  const metadata = await LPSClient.get({ name: 'SampleApp' })
  console.log( metadata )

  /*
   * If( metadata && metadata.sid ){
   *   console.log( await LPSClient.update( metadata.sid, { namespace: 'made' }) )
   *   console.log( await LPSClient.fetch({ type: 'app' }) )
   *   console.log( await LPSClient.remove( metadata.sid ) )
   *   console.log( await LPSClient.get({ namespace: 'made' }) )
   * }
   */
}