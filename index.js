import { join } from 'path'
import { readFile } from 'fs/promises'
import { Server, Networks, Keypair } from 'stellar-sdk'
import TOML from '@ltd/j-toml'
import partition from 'lodash.partition'

import { accountValidator } from './lib/account_validator.js'
import { paymentSender } from './lib/payment_sender.js'
import { writeReport, writeLog } from './lib/write_file.js'

const pub = process.env.PUBLIC === 'true'
const BASEDIR = pub ? '.' : 'test'
const NETWORK = pub ? 'PUBLIC' : 'TESTNET'
const HORIZON_URL = `https://horizon${pub ? '' : '-testnet'}.stellar.org`

const setupFiles = Promise.all([
  'config.toml',
  'addresses.txt',
  'SECRETKEY'
].map(f => readFile(join(BASEDIR, f), 'utf8')))

setupFiles.catch((e) => {
  console.error(`File "${e.path}" not found. Exiting…`)
  process.exit(1)
})

const [config, addresses, secretkey] = await setupFiles

const { asset, airdrop } = TOML.parse(config)
asset.distributorKeypair = Keypair.fromSecret(secretkey.trim())

const server = new Server(HORIZON_URL)
const networkPassphrase = Networks[NETWORK]
const validateAccount = accountValidator(server, asset)
const sendAirdrop = paymentSender(server, networkPassphrase, asset, airdrop.amount)
const accountIDs = addresses.split('\n').filter(s => !!s)
const validatedAccountIDs = await Promise.all(accountIDs.map(validateAccount))
const [validAccounts, invalidAccounts] = partition(validatedAccountIDs, acct => acct.success)

const VALIDATION_ERROR_REPORT = join(BASEDIR, 'reports', 'validation-errors.csv')
writeReport(VALIDATION_ERROR_REPORT, invalidAccounts, ['address', 'fedAddress', 'reason'])
console.log(`Found problems with ${invalidAccounts.length} addresses. Errors logged in ${VALIDATION_ERROR_REPORT}`)

// Send airdrops in series to avoid race conditions and other sequence number
// fuckery.
let dropErrors = []
let dropSuccess = []
for (let acct of validAccounts) {
  const drop = await sendAirdrop(acct.address)
  const status = { ...acct, ...drop }

  if (!status.success) {
    dropErrors.push(status)
  }
}

const AIRDROP_ERROR_REPORT = join(BASEDIR, 'reports', 'airdrop-errors.csv')
writeReport(AIRDROP_ERROR_REPORT, dropErrors, ['address', 'fedAddress', 'reason'])
