const fetch = require('node-fetch')
const VirtualModulesPlugin = require('webpack-virtual-modules')

class UCNModulePlugin {
  static defaultOptions = {
    baseURL: 'http://localhost:65000/remote'
  }

  // Any options should be passed in the constructor of your plugin,
  // (this is a public API of your plugin).
  constructor( options = {} ){
    // Applying user-specified options over the default options
    // and making merged options further available to the plugin methods.
    // You should probably validate all the options here as well.
    this.options = { ...UCNModulePlugin.defaultOptions, ...options }
  }

  apply( compiler ) {
    const 
    pluginName = UCNModulePlugin.name,
    virtualModules = new VirtualModulesPlugin()

    // Applying a webpack compiler to the virtual module
    virtualModules.apply( compiler )
    
    // Adding a webpack hook to create new virtual module with swaggerJsDoc() at compile time
    // Consult Swagger UI documentation for the settings passed to swaggerJsDoc()
      compiler.hooks.normalModuleFactory.tap( pluginName, factory => {
        factory.hooks.beforeResolve.tap( pluginName, data => {
          let { request } = data
          const regex = /@ucn\//

          if( !regex.test( request ) ) return

          const resource = request.replace( regex, '')

          fetch(`${this.options.baseURL}/${resource}`)
            .then( res => res.text() )
            .then( content => {
              // Adding new asset to the compilation, so it would be automatically
              // generated by the webpack in the output directory.
              // compilation.emitAsset( this.options.outputFile, new RawSource( content ) )

              // Write new data to the virtual file at compile time
              virtualModules.writeModule(`node_modules/@ucn/${resource}.js`, content )
            } )
            .catch( error => {
              console.log(`Error compiling <${resource}>: ${error.message}`)
              // compilation.errors.push( error )
            } )
        })
      })
  }
}

module.exports = UCNModulePlugin