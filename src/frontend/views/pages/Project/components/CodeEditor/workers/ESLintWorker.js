
import ESLint from './eslint.bundle'

self.addEventListener( 'message', event => {
  const { code, version } = event.data

  try {
    const 
    ESLintConfig = {}
    markers = ESLint.verify( code, ESLintConfig )
                    .map( ({ line, column, message, ruleId }) => ({
                      startLineNumber: line,
                      endLineNumber: line,
                      startColumn: column,
                      endColumn: column,
                      message: `${message} (${ruleId})`,
                      severity: 3,
                      source: 'ESLint',
                    }))

    self.postMessage({ markers, version })
  }
  catch( error ){}
})