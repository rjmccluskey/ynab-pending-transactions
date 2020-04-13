import { login, getPendingTransactions } from './wf';
import { API } from 'ynab';
import { config, NodeEnv } from './config';
import { handledAsync, retryable } from './utils';
import { TransactionsByAccount } from './shared';
import { uploadTransactionsToYnab } from './ynab-api';
import { takeScreenshot, createPage, closeBrowser, getPages } from './browser';

const ynab = new API(config.ynabToken);

let findAndUploadTransactions = handledAsync(async () => {
    const transactions = await scrapeWfPendingTransactions();
    await uploadTransactionsToYnab(ynab, transactions);
    return 'success';
}, handleError);

if (config.nodeEnv === NodeEnv.prod) {
  findAndUploadTransactions = retryable(findAndUploadTransactions);
}

export const main = findAndUploadTransactions;

async function handleError(e: Error): Promise<string> {
  const pages = await getPages();
  await Promise.all(pages.map((page, i) => 
    takeScreenshot(page, `${i}-error-screenshot`)
  ));
  await closeBrowser();

  throw e;
}

async function scrapeWfPendingTransactions(): Promise<TransactionsByAccount> {
  const page = await createPage();
  
  await login(page);
  const transactions = await getPendingTransactions(page);

  await closeBrowser();
  return transactions;
}
