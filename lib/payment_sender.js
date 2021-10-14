import { Asset, Operation, TransactionBuilder, BASE_FEE, Networks } from 'stellar-sdk'

export async function paymentSender (server, asset, amount) {
  const basePaymentOpts = {
    amount: amount.toString(),
    asset: new Asset(asset.code, asset.issuer)
  }
  const { distributorKeypair } = asset
  const distributor = await server.loadAccount(distributorKeypair.publicKey())
  let seq = distributor.sequence

  return async function sendPayment (accountID) {
    try {
      const fee = (await server.fetchBaseFee()) || BASE_FEE
      const transactionOpts = {
        fee,
        networkPassphrase: Networks.TESTNET,
        timebounds: await server.fetchTimebounds(100)
      }

      const payment = Operation.payment({ ...basePaymentOpts, destination: accountID })
      const txn = new TransactionBuilder(distributor, transactionOpts)
            .addOperation(payment)
            .build()
      txn.sign(distributorKeypair)

      console.log(`Sending ${amount} ${asset.code} to ${accountID}`)
      const result = await server.submitTransaction(txn)
      console.log(`${asset.code} sent to ${accountID}`)

      seq++

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
        errorData: JSON.stringify({ address: accountID, ...e.response.data }, null, 2)
      }
    }
  }
}
