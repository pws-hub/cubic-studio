import Express from 'express'
import type { User } from 'user'

declare module 'fs-inter' {}
declare module 'path-inter' {}

declare global {
  namespace Express {
    interface Request {
      session: {
        user?: User
        authError?: any
        isConnected?: boolean
        credentials?: any
      }
    }
  }
}

export type ShellOptions = {
  cwd?: string
  stdio?: 'pipe'
  shell?: string
}

export type ProcessResponse = {
  error: boolean
  message?: string
  [index: string]: any
}
export type ProcessCallback = ( response?: ProcessResponse ) => void
export type ProgressWatcher = ( error: Error | string | boolean, data?: any, byte?: string | number ) => void