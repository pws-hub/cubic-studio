
export type FSOperatorAction = 'new-dir' | 'new-file' | 'rename' | 'remove' | 'move'
export type FSOperatorPayload = { 
  path: string
  name?: string
  source?: string
  destination?: string
}

export type JSPackageOperatorAction = 'install-packages' | 'update-packages' | 'remove-packages' | 'refresh-packages'

export type DeviceOperatorAction = 'start' | 'restart' | 'stop'

export type CollectionOperatorAction = 'add' | 'rename' | 'delete'