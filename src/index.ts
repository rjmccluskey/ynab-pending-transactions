import { API } from 'ynab';
import { config, NodeEnv } from './config';
import { handledAsync, retryable } from './utils';
import { uploadTransactionsToYnab } from './ynab-api';
import { getPendingTransactions } from './plaid-api';

const ynab = new API(config.ynabToken);

let findAndUploadTransactions = handledAsync(async () => {
    const transactions = await getPendingTransactions();
    await uploadTransactionsToYnab(ynab, transactions);
    return 'success';
}, handleError);

if (config.nodeEnv === NodeEnv.prod) {
  findAndUploadTransactions = retryable(findAndUploadTransactions);
}

export const main = findAndUploadTransactions;

async function handleError(e: Error): Promise<string> {
  // Add things here to do before the error kills the script

  throw e;
}
