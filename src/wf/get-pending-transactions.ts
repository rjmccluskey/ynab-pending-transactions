import { Page, ElementHandle } from 'puppeteer';
import { Transaction, TransactionsByAccount } from '../shared';

export async function getPendingTransactions(page: Page): Promise<TransactionsByAccount> {
  console.log('Collecting pending transactions...');

  // Need to wait so we can click on the accounts
  // Waiting for network idle and dom content loaded doesn't work
  await page.waitFor(5000);

  const creditTransactions = await getPendingTransactionsByAccount(
    page,
    '#Credit-account-group .account-name',
    getPendingCreditTransactions
  );
  const cashTransactions = await getPendingTransactionsByAccount(
    page,
    '#Cash-account-group .account-name',
    getPendingCashTransactions
  );

  return { ...creditTransactions, ...cashTransactions };
}

interface GetTransactions {
  (page: Page): Promise<Transaction[]>;
}

async function getPendingTransactionsByAccount(page: Page,
                                               accountSelector: string,
                                               getTransactions: GetTransactions): Promise<TransactionsByAccount> {
  const transactionsByAccount: TransactionsByAccount = {};

  const countAccounts = await page.$$eval(accountSelector, elements => elements.length);
  for (let i = 0; i < countAccounts; i++) {
    const accounts = await page.$$(accountSelector);
    const thisAccount = accounts[i];
    const accountName = await getTextContent(thisAccount);

    console.log(`Searching account: ${accountName}...`);
    await thisAccount.click();
    const transactions = await getTransactions(page);
    transactionsByAccount[accountName] = transactions;
    console.log(`Found ${transactions.length} pending transactions.`);

    await page.goBack({ waitUntil: ['domcontentloaded', 'networkidle0'] });
    await page.waitForSelector(accountSelector);
  }

  return transactionsByAccount;
}

const getPendingCreditTransactions: GetTransactions = async page => {
  await expandPendingTransactions(page);
  const transactionRows = await page.$$('.temporary-authorizations tr.OneLinkNoTx');

  const transactions: Transaction[] = [];
  for (const row of transactionRows) {
    const cells = await row.$$('td');
    const [date, description, amount] = await Promise.all([
      getTransactionDate(cells[0]),
      getTransactionDescription(cells[1]),
      getCreditAccountAmount(cells[2])
    ]);
    if (amountIsValid(amount) && !isATransfer(description)) {
      transactions.push(new Transaction(amount, date, description));
    }
  }

  return transactions;
};

const getPendingCashTransactions: GetTransactions = async page => {
  const transactionRowsSelector = 'tr.detailed-transaction';
  await page.waitForSelector(transactionRowsSelector);
  const transactionRows = await page.$$(transactionRowsSelector);
  const transactions: Transaction[] = [];

  for (const row of transactionRows) {
    const cells = await row.$$('td[headers~="pending-trans"]');
    if (cells.length === 0) {
      continue;
    }
    const [date, description, creditAmount, debitAmount] = await Promise.all([
      getTransactionDate(cells[1]),
      getTransactionDescription(cells[2]),
      getCashAccountAmount(cells[3]),
      getCashAccountAmount(cells[4])
    ]);
    const amount = creditAmount || (debitAmount * -1);
    if (amountIsValid(amount) && !isATransfer(description)) {
      transactions.push(new Transaction(amount, date, description ));
    }
  }

  return transactions;
};

async function expandPendingTransactions(page: Page): Promise<void> {
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

async function getCreditAccountAmount(cell: ElementHandle): Promise<number> {
  let milliunitAmount = await getMilliunitString(cell);
  if (milliunitAmount[0] !== '+') {
    milliunitAmount = `-${milliunitAmount}`;
  }
  return parseInt(milliunitAmount, 10);
}

async function getCashAccountAmount(cell: ElementHandle): Promise<number> {
  const milliunitAmount = await getMilliunitString(cell);
  return parseInt(milliunitAmount, 10);
}

async function getMilliunitString(cell: ElementHandle): Promise<string> {
  const rawAmount = await getTextContent(cell);
  const milliunitAmount = rawAmount.replace(/[^+\d]/g, '') + '0';
  return milliunitAmount;
}

async function getTextContent(handle: ElementHandle): Promise<string> {
  const text = await handle.evaluate(el => el.textContent);
  if (text === null) {
    throw new Error('Element handle has no text!');
  }
  return text.trim();
}

/**
 * A "valid" amount is an amount that is not a temporary verification
 * but an actual transaction that will eventually be cleared.
 * Best guess is that the absolute amount is greater than $1.00
 */
function amountIsValid(milliunitAmount: number): boolean {
  return Math.abs(milliunitAmount) > 1000;
}

function isATransfer(description: string): boolean {
  const match = description.match(/(online|recurring)\stransfer/i);
  return match !== null;
}
