import Blockchain from '../src/Blockchain';
import Block from '../src/Block';
import {randomString} from '../src/helpers';

const initiateBlockchain = () => {
  return new Blockchain();
};

const createRandomTestBlockchain = () => {
  const testBlockchain = new Blockchain();

  for (let block = 1; block <= 3; block++) {
    const newBlock = new Block({
      index: block,
      data: randomString(),
    });

    testBlockchain.addBlock(newBlock);
  }

  return testBlockchain;
};

const createDefinedTestBlockchain = () => {
  const testBlockchain = new Blockchain();

  for (let block = 1; block <= 3; block++) {
    const newBlock = new Block({
      index: block,
      data: 'testBlock' + block,
    });

    testBlockchain.addBlock(newBlock);
  }

  return testBlockchain;
};

describe('Class Blockchain', () => {
  describe('Constructor', () => {
    it('should have a genesis block after it\'s just been created', () => {
      const testBlockchain = initiateBlockchain();
      expect(testBlockchain.chain.length).toBe(1);
    });
  });

  describe('Block functions', () => {
    const testBlockchain = createDefinedTestBlockchain();
    it('should correctly add new blocks', () => {
      expect(testBlockchain.chain.length).toStrictEqual(4);
      expect({
        index: testBlockchain.chain[1].index,
        data: testBlockchain.chain[1].data,
      }).toStrictEqual({
        index: 1,
        data: 'testBlock1',
      });
      expect({
        index: testBlockchain.chain[2].index,
        data: testBlockchain.chain[2].data,
      }).toStrictEqual({
        index: 2,
        data: 'testBlock2',
      });
      expect({
        index: testBlockchain.chain[3].index,
        data: testBlockchain.chain[3].data,
      }).toStrictEqual({
        index: 3,
        data: 'testBlock3',
      });
    });
    it('should correctly return block with a given index', () => {
      expect(testBlockchain.getBlock(2)?.data).toBe('testBlock2');
    });
    it('should return null when index is greater than chain length', () => {
      expect(testBlockchain.getBlock(10)).toBeNull();
    });
    it('should correctly return the latest block', () => {
      expect(testBlockchain.getLatestBlock()?.data).toBe('testBlock3');
    });
  });

  describe('Previous hash assignment', () => {
    it('should correctly assign previous hashes for a set of blocks', () => {
      const testBlockchain = createRandomTestBlockchain();
      const chain = testBlockchain.chain;
      for (let blockIdx = 1; blockIdx <= chain.length - 1; blockIdx++) {
        const currentBlock = chain[blockIdx];
        const previousBlock = chain[blockIdx - 1];

        expect(currentBlock.previousHash).toBe(previousBlock.hash);
      }
    });
  });

  describe('Chain validation', () => {
    const testBlockchain = createRandomTestBlockchain();
    it('should return true if the chain has not been intervened with', () => {
      expect(testBlockchain.validate()).toBeTruthy();
    });
    it('should return false if the blocks have been tampered with', () => {
      // Tamper with data
      const blockUnderTest = testBlockchain.chain[1];
      blockUnderTest.data = 'changedData';
      expect(testBlockchain.validate()).toBeFalsy();

      // Try to fix hashes after tampering with data
      const nextBlock = testBlockchain.chain[2];
      nextBlock.previousHash = testBlockchain.chain[1].hash;
      expect(testBlockchain.validate()).toBeFalsy();
    });
  });
});
