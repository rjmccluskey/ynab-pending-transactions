import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { login } from './login';

puppeteer.use(StealthPlugin());

export interface WFTransaction {
  date: string;
  description: string;
  amount: string;
}

export async function getPendingTransactions(): Promise<WFTransaction[]> {
  const browser = await puppeteer.launch({
    headless: true, defaultViewport: null
  });
  const page = await browser.newPage();

  await login(page);

  await browser.close();

  return [];
};
