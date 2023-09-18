
import type { Project } from '../../types/project'
import fs from '@cubic-bubble/fs'

export const dotCubic = async ({ specs }: Project ) => {

  const language = specs.code.language.split('~')[0]
  let cubic = {}

  try { cubic = await fs.readJson( `${specs.code.directory }/.cubic` ) }
  catch( error ) {}

  return {
    // Default fields
    language: specs.code.language,
    platforms: specs.code.platforms,
    setup: {
      sample: `@git/lib:${language}:${Configs.INSTANCE_PROVIDER}.micro~1.0.0`,
      sandbox: `@git/lib:${language}:${Configs.INSTANCE_PROVIDER}.sandbox~1.0.0`,
      test: `@npm/lib:${Configs.INSTANCE_PROVIDER}:${language}.unit-test~1.0.0`
    },
    emulator: Configs.DEVICES.emulator || null,
    ...cubic
  }
}

export const dotGitignore = async ( directory: string ) => {
  let gitignore: any = ''

  try { gitignore = await fs.readFile(`${directory }/.gitignore`) }
  catch( error ) {}

  [
    'node_modules',
    'sandbox',
    'build',
    '*.log',
    'yarn.lock'
  ].map( each => { if( !gitignore.includes( each ) ) gitignore += `\n${ each}` } )

  return gitignore
}

export const dotMetadata = async ({ name, nsi, description, specs }: Project ) => {
  let config
  try { config = await fs.readJson( `${specs.code.directory }/.metadata` ) }
  catch( error ) { throw error }

  return {
    ...config,
    name,
    description,
    nsi: nsi || toNSI( name )
  }
}