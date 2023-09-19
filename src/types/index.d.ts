import Express from 'express'
import type { User } from './user'

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
export type EventTracker = ( error: string | boolean, stats?: any ) => void

export type InitialScope = {
  env: 'development' | 'staging' | 'production'
  asm: 'local' | 'cloud'  // Api server mode
  mode: 'local' | 'cloud'  // Workspace app mode
  instance: string
  providers: string[]
  namespaces: {
    CAR: string
    FST: string
    IPT: string
  }
  isConnected: boolean
  user: User
}

export type FrontendRequest = ( url: string, method?: string, body?: any ) => Promise<any>

export type Overridables = {
  Request: FrontendRequest
  SearchMemberResult: ( user: User ) => {
    poster: { type: string, value: string },
    title: string
    subtitle: string
  }
  SearchMemberToAdd: ( user: User, members: Member[] ) => Member
}