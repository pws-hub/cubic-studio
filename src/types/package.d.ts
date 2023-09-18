
export type JSSource = 'npm' | 'cpm'
export type JSPackageAction = 'install' | 'remove' | 'update'
export type JSPackage = {
  item: {
    name: string
    version?: string
  }
}
export type CPackageAction = 'install' | 'publish' | 'update' | 'remove'
export type CPackage = {
  item: {
    name: string
    version?: string
  }
}