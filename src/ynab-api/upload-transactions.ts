import { API, Account, SaveTransaction } from 'ynab';
import { TransactionsByAccount } from '../shared';
import { ynabErrorWrapper } from './';

export async function uploadTransactionsToYnab(ynab: API,
                                               transactions: TransactionsByAccount): Promise<void> {
  const accountsByBudget: { [budgetId: string]: Account[] } = {};
  const budgetsResponse = await ynab.budgets.getBudgets().catch(ynabErrorWrapper);
  for (const budget of budgetsResponse.data.budgets) {
    const accountsResponse = await ynab.accounts.getAccounts(budget.id).catch(ynabErrorWrapper);
    accountsByBudget[budget.id] = accountsResponse.data.accounts;
  }

  for (const budgetId in accountsByBudget) {
    const accounts = accountsByBudget[budgetId];
    for (const account of accounts) {
      const pendingTransactions = transactions[account.note];
      if (pendingTransactions && pendingTransactions.length > 0) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 10); // 10 days ago
        const ynabTransactionsResponse = await ynab
          .transactions
          .getTransactionsByAccount(budgetId, account.id, sinceDate);
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
        console.log(`Found ${newTransactions.length} new transactions from ${account.note}`);
        if (newTransactions.length > 0) {
          console.log('Uploading transactions to YNAB...');
          await ynab.transactions.createTransactions(budgetId, {
            transactions: newTransactions
          }).catch(ynabErrorWrapper);
        }
      }
    }
  }
}
