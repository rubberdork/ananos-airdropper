import { FederationServer, StrKey } from 'stellar-sdk'

export function accountValidator (server, asset) {
  return async function validateAccount (accountID) {
    let fedAddress = accountID.fedAddress
    accountID = fedAddress ? accountID.address: accountID

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

      const account = await server.loadAccount(accountID)

      const hasTrustLine = account.balances.some((bal) => {
        return bal.asset_code === asset.code && bal.asset_issuer === asset.issuer && bal.is_authorized
      })

      if (!hasTrustLine) {
        throw new Error(`No trustline to ${asset.code} found`)
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
