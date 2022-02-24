
import path from 'path'
import { dotCubic, dotGitignore, configJson } from '../../src/core/GenericFile'

;( async () => {
  try {
    // console.log( await dotCubic( dataset ) )
    console.log( await dotGitignore( path.resolve('.') ) )
    // console.log( await configJson( dataset ) )
  }
  catch( error ){ 
    console.log( error )
  }
} )()