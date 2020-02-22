export function throwMultiple(errors: Error[]): void {
  if (!errors || errors.length === 0) {
    return;
  }

  const message = errors.reduce((combinedErrorString, error) => {
    combinedErrorString += error.stack + "\n\n";
    return combinedErrorString;
  }, "One or more errors occurred:\n\n");

  throw new Error(message);
}
