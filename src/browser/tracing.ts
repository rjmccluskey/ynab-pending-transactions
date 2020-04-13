import { Page } from 'puppeteer';
import { config } from '../config';
import { storeBuffer } from '../storage';

let tracedPage: Page|null = null;

export async function startTracing(page: Page): Promise<void> {
  if (!config.useTracing || tracedPage) {
    return;
  }

  tracedPage = page;

  return page.tracing.start({
    path: 'trace.json',
    screenshots: true
  });
}

export async function stopTracing(): Promise<void> {
  const buffer = await tracedPage?.tracing.stop();

  if (buffer && config.debugBucketName) {
    const date = new Date().toISOString();
    await storeBuffer(buffer, config.debugBucketName, `${date}-trace.json`);
    tracedPage = null;
  }
}
