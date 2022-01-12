
import express from 'express'
import './globals/node'
import app from './app'

if( process.env.NODE_ENV == 'development' && module.hot )
  module.hot.accept( './app', () => {
    console.log('[HMR] Reloading `./app`...')

    try { app = require('./app').default } 
    catch( error ){ console.error( error ) }
  })

const port = process.env.HTTP_PORT || 9000

export default express()
.use( ( req, res ) => app.handle( req, res ) )
.listen( port, error => {
  if( error ){
    console.error( error )
    return
  }

  console.log(`> Started on port ${port}`)
})