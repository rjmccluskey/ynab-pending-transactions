import { Page } from 'puppeteer';
import { config } from '../config';
import { storeBuffer } from '../storage';
import * as fs from 'fs';

export async function startTracing(page: Page): Promise<void> {
  await Promise.all([
    startBrowserTracing(page),
    startConsoleTracing(page),
    startRequestTracing(page),
  ]);
}

export async function stopTracing(): Promise<void> {
  await Promise.all([
    stopBrowserTracing(),
    stopConsoleTracing(),
    stopRequestTracing(),
  ]);
}

let tracedPage: Page|null = null;

async function startBrowserTracing(page: Page): Promise<void> {
  if (!config.useTracing || tracedPage) {
    return;
  }

  tracedPage = page;

  return page.tracing.start({
    path: config.browserTraceFilePath,
    screenshots: true
  });
}

async function stopBrowserTracing(): Promise<void> {
  const buffer = await tracedPage?.tracing.stop();

  if (buffer && config.debugBucketName) {
    const date = new Date().toISOString();
    await storeBuffer(buffer, config.debugBucketName, `${date}-trace.json`);
    tracedPage = null;
  }
}

async function startConsoleTracing(page: Page): Promise<void> {
  // Clear out the file if it already exists
  fs.writeFileSync(config.consoleTraceFilePath, '');

  page.on('console', message => {
    fs.appendFileSync(config.consoleTraceFilePath, message.text() + "\n");
  });
}

async function stopConsoleTracing(): Promise<void> {
  if (!config.debugBucketName) {
    return;
  }

  const buffer = fs.readFileSync(config.consoleTraceFilePath);
  if (buffer) {
    const date = new Date().toISOString();
    await storeBuffer(buffer, config.debugBucketName, `${date}-console.log`);
  }
}

async function startRequestTracing(page: Page): Promise<void> {
  // Clear out the file if it already exists
  fs.writeFileSync(config.requestTraceFilePath, '');

  page.on('response', async response => {
    if (response.ok()) {
      return;
    }

    const message = `
URL: ${response.url()}
STATUS: ${response.status()} ${response.statusText()}

BODY:
${response.status() >= 400 ? await response.text() : ''}

******************************

`;
    fs.appendFileSync(config.requestTraceFilePath, message);
  });
}

async function stopRequestTracing(): Promise<void> {
  if (!config.debugBucketName) {
    return;
  }

  const buffer = fs.readFileSync(config.requestTraceFilePath);
  if (buffer) {
    const date = new Date().toISOString();
    await storeBuffer(buffer, config.debugBucketName, `${date}-request.log`);
  }
}
