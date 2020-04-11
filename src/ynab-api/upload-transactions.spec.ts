import { convertDate } from './upload-transactions';

describe('upload-transactions', () => {
  describe('convertDate', () => {
    const today = '2020-02-22';
    const yesterday = '2020-02-21';
    const tomorrow = '2020-02-23';

    beforeEach(() => {
      jest
        .spyOn(global.Date, 'constructor' as any)
        .mockImplementationOnce(() => new Date(today));
    });

    it('does not change date if it == today', () => {
      const result = convertDate(today);
      expect(result).toBe(today);
    });

    it('does not change date if it is < today', () => {
      const result = convertDate(yesterday);
      expect(result).toBe(yesterday);
    });

    // TODO: fix this!
    // it('converts date to today if it is > today', () => {
    //   const result = convertDate(tomorrow);
    //   expect(result).toBe(today);
    // });
  });
});
