
export type User = {
  profile: {
    first_name: string
    last_name: string
    email: string
    photo: string
  }
  account: {}
}

export type Member = {
  id: string
  photo: string
  name: string
  role: string,
  active: boolean
}