import { ErrorDetail } from 'ynab';

export class YnabError extends Error {
  constructor(errorDetail: ErrorDetail) {
    const message = `YNAB api failure (${errorDetail.id} ${errorDetail.name}): ${errorDetail.detail}`;
    super(message);
  }
}

export function ynabErrorWrapper<T>(error: T): T {
  const errorDetail = error['error'];
  if (errorDetail && errorDetail['id'] && errorDetail['name'] && errorDetail['detail']) {
    throw new YnabError(errorDetail);
  }
  throw error;
}
