import { API } from 'ynab';
import { config } from './config';

export const ynab = new API(config.ynabToken);
