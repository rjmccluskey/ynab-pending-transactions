import * as plaid from 'plaid';
import { config } from '../config';

export const plaidClient = new plaid.Client(
  config.plaidClientId,
  config.plaidSecret,
  config.plaidPublicKey,
  plaid.environments.development,
  { version: '2019-05-29' }
);
