import { FederationServer, StrKey } from 'stellar-sdk'

// https://github.com/stellar/js-stellar-sdk/blob/83e5da182a5c6e89a64ca0a72520a439e964e0ed/src/server.ts#L51-L53
// ACCOUNT_REQUIRES_MEMO is the base64 encoding of "1".
// SEP 29 uses this value to define transaction memo requirements for incoming payments.
const ACCOUNT_REQUIRES_MEMO = 'MQ=='

export function accountValidator (server, asset) {
  return async function validateAccount (accountID) {
    let fedAddress = accountID.fedAddress
    accountID = fedAddress ? accountID.address : accountID

    // Exceptions as control flow. Please forgive me
    try {
      if (accountID.indexOf('*') !== -1) {
        // Probably a federated address
        try {
          const record = await FederationServer.resolve(accountID)
          return validateAccount({
            fedAddress: accountID,
            address: record.account_id
          })
        } catch {
          fedAddress = accountID
          accountID = null
          throw new Error('Federated address could not be resolved')
        }
      }

      if (!StrKey.isValidEd25519PublicKey(accountID)) {
        throw new Error('Not a valid public key')
      }

      let account

      try {
        account = await server.loadAccount(accountID)
      } catch {
        throw new Error('Account not found')
      }

      const hasTrustLine = account.balances.some((bal) => {
        return bal.asset_code === asset.code && bal.asset_issuer === asset.issuer && bal.is_authorized
      })

      if (!hasTrustLine) {
        throw new Error(`No trustline to ${asset.code} found`)
      }

      // An account having a trustline to the asset but requiring a memo is
      // unlikely but is still an error condition. This will also allow
      // safely skipping the memo check in payment operations.
      if (account.data_attr['config.memo_required'] === ACCOUNT_REQUIRES_MEMO) {
        throw new Error('Account requires a memo')
      }

      return {
        fedAddress,
        address: accountID,
        success: true
      }
    } catch (e) {
      return {
        fedAddress,
        address: accountID,
        success: false,
        reason: e.message
      }
    }
  }
}
