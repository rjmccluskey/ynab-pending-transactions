import { isString } from 'util';

export class Transaction {
  // Amount in milliunits, ex: 12340 (instead of '$12.340')
  readonly amount: number;
  // ISO "full date" format: (YYYY-MM-dd)
  readonly date: string;
  readonly description: string;

  private static idWrapper = '|'

  constructor(amount: number, date: string, description: string) {
    this.amount = amount;
    this.date = date;
    this.description = description;
  }

  getId(): string {
    const wrapper = Transaction.idWrapper;
    const id = `${this.amount}:${this.date}:${this.description}`;

    return `${wrapper}integration-id:${id}${wrapper}`;
  }

  matchesId(stringContainingId: string|null|undefined): boolean {
    if (!isString(stringContainingId)) {
      return false;
    }

    const wrapper = Transaction.idWrapper;
    const regex = new RegExp(`\\${wrapper}.*\\${wrapper}`);
    const matches = stringContainingId.match(regex);

    return Array.isArray(matches) && matches[0] === this.getId();
  }
}

export interface TransactionsByAccount {
  [accountName: string]: Transaction[];
}
