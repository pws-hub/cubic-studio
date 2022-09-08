
import ReconnectingWebSocket from 'reconnecting-websocket'
import {
	MonacoLanguageClient,
	CloseAction,
	ErrorAction,
	MonacoServices,
	createConnection
} from '@codingame/monaco-languageclient'
import { listen } from '@codingame/monaco-jsonrpc'

export default ( monaco, language ) => {

  function createLanguageClient( connection ){
		return new MonacoLanguageClient({
			name: `${language.id.toCapitalCase() } LSP Client`,
			clientOptions: {
				// Use a language id as a document selector
				documentSelector: [ language.id ],
				// Disable the default error handler
				errorHandler: {
					error: () => ErrorAction.Continue,
					closed: () => CloseAction.DoNotRestart
				}
			},
			// Create a language client connection from the JSON RPC connection on demand
			connectionProvider: {
				get: ( errorHandler, closeHandler ) => {
					return Promise.resolve( createConnection( connection, errorHandler, closeHandler ) )
				}
			}
		})
  }

  function createWebSocket(){
		const
		socketOptions = {
			maxReconnectionDelay: 10000,
			minReconnectionDelay: 1000,
			reconnectionDelayGrowFactor: 1.3,
			connectionTimeout: 10000,
			maxRetries: Infinity,
			debug: false
		},
		protocol = location.protocol === 'https:' ? 'wss' : 'ws'

		return new ReconnectingWebSocket( `${protocol}://localhost:3000/${language.id}-lsp`, [], socketOptions )
  }

	// Register Monaco languages
	monaco.languages.register( language )
	// Install LSP services
	MonacoServices.install( monaco )

  // Create and establish connection
  const
	webSocket = createWebSocket(),
	onConnection = connection => {
		// Start language client
		const
		languageClient = createLanguageClient( connection ),
		disposable = languageClient.start()

		connection.onClose( () => disposable.dispose() )
	}

  listen({ webSocket, onConnection })
}