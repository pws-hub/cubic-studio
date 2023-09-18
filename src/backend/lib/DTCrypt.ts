/**
 * -------------------------------------
 *  DTCrypt: Delta Token Data Encryption
 ** --------------------------------------
 *
 * @version 1.0
 * @author Fabrice Marlboro
 *
 */

import CryptoJS from 'crypto-js'
import Randtoken from 'rand-token'

const CryptoJSAesJson = {
  stringify: ( cipherParams: any ) => {

    const obj: { [index: string]: any } = { ct: cipherParams.ciphertext.toString( CryptoJS.enc.Base64 ) }

    if( cipherParams.iv ) obj.iv = cipherParams.iv.toString()
    if( cipherParams.salt ) obj.s = cipherParams.salt.toString()

    return JSON.stringify( obj )
  },
  parse: ( jsonStr: string ) => {
    const
    obj = JSON.parse( jsonStr ),
    cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse( obj.ct ) })

    if( obj.iv ) cipherParams.iv = CryptoJS.enc.Hex.parse( obj.iv )
    if( obj.s ) cipherParams.salt = CryptoJS.enc.Hex.parse( obj.s )

    return cipherParams
  }
}

function reverse( str: string ){
  return str.split('').reverse().join('')
}

/**
 * Encrypt
 *
 * Generate encrypted string token of
 * any typeof data: String, Object, Number, ...
 *
 * @param {mixed} arg
 * @return {string}
 */
export const encrypt = ( arg: any ): string => {
  const
  argtype = typeof arg,
  key = Randtoken.generate(58)

  arg = reverse( argtype == 'object' ? JSON.stringify( arg ) : String( arg ) )

  let
  str = `${CryptoJS.AES.encrypt( arg, key ).toString()}:${argtype}`,
  token = '',
  i = 0

  // Add random string of 8 length here
  str = Randtoken.generate(8) + str + Randtoken.generate(6)

  const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  do {
      let
      a = str.charCodeAt(i++),
      b = str.charCodeAt(i++),
      c = str.charCodeAt(i++)

      a = a ? a : 0
      b = b ? b : 0
      c = c ? c : 0

      let
      b1 = ( a >> 2 ) & 0x3F,
      b2 = ( ( a & 0x3 ) << 4 ) | ( ( b >> 4 ) & 0xF ),
      b3 = ( ( b & 0xF ) << 2 ) | ( ( c >> 6 ) & 0x3 ),
      b4 = c & 0x3F

      if( !b ) b3 = b4 = 64
      else if( !c ) b4 = 64

      token += b64.charAt( b1 ) + b64.charAt( b2 ) + b64.charAt( b3 ) + b64.charAt( b4 )

  } while ( i < str.length )

  return `${token}$${reverse( key )}`
}

/**
 * Decrypt
 *
 * Reverse encrypted string token to its
 * original data format.
 *
 * @param {string} input
 * @return {mixed}
 */
export const decrypt = ( input: string ): unknown => {
  // Default Reverse Encrypting Tool: Modified Base64 decoder
  const
  b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  [ token, key ] = input.split('$')

  let
  predata = '',
  i = 0

  do {
    const
    b1 = b64.indexOf( token.charAt(i++) ),
    b2 = b64.indexOf( token.charAt(i++) ),
    b3 = b64.indexOf( token.charAt(i++) ),
    b4 = b64.indexOf( token.charAt(i++) ),

    a = ( ( b1 & 0x3F ) << 2 ) | ( ( b2 >> 4 ) & 0x3 ),
    b = ( ( b2 & 0xF ) << 4 ) | ( ( b3 >> 2 ) & 0xF ),
    c = ( ( b3 & 0x3 ) << 6 ) | ( b4 & 0x3F )

    predata += String.fromCharCode( a ) + ( b ? String.fromCharCode( b ) : '' ) + ( c ? String.fromCharCode( c ) : '' )
  } while( i < token.length )

  predata = predata.replace( predata.slice( 0, 8 ), '' )
                    .replace( predata.slice( predata.length - 6 ), '' )

  let [ data, datatype ] = predata.split(':')
  data = reverse( CryptoJS.AES.decrypt( data, reverse( key ) ).toString( CryptoJS.enc.Utf8 ) )

  // Return the argument in its encoding type
  switch( datatype ) {
    case 'number': return +data
    case 'object': return JSON.parse( data )
    case 'boolean': return Boolean( data )
    default: return data // String
  }
}

export default { encrypt, decrypt }
