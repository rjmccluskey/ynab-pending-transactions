import { throwMultiple } from './error-utils';

describe('error-utils', () => {
  describe('throwMultiple', () => {
    it('does not throw error if there are no errors', () => {
      const errors = [];
      throwMultiple(errors);
    });

    it('combines error messages and throws error if there are errors', () => {
      const errors = [
        new Error('error-1'),
        new Error('error-2'),
        new Error('error-3')
      ];

      expect(() => throwMultiple(errors))
        .toThrow(/error-1(.|\n)*error-2(.|\n)*error-3/);
    });
  });
});
