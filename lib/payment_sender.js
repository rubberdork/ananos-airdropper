import { Asset, Operation, TransactionBuilder, BASE_FEE, Networks } from 'stellar-sdk'

import { shortenAccountID } from './shorten_account_id.js'

export async function paymentSender (server, asset, amount) {
  const basePaymentOpts = {
    amount: amount.toString(),
    asset: new Asset(asset.code, asset.issuer)
  }
  const { distributorKeypair } = asset

  // Get & bump sequence number locally to avoid needing a network hit before
  // each transaction
  const distributor = await server.loadAccount(distributorKeypair.publicKey())
  let seq = distributor.sequence

  return async function sendPayment (accountID) {
    const shortID = shortenAccountID(accountID)

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

      console.log(`Sending ${amount} ${asset.code} to ${shortID}`)
      const result = await server.submitTransaction(txn, { skipMemoRequiredCheck: true })
      console.log(`${asset.code} sent to ${shortID}`)

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
