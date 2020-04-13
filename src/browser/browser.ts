import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { startTracing, stopTracing } from './tracing';

puppeteer.use(StealthPlugin());

let browser: Browser|null = null;

async function openBrowser(): Promise<Browser> {
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
    ]
  });
  return browser;
}

export async function createPage(): Promise<Page> {
  if (!browser) {
    browser = await openBrowser();
  }

  const page = await browser.newPage();

  await startTracing(page);

  return page;
}

export async function getPages(): Promise<Page[]> {
  if (!browser) {
    return [];
  }

  const pages = await browser.pages();
  // The first page is always blank
  return pages.slice(1);
}

export async function closeBrowser(): Promise<void> {
  if (!browser) {
    return;
  }

  await stopTracing();

  await browser.close();
  browser = null;
}
