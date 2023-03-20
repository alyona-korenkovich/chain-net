import Block from '../src/Block';
import {indexErrorText} from '../src/const';
import {TBlock} from '../src/types';

const createBlock = ({index, data, previousHash}: TBlock) => {
  return new Block({
    index,
    data,
    previousHash,
  });
};

describe('Class Block', () => {
  describe('Constructor', () => {
    it('should not create blocks with negative indices', () => {
      expect(() => createBlock({
        index: -1,
        data: 'eyegfuwu5478yge32u3e5w',
        previousHash: 'f76291f488416f3861357595304ac2151cfe678c43d6',
      })).toThrow(indexErrorText);
    });


    it('should correctly save parameters', () => {
      const testBlock = createBlock({
        index: 109,
        data: 'EcSiC183e5V4MVfUdPs42n6IU',
        previousHash: 'fee41048b945c2df70956a61fff932f3e5fa2da92b783b31a96da93',
      });

      // Calculated manually using a third-party service
      const exp = '6bd4a389b17b7a0ccedac6fb3e0be90b8aea2940d4ad2ed4a78685da3a78d54b';

      expect(testBlock.index).toBe(109);
      expect(testBlock.data).toBe('EcSiC183e5V4MVfUdPs42n6IU');
      expect(testBlock.hash).toBe(exp);
      expect(testBlock.previousHash).toBe('fee41048b945c2df70956a61fff932f3e5fa2da92b783b31a96da93');
    });
  });

  describe('Hash', () => {
    it('should change block hash when it\'s fields has been tampered',
        () => {
          const testBlock = createBlock({
            index: 109,
            data: 'testBlock',
            previousHash: 'fee41048b56a61fff932f3e5fa2da92b783b31a96da93',
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
        previousHash: 'fee41048b945c2df70956a61fff932f3e5fa2da92b783b31a96da93',
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
            previousHash: 'fee4104956a61fff932f3e5fa2da92b783b31a96da93',
          });
          const regex = /[0]$/;

          testBlock.mineBlock(1);
          expect(testBlock.hash).toMatch(regex);
        });
  });
});
