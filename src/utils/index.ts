export function handledAsync<T>(func: () => Promise<T>,
                                onError: (e: Error) => any): () => Promise<T> {
  return async () => {
    try {
      return await func().catch(onError);
    } catch (e) {
      console.log(`Failed on first try with error message: ${e.message}`);
      console.log('Retrying...');
      return func().catch(onError);
    }
  }
}
