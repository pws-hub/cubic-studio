
import fs from 'fs-inter'
import kebabCase from 'kebab-case'

export const dotCubic = async ({ specs }) => {

  const language = specs.code.language.split('~')[0]
  let cubic = {}

  try { cubic = await fs.readJson( specs.code.directory +'/.cubic' ) }
  catch( error ){}
  
  return {
    // Default fields
    language: specs.code.language,
    platforms: specs.code.platforms,
    setup: {
      sample: `@git/lib:${language}:${Configs.INSTANCE_PROVIDER}.micro~1.0.0`,
      sandbox: `@git/lib:${language}:${Configs.INSTANCE_PROVIDER}.sandbox~1.0.0`,
      test: `@npm/lib:${Configs.INSTANCE_PROVIDER}:${language}.unit-test~1.0.0`
    },
    emulator: {
      version: '1.0.0',
      env: {
        NODE_ENV: 'development',
        HOST: 'localhost',
        PORT: 33000
      }
    },
    ...cubic
  }
}

export const configJson = async ({ name, description, specs }) => {

  let config
  try { config = await fs.readJson( specs.code.directory +'/config.json' ) }
  catch( error ){ throw error }
  
  return {
    ...config,
    name,
    description,
    nsi: kebabCase( name ).replace(/^-/, '')
  }
}