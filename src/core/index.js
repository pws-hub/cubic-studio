
import socketServer from 'socket.io'
import CARConnect from '../lib/Connect/CAR'
import FSTConnect from '../lib/Connect/FST'
import IPTConnect from '../lib/Connect/IPT'
import Synchronizer from '../lib/Synchronizer'

import '../../test'

export const init = server => {

  // Use Socket.io Connection between Backend and Frontend in local environment
  const io = socketServer( server )

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