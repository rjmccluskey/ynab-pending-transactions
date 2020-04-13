function getEnvVar(name: string): string
function getEnvVar(name: string, required: true): string
function getEnvVar(name: string, required: false): string|undefined
function getEnvVar(name: string, required = true): string|undefined {
  const value = process.env[name];
  if (required && value === undefined) {
    throw new Error(`Missing env variable ${name}`);
  }
  return value;
}

export enum NodeEnv {
  dev = 'development',
  prod = 'production',
  ci = 'CI'
}

export const config = {
  ynabToken: getEnvVar('YNAB_TOKEN'),
  wfUrl: getEnvVar('WF_URL'),
  wfUsername: getEnvVar('WF_USERNAME'),
  wfPassword: getEnvVar('WF_PASSWORD'),
  captchaToken: getEnvVar('CAPTCHA_TOKEN'),
  nodeEnv: (getEnvVar('NODE_ENV', false) || NodeEnv.prod) as NodeEnv,
  useTracing: getEnvVar('USE_TRACING', false) === 'true',
  debugBucketName: getEnvVar('DEBUG_BUCKET_NAME', false)
};
