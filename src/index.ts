import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { login, getPendingTransactions, WfTransactions } from './wf';
import { API, Account, SaveTransaction } from 'ynab';
import { config } from './config';

puppeteer.use(StealthPlugin());
const ynab = new API(config.ynabToken);

(async () => {
  
  const transactions = await scrapeWfPendingTransactions();
  await uploadTransactionsToYnab(transactions);

})().catch(handleError);

let browser: Browser|null;

async function handleError(e: Error) {
  if (browser) {
    await browser.close();
  }
  console.error(e.stack);
  process.exitCode = 1;
}

async function scrapeWfPendingTransactions(): Promise<WfTransactions> {
  browser = await puppeteer.launch({
    headless: true, defaultViewport: null
  });
  const page = await browser.newPage();
  
  await login(page);
  const transactions = await getPendingTransactions(page);

  await browser.close();
  browser = null;
  return transactions;
}

async function uploadTransactionsToYnab(transactions: WfTransactions) {
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
        for (const wfTransaction of pendingTransactions) {
          const existingTransaction = ynabTransactions.find(ynabTransaction =>
            ynabTransaction.payee_name === wfTransaction.description
            && ynabTransaction.amount === wfTransaction.amount);
          if (!existingTransaction) {
            newTransactions.push({
              account_id: account.id,
              date: wfTransaction.date,
              amount: wfTransaction.amount,
              payee_name: wfTransaction.description,
              cleared: SaveTransaction.ClearedEnum.Uncleared
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
