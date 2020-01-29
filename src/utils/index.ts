export function handledAsync<T>(func: () => Promise<T>,
                                onError: (e: Error) => any): () => Promise<T> {
  return async () => {
    return func().catch(onError);
  }
}
