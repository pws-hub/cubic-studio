
export type Metadata = {
  sid?: string
  type: 'application' | 'plugin' | 'library'
  name: string
  namespace: string
  nsi: string
  description: string
  version: string
  favicon: string
  categories: string[]
  etoken?: string
  sizes?: {
    download?: number
    installation?: number
  }
  runscript?: {
    [index: string]: {
      workspace?: string
      autoload?: boolean
    }
  }
  resource?: {
    dependencies?: string[]
    permissions?: {
      scope?: (string | { type: string, access: string })[]
    }
    services?: { [index: string]: string[] }
  }
  plugins?: {
    [index: string]: Metadata
  }
  libraries?: {
    [index: string]: Metadata
  }
  author: {
    type: string
    name: string
  }
  configs?: { [index: string]: any }
}

export type Project = Metadata & {
  type: 'plugin' | 'application' | 'library'
  name: string
  description: string
  specs: any
}