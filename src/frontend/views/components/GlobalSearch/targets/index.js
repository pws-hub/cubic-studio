

import SearchTargetMap from './map'

function deepkey( obj, strKey ){

  if( !strKey.includes('.') )
    return { key: strKey, value: obj }

  const keys = strKey.split('.')
  let key, value = obj

  for( const x in keys ) {
    key = keys[ x ]
    if( !value[ key ] ) return {}

    value = value[ key ]
  }

  return { key, value}
}

export const AVAILABLE_TARGETS = SearchTargetMap

export const ManifestQuery = async ( target, query ) => {

  if( !SearchTargetMap[ target ] )
    throw new Error(`Unknown <${target}> Manifest source`)

  const results = []
  SearchTargetMap[ target ].map( ({ source, name, matchFields, disabled }) => {
    if( disabled ) return

    source.map( each => {
      let match = false

      query.map( word => {
        matchFields.map( field => {
          if( each[ field ] && new RegExp( word, 'i').test( each[ field ] ) )
            match = true
        } )
      } )

      match && results.push({ ...each, _from: name })
    } )
  } )

  return results
}

export const APIQuery = async ( target, query ) => {

  if( !SearchTargetMap[ target ] )
    throw new Error(`Unknown <${target}> API source`)

  const TotalResults = []

  await Promise.all( SearchTargetMap[ target ].map( ({ name, source, resultField, matchFields, disabled }) => {
    if( disabled ) return

    return window
            .fetch(`/proxy?url=${source + query.join('+')}&responseType=json`)
            .then( res => res.json() )
            .then( results => {
              if( resultField ) {
                if( !results[ resultField ] )
                  throw new Error(`Search result field <${resultField}> not found in response`)

                results = results[ resultField ]
              }

              if( !Array.isArray( results ) )
                throw new Error('Invalid search result. <Array> expected')

              if( matchFields )
                results = results.map( item => {
                  const formatedItem = {}
                  matchFields.map( field => {
                    const { key, value } = deepkey( item, field )
                    if( !value ) return

                    formatedItem[ key ] = value
                  } )

                  TotalResults.push({ ...formatedItem, _from: name })
                } )
            } )
  } ) )

  return TotalResults
}