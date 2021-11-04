import { Asset, Operation, TransactionBuilder, BASE_FEE, Memo } from 'stellar-sdk'

export function paymentSender (server, networkPassphrase, asset, amount, memoMsg) {
  const basePaymentOpts = {
    amount: amount.toString(),
    asset: new Asset(asset.code, asset.issuer)
  }
  const { distributorKeypair } = asset
  const memoText = memoMsg && Memo.text(memoMsg)

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
      let txn = new TransactionBuilder(distributor, transactionOpts)

      txn = txn.addOperation(payment)

      if (memoText) {
        txn = txn.addMemo(memoText)
      }

      txn = txn.build()
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
