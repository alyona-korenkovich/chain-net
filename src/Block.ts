import {TBlock} from './types';
import sha256 from 'crypto-js/sha256';
import {indexErrorText} from './const';

/** Class representing a block. */
class Block {
  index: number;
  data: string;
  previousHash: string;
  hash: string;
  nonce: number;

  /**
   * Block constructor
   * @param {number} index
   * @param {string} data
   * @param {string} previousHash
   */
  constructor({index, data, previousHash}: TBlock) {
    this.validateIndex(index);

    this.index = index;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  /**
   * Validate a given index
   * @param {number} index - given index
   * @throws Will throw an error if the index is negative
   */
  validateIndex = (index: number) => {
    if (index < 0) throw new Error(indexErrorText);
  };

  /**
   * Calculates hash of a block using sha256
   * @return {string} hash
   */
  calculateHash = () => {
    return sha256(
        this.index +
        this.previousHash +
        this.data +
        this.nonce,
    ).toString();
  };

  /**
   * Mine a block - increase nonce until the hash ends with `difficulty` zeros
   * @param {number} difficulty - number of zeros in the end
   * @return {true} when mining is done
   */
  mineBlock = (difficulty: number) => {
    const hashLength = this.hash.length;
    const getLastSymbols = () => {
      return this.hash.substring(hashLength - difficulty, hashLength);
    };

    let hashLastFourSymbols = getLastSymbols();
    const zerosString = Array(difficulty + 1).join('0');
    while (hashLastFourSymbols !== zerosString) {
      this.nonce++;
      this.hash = this.calculateHash();
      hashLastFourSymbols = getLastSymbols();
    }

    return true;
  };
}

export default Block;
