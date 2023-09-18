
import http from 'http'
import { Server } from 'socket.io'
import CARConnect from '../lib/Connect/CAR'
import FSTConnect from '../lib/Connect/FST'
import IPTConnect from '../lib/Connect/IPT'
import Synchronizer from '../lib/Synchronizer'

// import '../../../test'

export const init = ( server: http.Server ) => {
  // Use Socket.io Connection between Backend and Frontend in local environment
  const io = new Server( server )

  // Cubic API Request channel
  CARConnect( io )
  // File System Transaction channel
  FSTConnect( io )
  // Internal Process Transaction channel
  IPTConnect( io )
  // Cloud-Local & Backend-Frontend Synchronizer channel
  Synchronizer( io )

  return { io }
}