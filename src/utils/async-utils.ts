export function handledAsync<T>(func: () => Promise<T>,
                                onError: (e: Error) => T): () => Promise<T> {
  return async () => {
    return func().catch(onError);
  }
}

export function retryable<T>(func: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await func();
    } catch (e) {
      console.log(`Failed on first try with error message: ${e.message}`);
      console.log('Retrying...');
      return func();
    }
  }
}
