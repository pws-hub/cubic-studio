
export const getContent = async path => {
  try { return await ( await fetch( path ) ).text() }
  catch( error ){
    console.log('Error fetching file: ', error )
    return null
  }
}