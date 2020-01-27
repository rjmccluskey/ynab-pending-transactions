import { Page, ElementHandle } from 'puppeteer';

export interface WfTransactions {
  [accountName: string]: WfTransaction[];
}

export interface WfTransaction {
  date: string;
  description: string;
  amount: string;
}

export async function getPendingTransactions(page: Page): Promise<WfTransactions> {
  console.log('Collecting pending transactions...');

  // Need to wait so we can click on the accounts
  // Waiting for network idle and dom content loaded doesn't work
  await page.waitFor(5000);

  const allTransactions: WfTransactions = {};

  const creditAccountsSelector = '#Credit-account-group .account-name';
  const countCreditAccounts = await page.$$eval(creditAccountsSelector, elements => elements.length);
  for (let i = 0; i < countCreditAccounts; i++) {
    await page.waitForSelector(creditAccountsSelector);
    const accounts = await page.$$(creditAccountsSelector);
    const accountName = await getTextContent(accounts[i]);
    console.log(`Searching account: ${accountName}...`);
    const transactions = await getPendingCreditTransactions(page, accounts[i]);
    allTransactions[accountName] = transactions;
    console.log(`Found ${transactions.length} pending transactions.`)
  }

  return allTransactions;
};

async function getPendingCreditTransactions(page: Page,
                                                handle: ElementHandle): Promise<WfTransaction[]> {
  await handle.click();
  const expandPendingSelector = '.expand-collapse-link.temp-auth-ec';
  await page.waitForSelector(expandPendingSelector);
  await page.waitFor(1000); // Need to wait a little extra before it's clickable
  await page.click(expandPendingSelector);
  await page.waitForSelector('.temporary-authorizations table', { visible: true });
  const transactionRows = await page.$$('.temporary-authorizations tr.OneLinkNoTx');

  const transactions: WfTransaction[] = [];
  for (const row of transactionRows) {
    const cells = await row.$$('td');
    const [date, description, amount] = await Promise.all([
      getTextContent(cells[0]),
      getTransactionDescription(cells[1]),
      getTextContent(cells[2])
    ]);
    transactions.push({ date, description, amount });
  }

  await page.goBack({ waitUntil: ['domcontentloaded', 'networkidle0'] });

  return transactions;
}

async function getTransactionDescription(cell: ElementHandle): Promise<string> {
  const descriptionHandle = await cell.$('span');
  if (descriptionHandle === null) {
    throw new Error('Unable to find transaction description!');
  }
  return await getTextContent(descriptionHandle);
}

async function getTextContent(handle: ElementHandle): Promise<string> {
  const text = await handle.evaluate(el => el.textContent);
  if (text === null) {
    throw new Error('Element handle has no text!');
  }
  return text.trim();
}
