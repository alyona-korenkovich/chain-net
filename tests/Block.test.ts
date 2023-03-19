import Block from '../src/Block';
import {indexErrorText} from '../src/const';
import {TBlock} from '../src/types';

const createBlock = ({index, data}: TBlock) => {
  return new Block({
    index,
    data,
  });
};

describe('Class Block', () => {
  describe('Constructor', () => {
    it('should not create blocks with negative indices', () => {
      expect(() => createBlock({
        index: -1,
        data: 'eyegfuwu5478yge32u3e5w',
      })).toThrow(indexErrorText);
    });


    it('should correctly save parameters', () => {
      const testBlock = createBlock({
        index: 109,
        data: 'EcSiC183e5V4MVfUdPs42n6IU',
      });

      // Calculated manually using a third-party service
      // eslint-disable-next-line max-len
      const exp = '0e8f39a3a21041e31632e8db78bedaa5c2d6d9fe09f892eec4161f518d9262d5';

      expect(testBlock.index).toBe(109);
      expect(testBlock.data).toBe('EcSiC183e5V4MVfUdPs42n6IU');
      expect(testBlock.hash).toBe(exp);
      expect(testBlock.previousHash).toBe('');
    });
  });
});
