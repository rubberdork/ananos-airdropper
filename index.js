import { join } from 'path'
import { readFile } from 'fs/promises'
import { Server } from 'stellar-sdk'
import TOML from '@ltd/j-toml'
import partition from 'lodash.partition'

import { accountValidator } from './lib/account_validator.js'
import { writeErrorReport } from './lib/write_error_report.js'

const [config, addresses] = await Promise.all(
  ['config.toml', 'addresses.txt'].map(f => readFile(f, 'utf8'))
)
const { asset } = TOML.parse(config)
const server = new Server('https://horizon-testnet.stellar.org')
const validateAccount = accountValidator(server, asset)
const accountIDs = addresses.split('\n').filter(s => !!s)

const validatedAccountIDs = await Promise.all(accountIDs.map(validateAccount))
const [validIDs, invalidIDs] = partition(validatedAccountIDs, (id) => typeof id === 'string')

const ERROR_REPORTS_FILE = join('.', 'reports', 'errors.csv')
writeErrorReport(ERROR_REPORTS_FILE, invalidIDs)
console.log(`Found problems with ${invalidIDs.length} addresses. Errors logged in ${ERROR_REPORTS_FILE}`)
