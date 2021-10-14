import { FederationServer, StrKey } from 'stellar-sdk'

export function accountValidator (server, asset) {
  return async function validateAccount (accountID) {
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
        return bal.asset_code === asset.code && bal.asset_issuer === asset.issuer && bal.is_authorized
      })

      if (!hasTrustLine) {
        throw new Error(`No trustline to ${asset.code} found`)
      }

      return {
        address: accountID,
        success: true
      }
    } catch (e) {
      return {
        address: accountID,
        success: false,
        reason: e.message
      }
    }
  }
}
