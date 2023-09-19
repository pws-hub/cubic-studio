
export type User = {
  id: string
  photo: string
  username: string
  name: string
  role: string
  active: boolean
  bio?: string
  provider?: string // User auth & info provider: multipple, github, ...
}