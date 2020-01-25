import { Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { config } from './config';
import { solveImageCaptcha } from './2captcha-api';

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

async function login(page: Page) {
  console.log('Logging in to WF...');

  await page.goto(config.wfUrl);
  await page.type('#userid', config.wfUsername);
  await page.type('#password', config.wfPassword);
  await clickSubmitButton(page, '#btnSignon');

  if (!(await loginWasSuccessful(page))) {
    await attemptCaptchaLogin(page);
  }

  console.log('Successfully logged in!');
}

async function attemptCaptchaLogin(page: Page) {
  console.log('Login requires captcha...');

  await fillOutSecondLoginCredentials(page);
  let loginSuccessful = await solveCaptcha(page);
  let count = 1;
  while (loginSuccessful === false && count < 3) {
    await fillOutSecondLoginCredentials(page);
    await submitSecondLogin(page);
    await fillOutSecondLoginCredentials(page);
    loginSuccessful = await solveCaptcha(page);
    count++;
  }
  if (count === 3) {
    throw new Error('Unable to login!');
  }
}

async function fillOutSecondLoginCredentials(page: Page) {
  await page.waitForSelector('#j_username');
  await page.type('#j_username', config.wfUsername);
  await page.type('#j_password', config.wfPassword);
}

async function solveCaptcha(page: Page): Promise<boolean> {
  console.log('Attempting captcha...');

  await page.waitFor(1000);
  const dataUrl = await page.evaluate('document.querySelector("canvas").toDataURL()');
  if (typeof dataUrl !== 'string') {
    throw new Error('Invalid data url!');
  }

  const captchaSolution = await solveImageCaptcha(dataUrl);
  await page.type('#nucaptcha-answer', captchaSolution);
  await submitSecondLogin(page);

  return await loginWasSuccessful(page);
}

async function submitSecondLogin(page: Page) {
  await clickSubmitButton(page, 'input[type="submit"]');
}

async function clickSubmitButton(page: Page, selector: string) {
  const clickOptions: any = { waitUntil: 'domcontentloaded' };
  await page.click(selector, clickOptions);
}

async function loginWasSuccessful(page: Page) {
  const wasSuccessful = await page.$('#mwf-customer-nav-sign-off') !== null;
  console.log(`Login attempt result: ${wasSuccessful}`);
  return wasSuccessful;
}
