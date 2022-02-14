
import * as fs from 'fs-extra'

// Cloud Filesystem Interface
export class CloudFS {

  constructor(){

    // TODO: Define credentials & Connect to cloud space

  }

  async exists( path ){

  }
}

export default isOncloud() ? new CloudFS : fs