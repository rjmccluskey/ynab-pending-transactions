import { API, Account, SaveTransaction } from 'ynab';
import { TransactionsByAccount, Transaction } from '../shared';
import { ynabErrorWrapper } from './';
import { throwMultiple } from '../utils';

export async function uploadTransactionsToYnab(ynab: API,
                                               transactions: TransactionsByAccount): Promise<void> {
  const accountsByBudget = await getAccountsByBudgetId(ynab);

  for (const budgetId in accountsByBudget) {
    const accounts = accountsByBudget[budgetId];
    const results: any[] = await Promise.all(accounts.map(async account => {
      const pendingTransactions = transactions[account.note];
      const error = await uploadTransactionsToAccount(ynab, budgetId, account, pendingTransactions)
        .catch(e => e);
      return error || null;
    }));

    const errors: Error[] = results.filter(result => result !== null);
    if (errors.length > 0) {
      throwMultiple(errors);
    }
  }
}

interface AccountsByBudgetId {
  [budgetId: string]: Account[];
}
async function getAccountsByBudgetId(ynab: API): Promise<AccountsByBudgetId> {
  const accountsByBudget: AccountsByBudgetId = {};
  const budgetsResponse = await ynab.budgets.getBudgets().catch(ynabErrorWrapper);
  for (const budget of budgetsResponse.data.budgets) {
    const accountsResponse = await ynab.accounts.getAccounts(budget.id).catch(ynabErrorWrapper);
    accountsByBudget[budget.id] = accountsResponse.data.accounts;
  }

  return accountsByBudget;
}

async function uploadTransactionsToAccount(ynab: API,
                                           budgetId: string,
                                           account: Account,
                                           pendingTransactions: Transaction[]): Promise<void> {
  if (pendingTransactions && pendingTransactions.length > 0) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 10); // 10 days ago
    const ynabTransactionsResponse = await ynab
      .transactions
      .getTransactionsByAccount(budgetId, account.id, sinceDate)
      .catch(ynabErrorWrapper);
    const ynabTransactions = ynabTransactionsResponse.data.transactions.filter(transaction =>
      transaction.cleared === SaveTransaction.ClearedEnum.Uncleared);

    const newTransactions: SaveTransaction[] = [];
    for (const pendingTransaction of pendingTransactions) {
      const existingTransaction = ynabTransactions.find(ynabTransaction =>
        pendingTransaction.matchesId(ynabTransaction.memo));
      if (!existingTransaction) {
        newTransactions.push({
          account_id: account.id,
          date: pendingTransaction.date,
          amount: pendingTransaction.amount,
          payee_name: pendingTransaction.description,
          cleared: SaveTransaction.ClearedEnum.Uncleared,
          memo: pendingTransaction.getId()
        });
      }
    }

    console.log(`Uploading ${newTransactions.length} new transactions from ${account.note}`);
    if (newTransactions.length > 0) {
      await ynab.transactions.createTransactions(budgetId, {
        transactions: newTransactions
      }).catch(ynabErrorWrapper);
    }
  }
}
