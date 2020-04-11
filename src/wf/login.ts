import { Page } from 'puppeteer';
import { config } from '../config';
import { solveImageCaptcha } from '../2captcha-api';
import { safeWaitForSelector } from '../browser';
 
export async function login(page: Page): Promise<void> {
  console.log('Logging in to WF...');

  await page.goto(config.wfUrl);
  await page.type('#userid', config.wfUsername);
  await page.type('#password', config.wfPassword);
  await clickSubmitButton(page, '#btnSignon');

  const isLoggedIn = (await loginWasSuccessful(page))
    || (await attemptSecondLogin(page));
  if (!isLoggedIn) {
    throw new Error('Unable to log in!');
  }
}

async function attemptSecondLogin(page: Page): Promise<boolean> {
  console.log('Second login required');
  await fillOutSecondLoginCredentials(page);
  const requiresCaptcha = await loginRequiresCaptcha(page);
  if (requiresCaptcha) {
    await solveCaptcha(page);
  } else {
    await submitSecondLogin(page);
  }
  return loginWasSuccessful(page);
}

async function fillOutSecondLoginCredentials(page: Page): Promise<void> {
  await page.waitForSelector('#j_username');
  await page.type('#j_username', config.wfUsername);
  await page.type('#j_password', config.wfPassword);
}

async function solveCaptcha(page: Page): Promise<void> {
  console.log('Attempting captcha...');

  await page.waitFor(1000); // Let the image move around a little bit
  const dataUrl = await page.evaluate('document.querySelector("canvas").toDataURL()');
  if (typeof dataUrl !== 'string') {
    throw new Error('Invalid data url!');
  }

  const captchaSolution = await solveImageCaptcha(dataUrl);
  await page.type('#nucaptcha-answer', captchaSolution);
  await submitSecondLogin(page);
}

async function submitSecondLogin(page: Page): Promise<void> {
  await clickSubmitButton(page, 'input[type="submit"]');
}

async function clickSubmitButton(page: Page, selector: string): Promise<void> {
  await page.click(selector, { waitUntil: 'domcontentloaded' } as any);
}

async function loginWasSuccessful(page: Page): Promise<boolean> {
  const isLoggedIn = await safeWaitForSelector(page, '#mwf-customer-nav-sign-off');
  console.log(`Login attempt: ${isLoggedIn}`);
  return isLoggedIn;
}

async function loginRequiresCaptcha(page: Page): Promise<boolean> {
  const pageHasCaptcha = await safeWaitForSelector(page, 'canvas');
  if (pageHasCaptcha) {
    console.log('Login requires captcha.');
  }
  return pageHasCaptcha;
}
