
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
  projectId?: string
  type: 'plugin' | 'application' | 'library'
  name: string
  description: string
  specs: any
}

export type ProjectState = {
  workspace: {
    workspaceId: string
    name: string
  }
  project: Project | null
  env: null
  
  // Sections dataset
  Code: Project['specs'] | {}
  API: any
  Socket: any
  Unit: any
  Roadmap: any
  Documentation: any

  // Active indications
  sections: string[]
  activeSection: string | null
  
  device: {} | false
  deviceError: string | false
  deviceStatus: string | false
  
  ongoingSetup: {} | false
  ongoingProcess: {} | false

  editorCursorPosition: null
}