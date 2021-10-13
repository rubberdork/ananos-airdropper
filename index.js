import { readFile } from 'fs/promises'
import { Server, FederationServer, StrKey } from 'stellar-sdk'
import TOML from '@ltd/j-toml'
import partition from 'lodash.partition'

const [config, addresses] = await Promise.all(
  ['config.toml', 'addresses.txt'].map(f => readFile(f, 'utf8'))
)

const { asset } = TOML.parse(config)
const accountIDs = addresses.split('\n').filter(s => !!s)

const server = new Server('https://horizon-testnet.stellar.org')

async function validateAccount(server, asset, accountID) {
  try {
    if (accountID.indexOf('*') !== -1) {
      // Probably a federated address
      const record = await FederationServer.resolve(accountID)
      return validateAccount(server, asset, record.account_id)
    }

    if (!StrKey.isValidEd25519PublicKey(accountID)) {
      throw new Error('Not a valid public key')
    }

    const account = await server.loadAccount(accountID)

    const hasTrustLine = account.balances.some((bal) => {
      return bal.asset_code === asset.code && bal.asset_issuer === asset.issuer && bal.is_authorized
    })

    if (!hasTrustLine) {
      throw new Error(`No trustline to ${asset.code} found`)
    }

    return accountID
  } catch (e) {
    return { accountID, reason: e.message }
  }
}

const validatedAccountIDs = await Promise.all(
  accountIDs.map((accountID) => validateAccount(server, asset, accountID))
)
const [validIDs, invalidIDs] = partition(validatedAccountIDs, (id) => typeof id === 'string')
console.log(validIDs)
console.log(invalidIDs)
