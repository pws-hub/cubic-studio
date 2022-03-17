

import COMPONENTS_MANIFEST from 'store/components/manifest.json'

function deepkey( obj, strKey ){

  if( !strKey.includes('.') ) 
    return { key: strKey, value: obj }

  const keys = strKey.split('.')
  let key, value = obj
  
  for( const x in keys ){
    key = keys[ x ]
    if( !value[ key ] ) return {}

    value = value[ key ]
  }

  return { key, value}
}

export const AVAILABLE_SOURCES = {
  // application: {
  //   type: 'API',
  //   source: 'https://marketplace.multipple.com/search?rst=application&q=',
  //   resultField: 'results',
  //   matchFields: [ 'nsi', 'name', 'description', 'namespace', 'author', 'category' ]
  // },
  plugin: {
    type: 'API',
    source: 'https://marketplace.getlearncloud.com/v1/extension/search?rst=plugin&query=',
    resultField: 'results',
    matchFields: [ 'nsi', 'name', 'description', 'namespace', 'author', 'category' ]
  },
  // library: {
  //   type: 'API',
  //   source: 'https://cpm.cubic.studio/v1/search?q=',
  //   matchFields: [ 'name', 'description', 'version' ]
  // },
  package: {
    type: 'API',
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
  component: {
    type: 'manifest',
    source: COMPONENTS_MANIFEST,
    matchFields: [ 'name', 'description', 'version' ]
  }
}

export const ManifestQuery = async ( type, query ) => {

  if( !AVAILABLE_SOURCES[ type ] )
    throw new Error(`Unknown <${type}> Manifest source`)

  const 
  { source, matchFields } = AVAILABLE_SOURCES[ type ],
  results = []

  source.map( each => {
    let match = false

    query.map( word => {
      matchFields.map( field => {
        if( each[ field ] && new RegExp( word, 'i').test(each[ field ]  ) )
          match = true
      } )
    } )

    if( match ) results.push( each )
  } )

  return results
}

export const APIQuery = async ( type, query ) => {

  if( !AVAILABLE_SOURCES[ type ] )
    throw new Error(`Unknown <${type}> API source`)

  const { source, resultField, matchFields } = AVAILABLE_SOURCES[ type ]
  let results = await ( await window.fetch(`/proxy?url=${source + query.join('+')}&responseType=json`) ).json()
  
  if( resultField ){
    if( !results[ resultField ] )
      throw new Error(`Search result field <${resultField}> not found in response`)

    results = results[ resultField ]
  }

  if( !Array.isArray( results ) )
    throw new Error(`Invalid search result. <Array> expected`)

  if( matchFields )
    results = results.map( item => {
      const formatedItem = {}
      matchFields.map( field => {
        const { key, value } = deepkey( item, field )
        if( !value ) return

        formatedItem[ key ] = value
      } )

      return formatedItem
    } )

  return results
}