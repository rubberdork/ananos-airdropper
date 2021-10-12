import { readFile } from 'fs/promises'
import { Server, FederationServer, StrKey } from 'stellar-sdk'
import partition from 'lodash.partition'

const [config, addresses] = await Promise.all([
  readFile('config.json', 'utf8'),
  readFile('addresses.txt', 'utf8')
])

const { ASSET_CODE, ASSET_ISSUER } = JSON.parse(config)
const accountIDs = addresses.split('\n').filter(s => !!s)

const server = new Server('https://horizon-testnet.stellar.org')

async function validateAccount(accountID) {
  try {
    if (accountID.indexOf('*') !== -1) {
      // Probably a federated address
      const record = await FederationServer.resolve(accountID)
      return validateAccount(record.account_id)
    }

    if (!StrKey.isValidEd25519PublicKey(accountID)) {
      throw new Error('Not a valid public key')
    }

    const account = await server.loadAccount(accountID)

    const hasTrustLine = account.balances.some((bal) => {
      return bal.asset_code === ASSET_CODE && bal.asset_issuer === ASSET_ISSUER && bal.is_authorized
    })

    if (!hasTrustLine) {
      throw new Error(`No trustline to ${ASSET_CODE} found`)
    }

    return accountID
  } catch (e) {
    return { accountID, reason: e.message }
  }
}

const validatedAccountIDs = await Promise.all(accountIDs.map(validateAccount))
const [validIDs, invalidIDs] = partition(validatedAccountIDs, (id) => typeof id === 'string')
console.log(validIDs)
console.log(invalidIDs)
