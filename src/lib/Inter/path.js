
import * as path from 'path'

// Cloud Path Interface
export class CloudPath {

  constructor(){

    // TODO: Define credentials & Connect to cloud space

  }

  async resolve( path ){

  }
}

export default isOncloud() ? new CloudPath : path