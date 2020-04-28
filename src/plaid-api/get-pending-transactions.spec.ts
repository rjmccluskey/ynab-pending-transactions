import { getMilliunitAmount } from './get-pending-transactions';

describe('get-pending-transactions', () => {
  describe('getMilliunitAmount', () => {
    it('converts positive float amount to negative milliunit integer', () => {
      const inputOutputs: [number, number][] = [
        [0, -0],
        [0.0017, -2],
        [0.002, -2],
        [0.049, -49],
        [0.05, -50],
        [0.37, -370],
        [0.4, -400],
        [4.3, -4300],
        [6, -6000],
        [74, -74000],
        [80, -80000],
        [180, -180000],
        [900, -900000],
      ];
      for (const [input, output] of inputOutputs) {
        expect(getMilliunitAmount(input)).toBe(output);
      }
    });
  });
});