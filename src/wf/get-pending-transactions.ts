import { Page } from 'puppeteer';

export interface WfTransaction {
  date: string;
  description: string;
  amount: string;
}

export async function getPendingTransactions(page: Page): Promise<WfTransaction[]> {
  page;
  return [];
};
