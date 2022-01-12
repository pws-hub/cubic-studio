

import _ from 'lodash'
import { getContent } from './fileSystem'

// Use absFilePath as the uri so that LSP could use it.
const absFilePath = filePath => {
  const prjRoot = '/js/'
  if( filePath.startsWith( prjRoot ) ) return filePath

  return prjRoot + filePath
};

const getUri = _.memoize( file => monaco.Uri.file( file ) )
const modelManager = {

  async getModel( filePath, content, noCreate ){

    const absPath = absFilePath( filePath )
    if( !window.monaco ) return null
    
    const uri = getUri( absPath )
    let model = monaco.editor.getModel( uri )

    if( !model && !noCreate ){
      content = await getContent( absPath )
      
      model = monaco.editor.createModel( content || '', null, uri )
      //? respect tabSize option in .prettierrc
      // model.updateOptions({ tabSize: 4 });
    }

    return model
  },

  async reset( filePath ){
    // Set the model content to initial values
    if( !filePath ) return
    filePath = absFilePath( filePath )

    const 
    model = this.getModel( filePath, null, true ),
    content = await getContent( filePath )

    model
    && model.getValue() !== content 
    && model.setValue( content || '' )
  },

  setValue( filePath, content ){
    // Set content value manually
    const model = this.getModel( filePath, null, true )
    model
    && model.getValue() !== content 
    && model.setValue( content )
  },

  getValue( filePath ){
    const model = this.getModel( filePath )
    return model ? model.getValue() : null
  },

  hasModel( filePath ){
    return !!this.getModel( filePath, null, true )
  },
  
  async isChanged( filePath ){
    filePath = absFilePath( filePath )

    const content = await getContent( filePath )
    return filePath 
            && content
            && this.hasModel( filePath )
            && this.getValue( filePath ) !== content
  }
}

export default modelManager