import Block from './Block';
import {randomString} from './helpers';

/**
 * Class representing blockchain
 */
class Blockchain {
  chain: Array<Block>;
  difficulty: number;

  /**
   * Blockchain constructor
   * @param {number} difficulty - how many 0s has to be in the end of a hash
   */
  constructor(difficulty: number) {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = difficulty;
  }

  /**
   * Method to create a genesis block
   * @return {Block} block
   */
  createGenesisBlock = () => {
    const genesisBlock = new Block({
      index: 0,
      data: randomString(),
    });
    genesisBlock.previousHash = '0';
    return genesisBlock;
  };

  /**
   * Get the latest block in the chain
   * @return {Block} latestBlock
   */
  getLatestBlock = () => {
    return this.chain[this.chain.length - 1];
  };

  /**
   * Add a new block to the chain
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

  /**
   * Validate the chain.
   * @return {boolean} validationResult
   */
  validate = () => {
    for (let blockIdx = 1; blockIdx <= this.chain.length - 1; blockIdx++) {
      const currentBlock = this.chain[blockIdx];
      const previousBlock = this.chain[blockIdx - 1];

      const currentBlockHashIsValid: boolean =
          currentBlock.hash === currentBlock.calculateHash();
      const previousBlockHashMatches: boolean =
          currentBlock.previousHash === previousBlock.hash;

      if (!currentBlockHashIsValid || !previousBlockHashMatches) {
        return false;
      }
    }

    return true;
  };
}

export default Blockchain;
