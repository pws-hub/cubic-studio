
const path = require('path')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')

module.exports = {
  options: {
    verbose: false,
    buildType: 'iso',
    cssPrefix: 'static/css',
    jsPrefix: 'static/js',
    mediaPrefix: 'static/media'
  },
  modifyWebpackOptions( opts ){
    const options = opts.options.webpackOptions
    // Add .marko to exlude
    options.fileLoaderExclude = [ /\.marko$/, ...options.fileLoaderExclude ]

    return options
  },
  modifyWebpackConfig({ webpackConfig }){

    // Client.js moved to `/src/frontend` folder
    if( webpackConfig.entry.client )
      webpackConfig.entry.client[1] = path.join( __dirname, '/src/frontend/client' )

    webpackConfig.resolve.extensions = [ ...webpackConfig.resolve.extensions, '.css', '.scss', '.marko' ]
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      ['~']: path.resolve(__dirname, './public'),
      'frontend': path.resolve(__dirname, './src/frontend'),
      // Important modules
      'vscode': require.resolve('@codingame/monaco-languageclient/lib/vscode-compatibility'),
      'fs-inter': require.resolve('./src/backend/lib/Inter/fs'),
      'path-inter': require.resolve('./src/backend/lib/Inter/path'),

      // Important project
      'handlers': path.resolve(__dirname, './custom/handlers'),
      'plugins': path.resolve(__dirname, './custom/plugins'),
      'store': path.resolve(__dirname, './store'),
      'sync': path.resolve(__dirname, './sync')
    }
    webpackConfig.resolve.fallback = {
      ...webpackConfig.resolve.fallback,
      // Assert: require.resolve('assert'),
      path: require.resolve('path-browserify'),
      /*
       * Stream: require.resolve('stream-browserify'),
       * crypto: require.resolve('crypto-browserify')
       */
    }

    webpackConfig.module.rules.push({
      test: /\.marko$/,
      loader: require.resolve('@marko/webpack/loader')
    })
    webpackConfig.module.rules.push({
      test: /\.s[ac]ss$/i,
      use: [
        // Creates `style` nodes from JS strings
        'style-loader',
        // Translates CSS into CommonJS
        'css-loader',
        // Compiles Sass to CSS
        'sass-loader'
      ]
    })
    webpackConfig.module.rules.push({
      test: /\.worker\.(c|m)?js$/i,
      loader: 'worker-loader',
      options: { inline: true }
    })

    const monacoConfig = {
      languages: [
        'css',
        'html',
        'javascript',
        'json',
        'less',
        'scss',
        'typescript'
      ],
    }
    webpackConfig.plugins = [
      ...webpackConfig.plugins,
      new MonacoWebpackPlugin( monacoConfig )
    ]

    return webpackConfig
  }
}