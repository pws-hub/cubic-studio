

import path from 'path'
import zlib from 'zlib'
import tar from 'tar-fs'
import fs from 'fs-inter'
import crypto from 'crypto'
import request from 'request'
import randtoken from 'rand-token'
import { encode, decode } from '../lib/Encoder'

export default class CUP {
  /**
   * Generate encryption token, cipherkey & initialization
   * vector for .cup package encryption
   *
   * @param {String} passcode     - (Optional) Encryption passcode
   *
   */
  keygen( passcode ){
    passcode = passcode || randtoken.generate(88)
    const iv = crypto.randomBytes(16)

    return {
      etoken: encode({ passcode, iv }),
      key: crypto.createHash('sha256').update( passcode ).digest(),
      iv
    }
  }

  /**
   * Parse encryption token to cipherkey & Initialization Vector
   *
   * @param {Object} etoken     - Project's root directory path
   *
   */
  keypar( etoken ){
    try {
      const { passcode, iv } = decode( etoken )
      if( !passcode || !iv || !iv.type == 'Buffer' )
        throw new Error('Invalid etoken')

      return {
        key: crypto.createHash('sha256').update( passcode ).digest(),
        iv: Buffer( iv.data )
      }
    }
    catch( error ) { return {} }
  }

  /**
   * Generate initial `package.json` and `.metadata`
   *  requirement files at project root.
   *
   * @param {String} rootDir     - Project's root directory path
   * @param {String} filepath    - Destination path for generated .cup file
   * @param {Function} progress  - Process tracking report function
   *
   */
  pack( rootDir, filepath, progress ){
    return new Promise( ( resolve, reject ) => {
      progress( false, null, 'Prepacking & Generating the CUP file')

      // Generate .cup file encryption token, key & iv
      const encryption = this.keygen()
      let prepackSize = 0

      // Writable stream of temporary path of generated .cup
      const writeStream = fs.createWriteStream( filepath )

      writeStream
      .on('finish', () => {
        progress( false, prepackSize, 'Prepack completed!' )
        return resolve({ prepackSize, etoken: encryption.etoken })
      } )
      .on('error', reject )

      // Generate package files
      const
      IGNORE_DIRECTORIES = ['node_modules', 'build', 'dist', 'cache', '.git', '.DS_Store', '.plugin', '.application', '.lib'],
      IGNORE_FILES = ['.gitignore'],
      options = {
        ignore: pathname => {
          // Ignore some folders when packing
          return IGNORE_DIRECTORIES.includes( path.basename( pathname ) )
                  || IGNORE_FILES.includes( path.extname( pathname ) )
        },
        /**
         * Readable: true, // all dirs and files should be readable
         * writable: true // all dirs and files should be writable
         */
      }

      const prepackStream = tar.pack( rootDir, options )

      prepackStream
      .on('data', chunk => {
        prepackSize += chunk.length
        progress( false, prepackSize, 'Prepacking ...' )
      } )
      .on('error', reject )

      const
      zipStream = zlib.createGzip().on('error', reject ),
      cipherStream = crypto.createCipheriv( 'AES-256-CBC', encryption.key, encryption.iv )

      prepackStream
      .pipe( zipStream )
      .pipe( cipherStream )
      .pipe( writeStream )
    } )
  }

  /**
   * Generate initial `package.json` and `.metadata`
   *  requirement files at project root.
   *
   * @param {String} source      - Source path or URL of the .cup file
   * @param {String} directory   - Extraction directory path
   * @param {String} etoken      - CUP package Encryption token
   * @param {Function} progress  - Process tracking report function
   *
   */
  unpack( source, directory, etoken, progress ){
    return new Promise( ( resolve, reject ) => {
      // Get decryption key
      const { key, iv } = this.keypar( etoken )
      if( !key || !iv )
        return reject( new Error('Invalid encryption token') )

      const decipherStream = crypto.createDecipheriv( 'AES-256-CBC', key, iv )

      // .gz format unzipping stream
      const unzipStream = zlib.createGunzip()
      let unpackSize = 0

      unzipStream
      .on('data', chunk => {
        unpackSize += chunk.length
        progress( false, unpackSize, 'Unpacking ...')
      })
      .on('close', () => {
        progress( false, null, 'Unpack completed!')
        resolve({ unpackSize })
      } )
      .on('error', reject )

      // .tar format extracting stream
      const unpackStream = tar.extract( directory ).on( 'error', reject )

      progress( false, null, 'Fetching CUP package ...')
      request
      .get({ url: source, json: true }, error => error && reject( error ) )
      .pipe( decipherStream ) // Decipher package
      .pipe( unzipStream ) // Unzip package
      .pipe( unpackStream ) // Extract/Unpack package content
    })
  }
}
