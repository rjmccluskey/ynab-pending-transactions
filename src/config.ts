function getEnvVar(name: string): string
function getEnvVar(name: string, fallback: string): string
function getEnvVar(name: string, fallback: null): string|null
function getEnvVar(name: string, fallback: string|null|undefined = undefined): string|null {
  const value = process.env[name] || fallback;
  if (value === undefined) {
    throw new Error(`Missing env variable ${name}`);
  }
  return value;
}

export enum NodeEnv {
  dev = 'development',
  prod = 'production',
  ci = 'CI'
}

export interface Config {
  ynabToken: string;
  wfUrl: string;
  wfUsername: string;
  wfPassword: string;
  captchaToken: string;
  nodeEnv: NodeEnv;
  useTracing: boolean;
  debugBucketName: string|null;
  browserTraceFilePath: string;
  consoleTraceFilePath: string;
  requestTraceFilePath: string;
  plaidClientId: string;
  plaidSecret: string;
  plaidPublicKey: string;
  plaidAccessToken: string;
}

export const config: Config = {
  ynabToken: getEnvVar('YNAB_TOKEN'),
  wfUrl: getEnvVar('WF_URL'),
  wfUsername: getEnvVar('WF_USERNAME'),
  wfPassword: getEnvVar('WF_PASSWORD'),
  captchaToken: getEnvVar('CAPTCHA_TOKEN'),
  nodeEnv: getEnvVar('NODE_ENV', NodeEnv.prod) as NodeEnv,
  useTracing: getEnvVar('USE_TRACING', 'false') === 'true',
  debugBucketName: getEnvVar('DEBUG_BUCKET_NAME', null),
  browserTraceFilePath: getEnvVar('BROWSER_TRACE_FILE_PATH', 'trace.json'),
  consoleTraceFilePath: getEnvVar('CONSOLE_TRACE_FILE_PATH', 'console.log'),
  requestTraceFilePath: getEnvVar('REQUEST_TRACE_FILE_PATH', 'request.log'),
  plaidClientId: getEnvVar('PLAID_CLIENT_ID'),
  plaidSecret: getEnvVar('PLAID_SECRET'),
  plaidPublicKey: getEnvVar('PLAID_PUBLIC_KEY'),
  plaidAccessToken: getEnvVar('PLAID_ACCESS_TOKEN'),
};
