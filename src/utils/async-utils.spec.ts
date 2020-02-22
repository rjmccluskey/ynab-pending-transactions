import { handledAsync, retryable } from './async-utils';

describe('async-utils', () => {
  describe('handledAsync', () => {
    it('does not call onError if there is no error', async () => {
      const func = jest.fn().mockResolvedValue('from func');
      const onError = jest.fn().mockReturnValue('from onError');
      const handledFunc = handledAsync(func, onError);
      const result = await handledFunc();
      
      expect(func).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(result).toBe('from func');
    });

    it('calls onError if there is an error', async () => {
      const func = jest.fn().mockRejectedValue(new Error());
      const onError = jest.fn().mockReturnValue('from onError');
      const handledFunc = handledAsync(func, onError);
      const result = await handledFunc();

      expect(func).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
      expect(result).toBe('from onError');
    });
  });

  describe('retryable', () => {
    it('only calls function once if successful', async () => {
      const func = jest.fn().mockResolvedValue('from func');
      const retryableFunc = retryable(func);
      const result = await retryableFunc();

      expect(func).toHaveBeenCalledTimes(1);
      expect(result).toBe('from func');
    });

    it('calls function twice with error on first try', async () => {
      const func = jest.fn()
        .mockRejectedValueOnce(new Error())
        .mockResolvedValueOnce('from func');
      const retryableFunc = retryable(func);
      const result = await retryableFunc();

      expect(func).toHaveBeenCalledTimes(2);
      expect(result).toBe('from func');
    });

    it('rejects with error on second try', async () => {
      const func = jest.fn()
        .mockRejectedValueOnce(new Error('first error'))
        .mockRejectedValueOnce(new Error('second error'));
      const retryableFunc = retryable(func);

      await expect(retryableFunc()).rejects.toThrow('second error');
      expect(func).toHaveBeenCalledTimes(2);
    });
  });
});
