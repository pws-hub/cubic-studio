
import { loadWASM } from 'onigasm'
import { Registry } from 'monaco-textmate'
import { wireTmGrammars } from 'monaco-editor-textmate'
import languages from './../languages.json'

function getTmGrammar( scopeName ){
  for( const gm in languages )
    if( languages[ gm ].grammar.scopeName === scopeName )
      return languages[ gm ].grammar
}

export const load = async () => {
  try {
    if( window.onigasmLoaded ) return

    await loadWASM('/onigasm.wasm')
    window.onigasmLoaded = true
  }
  catch( error ) { console.log('[Editor] Grammar loader: ', error.message ) }
}

export const registerGrammar = async ( monaco, editor ) => {
  try {
    const registry = new Registry({
      getGrammarDefinition: async scopeName => {
        try {
          const gm = getTmGrammar( scopeName )
          if( !gm ) throw new Error('No such grammar')

          const content = require(`./../tmGrammars/${gm.fileName}`)
          return {
            format: gm.format,
            content: gm.format === 'json' ?
                          content // Parsed JSON data
                          : await ( await fetch( content ) ).text() // Raw text: plist
          }
        }
        catch( error ) { debugLog('Error: ', error ) }
      }
    })

    const grammars = new Map()
    languages.map( ({ id, extensions, aliases, extendConfig, grammar }) => {
      // Set language grammar
      grammars.set( id, grammar.scopeName )
      // Register language
      monaco.languages.register({ id, extensions, aliases })
      // Load custom/extra language configuration
      if( extendConfig )
        monaco.languages.setLanguageConfiguration( id, require(`./../configurations/${id}.json`) )
    } )

    await wireTmGrammars( monaco, registry, grammars, editor )
  }
  catch( error ) {
    console.log( error )
  }
}