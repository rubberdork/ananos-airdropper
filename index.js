import { join } from 'path'
import { readFile } from 'fs/promises'
import { Server, Networks, Keypair } from 'stellar-sdk'
import TOML from '@ltd/j-toml'
import partition from 'lodash.partition'

import { accountValidator } from './lib/account_validator.js'
import { paymentSender } from './lib/payment_sender.js'
import { writeReport, writeLog } from './lib/write_file.js'
import { shortenAccountID } from './lib//shorten_account_id.js'

const args = process.argv.slice(2)
const pub = args[0] === '--public'
const validateOnly = args[1] === '--validate-only'
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

const accountIDs = addresses.split(/\r\n|\r|\n/)
                            .map(s => s.trim())
                            .filter(s => !!s)
                            .filter(s => !s.startsWith('#'))
console.log(`Hardcore validation of ${accountIDs.length} addresses happening. Just a sec`)
const validatedAccountIDs = await Promise.all(accountIDs.map(validateAccount))
const [validAccounts, invalidAccounts] = partition(validatedAccountIDs, acct => acct.success)

const timestamp = Date.now()

const VALIDATION_ERROR_REPORT = join(BASEDIR, 'reports', `validation-errors-${timestamp}.csv`)
await writeReport(VALIDATION_ERROR_REPORT, invalidAccounts, ['address', 'fedAddress', 'reason'])
console.log(`Found ${validAccounts.length} valid accounts`)
console.log(`Found problems with ${invalidAccounts.length} addresses. Errors logged in ${VALIDATION_ERROR_REPORT}\n`)

if (validateOnly) {
  process.exit()
}

console.log(`Sending airdrop to ${validAccounts.length} addresses\n`)
// Send airdrops in series to avoid race conditions and other sequence number
// fuckery.
let airdropResults = []
let airdropErrors = []
for (let acct of validAccounts) {
  const shortID = shortenAccountID(acct.address)

  console.log(`Sending ${airdrop.amount} ${asset.code} to ${shortID}`)
  const drop = await sendAirdrop(acct.address)
  let status = {
    ...acct,
    ...drop,
    result: drop.success ? 'success' : 'failed'
  }

  airdropResults.push(status)

  if (status.success) {
    console.log(`${asset.code} successfully airdropped to ${shortID}`)
    status.tx_link = `https://stellar.expert/explorer/${NETWORK.toLowerCase()}/tx/${status.tx_hash}`
  } else {
    console.log(`Airdrop to ${shortID} failed`)
    airdropErrors.push(status)
  }

  console.log()
}

const AIRDROP_RESULTS_REPORT = join(BASEDIR, 'reports', `airdrop-results-${timestamp}.csv`)
const AIRDROP_ERROR_LOGS = join(BASEDIR, 'logs', `airdrop-errors-${timestamp}.json`)

await writeReport(AIRDROP_RESULTS_REPORT, airdropResults, ['address', 'fedAddress', 'result', 'tx_link', 'reason'])
console.log(`Airdrop finished. Results logged in ${AIRDROP_RESULTS_REPORT}`)

if (airdropErrors.length) {
  await writeLog(AIRDROP_ERROR_LOGS, airdropErrors)
  console.log(`Some errors were encountered. More info in ${AIRDROP_ERROR_LOGS}`)
}
