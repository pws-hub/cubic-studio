
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
    
    webpackConfig.resolve.extensions = [ ...webpackConfig.resolve.extensions, '.css', '.scss', '.marko' ]
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias, 
      ['~']: path.resolve(__dirname, 'src')
    }
    // webpackConfig.resolve.fallback = { 
    //   ...webpackConfig.resolve.fallback,
    //   assert: require.resolve('assert'),
    //   stream: require.resolve('stream-browserify'),
    //   crypto: require.resolve('crypto-browserify')
    // }

    webpackConfig.module.rules.push({
      test: /\.marko$/,
      loader: require.resolve('@marko/webpack/loader')
    })
    webpackConfig.module.rules.push({
      test: /\.s[ac]ss$/i,
      use: [
        // Creates `style` nodes from JS strings
        "style-loader",
        // Translates CSS into CommonJS
        "css-loader",
        // Compiles Sass to CSS
        "sass-loader"
      ]
    })

    const monacoConfig = {
      languages: [
        'abap',
        'apex',
        'azcli',
        'bat',
        'cameligo',
        'clojure',
        'coffee',
        'cpp',
        'csharp',
        'csp',
        'css',
        'dockerfile',
        'fsharp',
        'go',
        'graphql',
        'handlebars',
        'html',
        'ini',
        'java',
        'javascript',
        'json',
        'kotlin',
        'less',
        'lua',
        'markdown',
        'mips',
        'msdax',
        'mysql',
        'objective-c',
        'pascal',
        'pascaligo',
        'perl',
        'pgsql',
        'php',
        'postiats',
        'powerquery',
        'powershell',
        'pug',
        'python',
        'r',
        'razor',
        'redis',
        'redshift',
        'restructuredtext',
        'ruby',
        'rust',
        'sb',
        'scheme',
        'scss',
        'shell',
        'solidity',
        'sophia',
        'sql',
        'st',
        'swift',
        'tcl',
        'twig',
        'typescript',
        'vb',
        'xml',
        'yaml',
      ],
    }
    webpackConfig.plugins = [ 
      ...webpackConfig.plugins, 
      new MonacoWebpackPlugin() 
    ]
    
    return webpackConfig
  }
}