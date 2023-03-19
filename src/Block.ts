import {TBlock} from './types';
import sha256 from 'crypto-js/sha256';
import {indexErrorText} from './const';

/** Class representing a block. */
class Block {
  index: number;
  data: string;
  previousHash: string;
  hash: string;

  /**
   * Block constructor
   * @param {number} index
   * @param {string} data
   * @param {string} previousHash
   */
  constructor({index, data}: TBlock) {
    this.validateIndex(index);

    this.index = index;
    this.data = data;
    this.previousHash = '';
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
    return sha256(this.index + this.previousHash + this.data).toString();
  };
}

export default Block;
