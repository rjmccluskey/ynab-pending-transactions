import { Page, ElementHandle } from 'puppeteer';
import { Transaction } from '../shared';

export interface WfTransactions {
  [accountName: string]: Transaction[];
}

export async function getPendingTransactions(page: Page): Promise<WfTransactions> {
  console.log('Collecting pending transactions...');

  // Need to wait so we can click on the accounts
  // Waiting for network idle and dom content loaded doesn't work
  await page.waitFor(5000);

  const allTransactions: WfTransactions = {
    ...await getPendingTransactionsByAccount(
      page,
      '#Credit-account-group .account-name',
      getPendingCreditTransactions
    )
  };

  return allTransactions;
};

interface GetTransactions {
  (page: Page): Promise<Transaction[]>
}

async function getPendingTransactionsByAccount(page: Page,
                                               accountSelector: string,
                                               getTransactions: GetTransactions): Promise<WfTransactions> {
  const transactionsByAccount: WfTransactions = {};

  const countCreditAccounts = await page.$$eval(accountSelector, elements => elements.length);
  for (let i = 0; i < countCreditAccounts; i++) {
    await page.waitForSelector(accountSelector);
    const accounts = await page.$$(accountSelector);
    const thisAccount = accounts[i];
    const accountName = await getTextContent(thisAccount);

    console.log(`Searching account: ${accountName}...`);
    await thisAccount.click();
    const transactions = await getTransactions(page);
    transactionsByAccount[accountName] = transactions;
    console.log(`Found ${transactions.length} pending transactions.`);

    await page.goBack({ waitUntil: ['domcontentloaded', 'networkidle0'] });
  }

  return transactionsByAccount;
}

const getPendingCreditTransactions: GetTransactions = async(page) => {
  await expandPendingTransactions(page);
  const transactionRows = await page.$$('.temporary-authorizations tr.OneLinkNoTx');

  const transactions: Transaction[] = [];
  for (const row of transactionRows) {
    const cells = await row.$$('td');
    const [date, description, amount] = await Promise.all([
      getTransactionDate(cells[0]),
      getTransactionDescription(cells[1]),
      getTransactionAmount(cells[2])
    ]);
    if (amount !== 0) {
      transactions.push(new Transaction(amount, date, description));
    }
  }

  return transactions;
}

async function expandPendingTransactions(page: Page) {
  const expandPendingSelector = '.expand-collapse-link.temp-auth-ec';
  await page.waitForSelector(expandPendingSelector);
  await page.waitFor(1000); // Need to wait a little extra before it's clickable
  await page.click(expandPendingSelector);

  const expandedTransactionsSelector = '.temporary-authorizations table';
  const expandedTransactionsOptions = { visible: true, timeout: 10000 };
  try {
    await page.waitForSelector(expandedTransactionsSelector, expandedTransactionsOptions);
  } catch (e) {
    // Sometimes a modal pops up on the account page and the click
    // removes the modal instead of expanding the transactions so try again
    await page.waitForSelector(expandedTransactionsSelector, expandedTransactionsOptions);
  }
}

async function getTransactionDate(cell: ElementHandle): Promise<string> {
  const rawDate = await getTextContent(cell);
  const parts = rawDate.split('/');
  return `20${parts[2]}-${parts[0]}-${parts[1]}`;
}

async function getTransactionDescription(cell: ElementHandle): Promise<string> {
  const descriptionHandle = await cell.$('span');
  if (descriptionHandle === null) {
    throw new Error('Unable to find transaction description!');
  }
  return await getTextContent(descriptionHandle);
}

async function getTransactionAmount(cell: ElementHandle): Promise<number> {
  const rawAmount = await getTextContent(cell);
  let milliunitAmount = rawAmount.replace(/[^+\d]/g, '') + '0';
  if (milliunitAmount[0] !== '+') {
    milliunitAmount = `-${milliunitAmount}`;
  }
  return parseInt(milliunitAmount, 10);
}

async function getTextContent(handle: ElementHandle): Promise<string> {
  const text = await handle.evaluate(el => el.textContent);
  if (text === null) {
    throw new Error('Element handle has no text!');
  }
  return text.trim();
}
