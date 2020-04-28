module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
};

process.env = {
  ...process.env,
  YNAB_TOKEN: 'YNAB_TOKEN',
  USE_TRACING: 'false',
  DEBUG_BUCKET_NAME: 'DEBUG_BUCKET_NAME',
  PLAID_CLIENT_ID: 'PLAID_CLIENT_ID',
  PLAID_SECRET: 'PLAID_SECRET',
  PLAID_PUBLIC_KEY: 'PLAID_PUBLIC_KEY',
  PLAID_ACCESS_TOKEN: 'PLAID_ACCESS_TOKEN',
  PLAID_ITEM_ID: 'PLAID_ITEM_ID',
};
