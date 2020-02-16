import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { login, getPendingTransactions } from './wf';
import { API } from 'ynab';
import { config, NodeEnv } from './config';
import { handledAsync, retryable } from './utils';
import { TransactionsByAccount } from './shared';
import { uploadTransactionsToYnab } from './ynab-api';

puppeteer.use(StealthPlugin());
const ynab = new API(config.ynabToken);

let findAndUploadTransactions = handledAsync(async () => {
    const transactions = await scrapeWfPendingTransactions();
    await uploadTransactionsToYnab(ynab, transactions);
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
