
import fs from 'fs-inter'
import kebabCase from 'kebab-case'

export const dotCubic = async ({ scope }) => {

  const language = scope.IDE.language.split('~')[0]
  
  return {
    language: scope.IDE.language,
    platforms: scope.IDE.platforms,
    setup: {
      sample: `@git/lib:${language}:multipple.micro~1.0.0`,
      sandbox: `@git/lib:${language}:multipple.sandbox~1.0.0`,
      test: `@npm/lib:multipple:${language}.unit-test~1.0.0`
    },
    emulator: {
      version: '1.0.0',
      env: {
        NODE_ENV: 'development',
        HOST: 'localhost',
        PORT: 33000
      }
    }
  }
}

export const configJson = async ({ name, description, scope }) => {

  let config
  try { config = JSON.parse( await fs.readFile( scope.IDE.directory +'/config.json', 'utf8' ) ) }
  catch( error ){ throw error }
  
  return {
    ...config,
    name,
    description,
    nsi: kebabCase( name ).replace(/^-/, '')
  }
}