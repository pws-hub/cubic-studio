
function fullname( profile ){
  return `${profile.first_name } ${ profile.last_name}`
}

export default ({ env }) => {
  return {
    // Customize request client handler for multipple API requests
    Request: CreateRequest('multipple'),

    // Format suggestion result when searching member to add to workspace
    SearchMemberResult: ({ profile }) => {
      return {
        poster: { type: 'image', value: profile.photo },
        title: fullname( profile ),
        subtitle: profile.email
      }
    },
    // Format multipple's user data to CubicStudio like user data format
    SearchMemberToAdd: ({ profile, account }, members ) => {
      /*
       *If( !account.roles.includes('DEVELOPER') ){
       *  this.state.suggestions = false
       *  this.fhandler.alert( fullname( profile ) +' is not a Developer', 'warning' )
       *  return
       *}
       */

      if( !members.filter( ({ name }) => { return fullname( profile ) == name } ).length )
        return {
          id: window.btoa( profile.email ),
          photo: profile.photo,
          name: fullname( profile ),
          role: 'DEVELOPER', // Default role
          active: false // Disactivated by default
        }
    }


  }
}