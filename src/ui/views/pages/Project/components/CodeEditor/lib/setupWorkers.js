/* eslint-disable import/no-webpack-loader-syntax */
import SyntaxHighlightWorker from './../workers/syntax-highlighter.worker'
// import LinterWorker from './workers/linter/index.worker'

let 
syntaxWorker,
editor,
monaco

function setupWorkers( _editor, _monaco ){
  editor = _editor
  monaco = _monaco

  syntaxWorker = new SyntaxHighlightWorker()
  syntaxWorker.addEventListener( 'message', event => {
    const { classifications, version } = event.data
    requestAnimationFrame( () => processDecoration( classifications, version ) )
  })
  
  editor.onDidChangeModelContent( syntaxHighlight )
  editor.onDidChangeModel( syntaxHighlight )

  requestAnimationFrame( syntaxHighlight ) // First time load

  return {
    syntaxWorker
  }
}

function syntaxHighlight(){
  
  const model = editor.getModel()
  if( !model ) return

  if( !model.file || !/\.(js|jsx|marko|ts|tsx|mjs|cjs)$/.test( model.file.path ) ) return
  
  // Reset the markers
  monaco.editor.setModelMarkers( model, 'eslint', [] )
  // Send the code to the worker
  syntaxWorker.postMessage({
    title: model.file.name,
    code: model.getValue(),
    // Unique identifier to avoid displaying outdated validation
    version: model.getVersionId()
  })
}

function processDecoration( classifications, version ){
  
  const model = editor.getModel()
  if( model && model.getVersionId() !== version ) return

  const decorations = classifications.map( ({ type, startLine, start, endLine, end, kind, parentKind }) => ({
                                        range: new monaco.Range( startLine, start, endLine, end ),
                                        options: { 
                                          inlineClassName: type ? `${kind} ${type}-of-${parentKind}` : kind
                                        }
                                      }))

  model.decorations = editor.deltaDecorations( model.decorations || [], decorations )
}

export default setupWorkers