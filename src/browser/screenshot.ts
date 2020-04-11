import { Page, BinaryScreenShotOptions } from 'puppeteer';
import { Storage } from '@google-cloud/storage';
import { config, NodeEnv } from '../config';
import { Readable } from 'stream';

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const isoDate = new Date().toISOString();
  const filename = `${isoDate}-${name}.png`;
  const buffer = await page.screenshot(screenshotOptions(filename));
  return uploadScreenshot(buffer, filename);
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

function uploadScreenshot(buffer: Buffer, filename: string): Promise<void> {
  if (config.nodeEnv !== NodeEnv.prod) {
    return Promise.resolve();
  }

  const storage = new Storage();
  const bucket = storage.bucket('ynab-import-screenshots');
  const file = bucket.file(filename);

  const readable = new Readable();
  readable._read = () => {}; // _read is required but you can noop it
  readable.push(buffer);
  readable.push(null);

  const promise = new Promise<void>((resolve, reject) => {
    readable.pipe(file.createWriteStream())
      .on('error', reject)
      .on('finish', resolve);
  });

  return promise;
}