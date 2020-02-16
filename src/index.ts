import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { login, getPendingTransactions } from './wf';
import { API, Account, SaveTransaction } from 'ynab';
import { config, NodeEnv } from './config';
import { handledAsync, retryable } from './utils';
import { TransactionsByAccount } from './shared';

puppeteer.use(StealthPlugin());
const ynab = new API(config.ynabToken);

let findAndUploadTransactions = handledAsync(async () => {
    const transactions = await scrapeWfPendingTransactions();
    await uploadTransactionsToYnab(transactions);
}, handleError);

if (config.nodeEnv === NodeEnv.prod) {
  findAndUploadTransactions = retryable(findAndUploadTransactions);
}

export const main = findAndUploadTransactions;

let browser: Browser|null;

async function handleError(e: Error): Promise<void> {
  if (browser) {
    await browser.close();
  }
  throw e;
}

async function scrapeWfPendingTransactions(): Promise<TransactionsByAccount> {
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
    ]
  });
  const page = await browser.newPage();
  
  await login(page);
  const transactions = await getPendingTransactions(page);

  await browser.close();
  browser = null;
  return transactions;
}

async function uploadTransactionsToYnab(transactions: TransactionsByAccount): Promise<void> {
  const accountsByBudget: { [budgetId: string]: Account[] } = {};
  const budgetsResponse = await ynab.budgets.getBudgets();
  for (const budget of budgetsResponse.data.budgets) {
    const accountsResponse = await ynab.accounts.getAccounts(budget.id);
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
          });
        }
      }
    }
  }
}
