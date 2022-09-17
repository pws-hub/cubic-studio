'use strict'
import Bx from 'base-x'

function _random( min, max ){
  // Returns random number between defined interval
  return Math.floor( Math.random() * ( max - min )+ min )
}

function _encode( type, body ){
  return Bx( ENCODING_BASES[ type ] ).encode( Buffer.from( body ) )
}

function _decode( type, body ){
  return Bx( ENCODING_BASES[ type ] ).decode( body ).toString()
}

const ENCODING_BASES = {
  'b32': 'ybndrfg8ejkmcpqxot1uwisza345h769',
  'b43': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFG',
  'b58': '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  'b62': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'b64': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  // 'b66': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_+!~'
}

export const encode = ( arg, type ) => {
  // Encoding
  if( !arg ){
    console.log('[ENCODER::ERROR] Invalid Argument')
    return ''
  }

  let argtype = typeof arg, // Input regardless its type: Encoding,
      Bases = Object.keys( ENCODING_BASES ),
      Metadata,
      Body

  arg = argtype == 'object' ? JSON.stringify( arg ) : String( arg )
  type = type && type.toLowerCase()
  Body = _encode( 'b32', arg )

  // Check requested type or assign random type
  if( !type || !Bases.includes( type ) )
    type = Bases[ _random( 0, Bases.length ) ]

  Metadata = '['+ type +'-Encoding]/type:'+ argtype // encoding metadata

  return _encode( type, Body ).split('').reverse().join('') +'$'+ _encode( 'b58', Metadata )
}

export const decode = arg => {
  // Decoding
  if( typeof arg !== 'string' ){
    console.log('[ENCODER::ERROR] Invalid Argument <String Expected>')
    return ''
  }

  let Bases = Object.keys( ENCODING_BASES ),
      [ Body, Metadata ] = arg.split('$')

  if( !Metadata || !Body ) return arg
  Metadata = _decode( 'b58', Metadata )

  let [ fullmatch, type, argtype ] = Metadata.match(/^\[(.+)-Encoding\]\/type:(\w+)/)
  if( !type || !Bases.includes( type ) )
    return arg

  // Decoding type & first seal gate: base32
  Body = _decode( 'b32', _decode( type, Body.split('').reverse().join('') ) )
  
  // Return the argument in its encoding type
  switch( argtype ){
    case 'number': return +Body
    case 'object': return JSON.parse( Body )
    case 'boolean': return Boolean( Body )
    default: return Body // string
  }
}

export default { dictionaries: ENCODING_BASES, encode, decode }
