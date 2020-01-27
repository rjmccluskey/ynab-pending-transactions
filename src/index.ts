import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { login, getPendingTransactions, WfTransactions } from './wf';

puppeteer.use(StealthPlugin());

(async () => {
  
  const transactions = await scrapeWfPendingTransactions();

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
