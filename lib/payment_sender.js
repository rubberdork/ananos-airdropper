import { Asset, Operation, TransactionBuilder, BASE_FEE } from 'stellar-sdk'

export function paymentSender (server, networkPassphrase, asset, amount) {
  const basePaymentOpts = {
    amount: amount.toString(),
    asset: new Asset(asset.code, asset.issuer)
  }
  const { distributorKeypair } = asset

  return async function sendPayment (accountID) {
    try {
      const distributor = await server.loadAccount(distributorKeypair.publicKey())

      const fee = (await server.fetchBaseFee()) || BASE_FEE
      const transactionOpts = {
        fee,
        networkPassphrase,
        timebounds: await server.fetchTimebounds(100)
      }

      const payment = Operation.payment({ ...basePaymentOpts, destination: accountID })
      const txn = new TransactionBuilder(distributor, transactionOpts)
            .addOperation(payment)
            .build()
      txn.sign(distributorKeypair)

      const result = await server.submitTransaction(txn, { skipMemoRequiredCheck: true })

      return {
        address: accountID,
        success: true,
        tx_hash: result.hash
      }
    } catch (e) {
      return {
        address: accountID,
        success: false,
        reason: e.message,
        errorData: e.response.data
      }
    }
  }
}
