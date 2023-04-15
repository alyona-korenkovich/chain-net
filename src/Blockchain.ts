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
    this.difficulty = difficulty;
    this.chain = [this.createGenesisBlock()];
  }

  /**
   * Method to create a genesis block
   * @return {Block} block
   */
  createGenesisBlock = () => {
    const genesis = new Block({
      index: 0,
      data: randomString(),
      previousHash: '0',
    });
    genesis.mineBlock(this.difficulty);

    return genesis;
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
   * @return {true} if added a block
   */
  addBlock = (newBlock: Block) => {
    let isAdded = false;
    const latestBlock = this.getLatestBlock();
    const indexIsValid = newBlock.index === latestBlock.index + 1;
    const hashesAreValid = newBlock.previousHash === latestBlock.hash;

    if (indexIsValid && hashesAreValid) {
      this.chain.push(newBlock);
      isAdded = true;
    }

    return isAdded;
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
