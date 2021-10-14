export function shortenAccountID (accountID) {
  const len = accountID.length
  return accountID.substring(0, 4) + '…' + accountID.substring(len - 4, len)
}
