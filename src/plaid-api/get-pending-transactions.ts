import { plaidClient } from './client';
import { config } from '../config';
import { TransactionsByAccount, Transaction } from '../shared';
import * as plaid from 'plaid';
import { DateTime } from 'luxon';

export async function getPendingTransactions(): Promise<TransactionsByAccount> {
  console.log('Searching for pending transactions from bank...');

  const plaidTransactions = await plaidClient.getAllTransactions(
    config.plaidAccessToken,
    getStartDate(),
    getEndDate()
  );
  const transactionsByAccount = plaidTransactions.transactions
    .filter(transaction => transaction.pending)
    .filter(amountIsValid)
    .filter(notATransfer)
    .reduce(transactionsByAccountReducer(plaidTransactions.accounts), {});

  const totalAccounts = Object.keys(transactionsByAccount).length;
  console.log(`Found pending transactions in ${totalAccounts} account(s).`);

  return transactionsByAccount;
}

function transactionsByAccountReducer(accounts: plaid.Account[]):
                                       (
                                         byAccount: TransactionsByAccount,
                                         plaidTransaction: plaid.Transaction
                                       ) => TransactionsByAccount {
  return (byAccount, plaidTransaction) => {
    const accountName = getAccountNameById(accounts, plaidTransaction.account_id);
    const currentTransactions = byAccount[accountName] || [];
    byAccount[accountName] = [
      ...currentTransactions,
      mapPlaidToTransaction(plaidTransaction)
    ];
    return byAccount;
  };
}

function getAccountNameById(accounts: plaid.Account[], accountId: string): string {
  for (const account of accounts) {
    if (account.account_id === accountId && account.name) {
      return account.name;
    }
  }
  throw new Error(`Could not find account name for accountId: ${accountId}`);
}

function mapPlaidToTransaction(plaidTransaction: plaid.Transaction): Transaction {
  return new Transaction(
    getMilliunitAmount(plaidTransaction.amount as number),
    plaidTransaction.date,
    plaidTransaction.name || 'unknown'
  );
}

export function getMilliunitAmount(floatAmount: number): number {
  const milliunitAmount = floatAmount * 1000;
  return Math.round(milliunitAmount) * -1;
}

function amountIsValid(plaidTransaction: plaid.Transaction): boolean {
  return plaidTransaction.amount !== null && plaidTransaction.amount > 1;
}

function notATransfer(plaidTransaction: plaid.Transaction): boolean {
  if (!plaidTransaction.name) {
    return true;
  }
  plaidTransaction.transaction_type
  const match = plaidTransaction.name.match(/transfer/i);
  return match === null;
}

function getEndDate(): string {
  return DateTime.local().setZone('America/Los_Angeles')
    .plus({ days: 2})
    .toISODate();
}

function getStartDate(): string {
  return DateTime.local().setZone('America/Los_Angeles')
    .minus({ days: 10})
    .toISODate();
}
