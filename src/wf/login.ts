 import { Page } from 'puppeteer';
 import { config } from '../config';
 import { solveImageCaptcha } from '../2captcha-api';
 
 export async function login(page: Page): Promise<void> {
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

async function attemptCaptchaLogin(page: Page): Promise<void> {
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

async function fillOutSecondLoginCredentials(page: Page): Promise<void> {
  await page.waitForSelector('#j_username');
  await page.type('#j_username', config.wfUsername);
  await page.type('#j_password', config.wfPassword);
}

async function solveCaptcha(page: Page): Promise<boolean> {
  console.log('Attempting captcha...');

  await page.waitForSelector('canvas');
  await page.waitFor(1000); // Let the image move around a little bit
  const dataUrl = await page.evaluate('document.querySelector("canvas").toDataURL()');
  if (typeof dataUrl !== 'string') {
    throw new Error('Invalid data url!');
  }

  const captchaSolution = await solveImageCaptcha(dataUrl);
  await page.type('#nucaptcha-answer', captchaSolution);
  await submitSecondLogin(page);

  return await loginWasSuccessful(page);
}

async function submitSecondLogin(page: Page): Promise<void> {
  await clickSubmitButton(page, 'input[type="submit"]');
}

async function clickSubmitButton(page: Page, selector: string): Promise<void> {
  await page.click(selector, { waitUntil: 'domcontentloaded' } as any);
}

async function loginWasSuccessful(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('#mwf-customer-nav-sign-off', {
      timeout: 5000
    });
    return true;
  } catch (error) {
    if (error.toString().indexOf('TimeoutError') > -1) {
      return false;
    }
    throw error;
  }
}
