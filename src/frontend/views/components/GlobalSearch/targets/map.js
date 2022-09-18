
import COMPONENTS_MANIFEST from 'store/components/manifest.json'

export default {

  plugin: [
    {
      type: 'API',
      name: 'multipple',
      label: 'Multipple',
      description: 'Extensions marketplace',
      website: 'https://marketplace.multipple.com',
      source: 'https://marketplace.getlearncloud.com/v1/extension/search?rst=plugin&query=',
      resultField: 'results',
      matchFields: [ 'nsi', 'name', 'description', 'namespace', 'author', 'category' ]
    }
  ],

  package: [
    {
      type: 'API',
      name: 'npm',
      label: 'NPM',
      description: 'Node Package Manager',
      website: 'https://npmjs.com',
      source: 'https://registry.npmjs.org/-/v1/search?text=',
      resultField: 'objects',
      matchFields: [
        'package.name',
        'package.description',
        'package.version',
        'package.links',
        'package.keywords',
        'package.author',
        'package.publisher',
        'package.date'
      ]
    },
    {
      type: 'API',
      name: 'github',
      label: 'Github',
      description: 'Git Package Manager',
      website: 'https://github.com',
      source: 'https://registry.github.org/-/v1/search?text=',
      resultField: 'objects',
      matchFields: [],
      disabled: true
    }
  ],

  component: [
    {
      type: 'manifest',
      name: 'cubic',
      label: 'Cubic Store',
      description: 'UI Component Store',
      website: 'https://store.cubic.io/components',
      source: COMPONENTS_MANIFEST,
      matchFields: [ 'name', 'description', 'version' ]
    }
  ]
}
