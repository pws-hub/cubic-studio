
export type JSSource = 'npm' | 'cpm'
export type JSPackageAction = 'install' | 'remove' | 'update'
export type JSPackage = {
  item: {
    name: string
    version?: string
  }
}
export type JSPackageDependency = {
  name: string
  version: string
  dev?: boolean // Dependency for only development 
  description?: string
  repository?: string
}
export type CPackageAction = 'install' | 'publish' | 'update' | 'remove'
export type CPackage = {
  item: {
    name: string
    version?: string
  }
}
export type CPackageDependency = {
  type: string
  namespace: string
  nsi: string
  version?: string
  description?: string
  repository?: string
}