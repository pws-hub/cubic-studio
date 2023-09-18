
export const parseLink = str => {

  return { HTML: str, cursorPosition: 1 }
}

export const parseStyle = ( type, str ) => {

  let tag, mark
  switch( type ) {
    case 'bold': tag = 'strong'; mark = '*'; break
    case 'italic': tag = 'em'; mark = '_'; break
  }

  let cursorPosition
  const HTML = str
        // Deleting content from right to left
        .replace( new RegExp(`<${tag}>\\${mark}([a-zA-Z_]+)<\/${tag}>`, 'g'), ( match, text ) => { return `${mark}${text}` } )
        // Deleting content from withing to left
        .replace( new RegExp(`<${tag}>([a-zA-Z_]+)\\${mark}<\/${tag}>`, 'g'), ( match, text ) => {
          cursorPosition = 0 // Cursor position 0
          return `<span class="cursor">${text}${mark}</span>`
        } )
        // Inserting new style
        .replace( new RegExp(`\\${mark}([a-zA-Z_]+)\\${mark}`, 'g'), ( match, text ) => {
          cursorPosition = 1 // Cursor position 1
          // Assign style color by variable's availability
          return `<${tag}>${text}</${tag}><span class="cursor">\uFEFF</span>`
        } )

  return { HTML, cursorPosition }
}

export const parseHeading = str => {

  return { HTML: str, cursorPosition: 1 }
}

export const parseBlock = ( type, str ) => {

  return { HTML: str, cursorPosition: 1 }
}

export const parseCode = ( type, str ) => {

  return { HTML: str, cursorPosition: 1 }
}

export const parseTable = str => {

  return { HTML: str, cursorPosition: 1 }
}


export default ( str, parseList ) => {

  if( !Array.isArray( parseList ) || !parseList.length ) {
    console.log('[Markdown]: Undefined Parse List')
    return {}
  }

  let result = { HTML: str }

  parseList.map( each => {
    switch( each ) {
      case 'link': result = parseLink( result.HTML ); break
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikethrough': result = parseStyle( each, result.HTML ); break
      case 'heading': result = parseHeading( result.HTML ); break
      case 'alert':
      case 'blockquote': result = parseBlock( each, result.HTML ); break
      case 'block-code':
      case 'inline-code': result = parseCode( each, result.HTML ); break
      case 'table': result = parseTable( result.HTML ); break
    }
  } )

  return result // { HTML, cursorPosition }
}