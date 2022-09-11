
import fs from 'fs-extra'
import { Router } from 'express'
import { decrypt, encrypt } from '../lib/DTCrypt'

function ruuid(){
  return 'xxxx-xxxx-4xxxx-xxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
      return v.toString(16)
  })
}

const INTERFACES = {
  filesystem: configs => {

    const storePath = configs.path

    async function getCollection(){
      try {
        let content = await fs.readFile(`${storePath}/data`, 'UTF-8')
        if( content ) content = decrypt( content )

        return content || []
      }
      catch( error ) { return [] }
    }
    async function storeCollection( list ){
      await fs.ensureDir( storePath )
      await fs.writeFile(`${storePath}/data`, encrypt( list ), 'UTF-8')
    }

    return {
      insert: async input => {
        if( !input )
          throw new Error('Invalid method call. Expected 1 argument')

        const
        list = await getCollection(),
        sids = [],
        each = metadata => {
          for( const x in list ) {
            const { type, nsi, name, namespace, version } = list[x]

            if( type == metadata.type
                && nsi == metadata.nsi
                && name == metadata.name
                && namespace == metadata.namespace
                && version == metadata.version ) {
              sids.push( list[x].sid ) // Record existing item Store ID (sid)
              return
            }
          }

          const sid = ruuid()
          list.push({ sid, ...metadata })
          sids.push( sid )
        }

        Array.isArray( input ) ? input.map( each ) : each( input )

        // Store update
        await storeCollection( list )

        return Array.isArray( input ) ? sids : sids[0]
      },
      get: async conditions => {
        const list = await getCollection()

        for( const x in list ) {
          const each = list[x]
          let nomatch = false

          for( const key in conditions )
            if( each[ key ] != conditions[ key ] ) {
              nomatch = true
              break
            }

          if( nomatch ) continue
          else return each
        }

        return null
      },
      delete: async sid => {
        const list = await getCollection()

        for( const x in list )
          if( sid == list[x].sid ) {
            list.splice(x, 1)

            // Store update
            await storeCollection( list )
            return 'Deleted'
          }

        throw new Error('Not Found')
      },
      update: async ( sid, updates ) => {
        const list = await getCollection()
        let updated = false

        delete updates.sid // Cannot override sid (unique store id)

        for( const x in list )
          if( sid == list[x].sid ) {
            list[x] = { ...list[x], ...updates }
            updated = true
            break
          }

        // Store updated list
        if( updated ) {
          await storeCollection( list )
          return 'Updated'
        }
        throw new Error('Not Found')
      },
      fetch: async filters => {
        const list = await getCollection()

        // Return all or filtered list
        return !filters ? list : list.filter( each => {
          for( const key in filters )
            if( each[ key ] != filters[ key ] ) return false

          return true
        } )
      }
    }
  },
  mongodb: configs => {

    const {collection} = configs
    if( !collection || !collection.insert )
      throw new Error('Invalid MongoDB Collection Object')

    return {
      insert: async input => {
        if( !input )
          throw new Error('Invalid method call. Expected 1 argument')

        async function checkExists({ type, nsi, namespace }){
          const exists = await collectoin.findOne({ type, nsi, namespace })
          if( !exists ) return

          return exists.sid
        }

        if( Array.isArray( input ) ) {
          const sids = []

          Promise.all( input.map( each => {
            const itemId = checkExists( each )
            if( itemId ) return sids.push( itemId )

            sids.push( each.sid = ruuid() )
            collection.insertOne( each )
          } ) )

          return sids
        }

        const itemId = checkExists( input )
        if( itemId ) return itemId

        input.sid = ruuid()
        await collection.insertOne( input )

        return input.sid
      },
      get: async conditions => { return await collection.findOne( conditions ) },
      fetch: async filters => { return await collection.find( filters || {} ).toArray() },
      update: async ( sid, updates ) => {

        const { acknowledged } = await collection.updateOne({ sid }, { $set: updates })
        if( !acknowledged ) throw new Error('Not Found')

        return 'Updated'
      },
      delete: async sid => {
        const { acknowledged } = await collection.deleteOne({ sid })
        if( !acknowledged ) throw new Error('Not Found')

        return 'Deleted'
      }
    }
  }
}

export default ( configs = {} ) => {

  configs = {
    type: 'filesystem',
    path: `${process.cwd() }/.lpstore`,
    table: null,
    collection: null,
    ...configs
  }

  if( !INTERFACES[ configs.type ] )
    throw new Error(`LSP does not support <${configs.type}> interface`)

  const
  Interface = INTERFACES[ configs.type ]( configs ),
  express = app => {
    const route = Router()
    .use( ( req, res, next ) => {
      if( req.headers['lps-user-agent'] !== 'LPS/RM'
          || req.headers['lps-client-id'] !== 'OPAC-12-09HH--$0' )
        return res.status(403).send('Access Denied')

      next()
    } )
    .post('/', async ( req, res ) => {
      try {
        if( !Object.keys( req.body ).length )
          throw new Error('Invalid Request Body')

        const result = await Interface.insert( req.body )
        res.json({ error: false, result })
      }
      catch( error ) { res.json({ error: true, message: error.message }) }
    })
    .get('/', async ( req, res ) => {
      try {
        if( !Object.keys( req.query ).length )
          throw new Error('Undefined Request Query')

        const result = await Interface.get( req.query )
        res.json({ error: false, result })
      }
      catch( error ) { res.json({ error: true, message: error.message }) }
    })
    .get('/fetch', async ( req, res ) => {
      try {
        const result = await Interface.fetch( req.query || {} )
        res.json({ error: false, result })
      }
      catch( error ) { res.json({ error: true, message: error.message }) }
    })
    .patch('/', async ( req, res ) => {
      try {
        const { sid, updates } = req.body
        if( !sid || typeof updates !== 'object' )
          throw new Error('Invalid Request Parameters')

        if( !Object.keys( updates ).length )
          throw new Error('Undefined Update Fields')

        const result = await Interface.update( sid, updates )
        res.json({ error: false, result })
      }
      catch( error ) { res.json({ error: true, message: error.message }) }
    })
    .delete('/', async ( req, res ) => {
      try {
        if( !req.query.sid )
          throw new Error('Invalid Request Parameters')

        const result = await Interface.delete( req.query.sid )
        res.json({ error: false, result })
      }
      catch( error ) { res.json({ error: true, message: error.message }) }
    })

    app.use('/lpstore', route )
  }

  return { Interface, express }
}