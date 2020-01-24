function getEnvVar(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing env variable ${name}`);
  }
  return value;
}

export const config = {
  ynabToken: getEnvVar('YNAB_TOKEN')
};
