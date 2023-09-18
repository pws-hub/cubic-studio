import type { Overridables } from '../../types'
import type { User, Member } from '../../types/user'

type OverrideOptions = {
  env: 'development' | 'staging' | 'production'
}

function fullname( profile: User['profile'] ){
  return `${profile.first_name } ${ profile.last_name}`
}

export default ({ env }: OverrideOptions ): Overridables => {
  return {
    // Customize request client handler for multipple API requests
    Request: window.CreateRequest('multipple'),

    // Format suggestion result when searching member to add to workspace
    SearchMemberResult: ({ profile }) => {
      return {
        poster: { type: 'image', value: profile.photo },
        title: fullname( profile ),
        subtitle: profile.email
      }
    },
    // Format multipple's user data to CubicStudio like user data format
    SearchMemberToAdd: ({ profile, account }: User, members: Member[] ) => {
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
        } as Member
    }


  }
}