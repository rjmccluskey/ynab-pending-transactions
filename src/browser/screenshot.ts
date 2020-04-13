import { Page, BinaryScreenShotOptions } from 'puppeteer';
import { config, NodeEnv } from '../config';
import { storeBuffer } from '../storage';

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const isoDate = new Date().toISOString();
  const filename = `${isoDate}-${name}.png`;
  const buffer = await page.screenshot(screenshotOptions(filename));

  if (config.debugBucketName) {
    return storeBuffer(buffer, config.debugBucketName, filename);
  }
}

function screenshotOptions(filename: string): BinaryScreenShotOptions {
  const options: BinaryScreenShotOptions = {
    fullPage: true
  };

  // Save file to disk in development
  if (config.nodeEnv === NodeEnv.dev) {
    options.path = filename;
  }

  return options;
}
