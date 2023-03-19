import Block from './Block';
import {randomString} from './helpers';

/**
 * Class representing blockchain
 */
class Blockchain {
  chain: Array<Block>;

  /**
   * Blockchain constructor
   */
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  /**
   * Method to create a genesis block
   * @return {Block} block
   */
  createGenesisBlock = () => {
    return new Block({
      index: 0,
      data: randomString(),
      previousHash: '0',
    });
  };

  /**
   * Get the latest block in the chain.
   * @return {Block} latestBlock
   */
  getLatestBlock = () => {
    return this.chain[this.chain.length - 1];
  };

  /**
   * Add a new block to the chain.
   * @param {Block} newBlock
   */
  addBlock = (newBlock: Block) => {
    const latestBlock = this.getLatestBlock();
    newBlock.previousHash = latestBlock.hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  };

  /**
   * Get block with a given index if exists
   * @param {number} index
   * @return {Block | null} res
   */
  getBlock = (index: number) => {
    if (this.chain.length - 1 >= index) {
      return this.chain[index];
    } else {
      return null;
    }
  };
}

export default Blockchain;
