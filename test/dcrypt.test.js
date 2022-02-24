
import DTCrypt from '../src/lib/DTCrypt'

const
// input = 'Sample string to encypt'
// input = 12976736092639
input = { name: 'Gnimy', email: 'elem@mail.com' }

// Encrypt
const encrypted = DTCrypt.encrypt( input )
console.log('Encrypted:', encrypted )

// Decrypt
const decrypted = DTCrypt.decrypt( encrypted )
console.log('Decrypted:', typeof decrypted, decrypted )