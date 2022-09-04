
import fs from 'fs-extra'
import { decrypt, encrypt } from './DTCrypt'

function ruuid(){
  return 'xxxx-xxxx-4xxxx-xxxxxxxx'.replace(/[xy]/g, c => {
      let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
      return v.toString(16)
  })
}

const INTERFACES = {
  filesystem: configs => {

    const storePath = configs.path
    fs.ensureDir( storePath )

    async function getCollection(){
      try {
        let content = await fs.readFile(`${storePath}/.cps`, 'UTF-8')
        if( content ) content = decrypt( content )

        return content || []
      }
      catch( error ){ return [] }
    }
    async function storeCollection( list ){
      await fs.writeFile(`${storePath}/.cps`, encrypt( list ), 'UTF-8')
    }
    
    return {
      insert: async input => {
        if( !input )
          throw new Error('Invalid method call. Expected 1 argument')

        const 
        list = await getCollection(),
        mids = [],
        each = metadata => {
          for( const x in list ){
            const { type, nsi, name, namespace, version } = list[x]

            if( type == metadata.type 
                && nsi == metadata.nsi
                && name == metadata.name
                && namespace == metadata.namespace
                && version == metadata.version )
            throw new Error('Already exists')
          }
          
          const mid = ruuid()
          list.push({ mid, ...metadata })
          mids.push( mid )
        }
        
        Array.isArray( input ) ? input.map( each ) : each( input )

        // Store update
        await storeCollection( list )

        return Array.isArray( input ) ? mids : mids[0]
      },
      get: async conditions => {
        const list = await getCollection()

        for( const x in list ){
          const each = list[x]

          for( const key in conditions )
            if( each[ key ] != conditions[ key ] ) continue
          
          return each
        }

        return null
      },
      delete: async mid => {
        const list = await getCollection()

        for( const x in list )
          if( mid == list[x].mid ){
            list.splice(x, 1)

            // Store update
            await storeCollection( list )
            return 'Deleted'
          }

        throw new Error('Not Found')
      },
      update: async ( mid, updates ) => {
        const list = await getCollection()

        for( const x in list )
          if( mid == list[x].mid ){
            list[x] = { ...list[x], ...updates }

            // Store update
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

    const collection = configs.collection
    if( !collection || !collection.insert )
      throw new Error('Invalid MongoDB Collection Object')

    return {
      insert: async input => {
        if( !input )
          throw new Error('Invalid method call. Expected 1 argument')
        
        if( Array.isArray( input ) ){
          const mids = []
          input = input.map( each => {
            mids.push( each.mid = ruuid() )
            return each
          } )
          
          await collection.insertMany( input )
          return mids
        }
        else {
          input.mid = ruuid()
          await collection.insert( input )

          return input.mid
        }
      },
      get: async conditions => { return await collection.findOne( conditions ) },
      fetch: async filters => { return await collection.find( filters || {} ).toArray() },
      update: async ( mid, updates ) => {

        const { acknowledged } = await collection.updateOne({ mid }, { $set: updates })
        if( !acknowledged ) throw new Error('Not Found')

        return 'Updated'
      },
      delete: async mid => {
        const { acknowledged } = await collection.deleteOne({ mid })
        if( !acknowledged ) throw new Error('Not Found')

        return 'Deleted'
      }
    }
  }
}

export default ( configs = {} ) => {

  configs = {
    type: 'filesystem',
    path: process.cwd() +'/.lpstore',
    table: null,
    collection: null,
    ...configs
  }

  if( !INTERFACES[ configs.type ] )
    throw new Error(`LSP does not support <${configs.type}> interface`)

  const
  Interface = INTERFACES[ configs.type ]( configs ),
  express = app => {
    app
    .post('/lpstore', async ( req, res ) => {
      try {
        const result = await Interface.insert( req.body )
        res.json({ error: false, result })
      }
      catch( error ){ res.json({ error: true, message: error.message }) }
    })
    .get('/lpstore', async ( req, res ) => {
      try {
        const result = await Interface.get( req.query )
        res.json({ error: false, result })
      }
      catch( error ){ res.json({ error: true, message: error.message }) }
    })
    .get('/lpstore/fetch', async ( req, res ) => {
      try {
        const result = await Interface.fetch( req.query )
        res.json({ error: false, result })
      }
      catch( error ){ res.json({ error: true, message: error.message }) }
    })
    .patch('/lpstore', async ( req, res ) => {
      try {
        const result = await Interface.update( req.body.id, req.body.updates )
        res.json({ error: false, result })
      }
      catch( error ){ res.json({ error: true, message: error.message }) }
    })
    .delete('/lpstore', async ( req, res ) => {
      try {
        const result = await Interface.delete( req.query.id )
        res.json({ error: false, result })
      }
      catch( error ){ res.json({ error: true, message: error.message }) }
    })
  }

  return { Interface, express }
}