import { Page } from 'puppeteer';

export async function safeWaitForSelector(page: Page, selector: string,
 timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    if (error.toString().indexOf('TimeoutError') > -1) {
      return false;
    }
    throw error;
  }
}
