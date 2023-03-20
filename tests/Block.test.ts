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
      const exp = 'ddb8917045fec1d7b9013d893c7fb0521229efa47b26c04cc56792158a9bb2d3';

      expect(testBlock.index).toBe(109);
      expect(testBlock.data).toBe('EcSiC183e5V4MVfUdPs42n6IU');
      expect(testBlock.hash).toBe(exp);
      expect(testBlock.previousHash).toBe('');
    });
  });

  describe('Hash', () => {
    it('should change block hash when it\'s fields has been tampered',
        () => {
          const testBlock = createBlock({
            index: 109,
            data: 'testBlock',
          });
          const prevTestBlockHash = testBlock.hash;

          testBlock.data = 'changedData';
          const currTestBlockHash = testBlock.calculateHash();

          expect(prevTestBlockHash).not.toBe(currTestBlockHash);
        },
    );
    it('should change block hash when `nonce` changes', () => {
      const testBlock = createBlock({
        index: 109,
        data: 'testBlock',
      });
      const prevNonce = testBlock.nonce;
      const prevHash = testBlock.hash;

      testBlock.nonce = 1456;
      const currHash = testBlock.calculateHash();

      expect(prevNonce).not.toBe(testBlock.nonce);
      expect(prevHash).not.toBe(currHash);
    });
  });

  describe('Mine function', () => {
    test('After mining hash of a block needs to end with `difficulty` zeros',
        () => {
          const testBlock = createBlock({
            index: 109,
            data: 'testBlock',
          });
          const regex = /[0]$/;

          testBlock.mineBlock(1);
          expect(testBlock.hash).toMatch(regex);
        });
  });
});
