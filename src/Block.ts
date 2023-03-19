import {TBlock} from './types';
import sha256 from 'crypto-js/sha256';

/** Class representing a block. */
class Block {
  index: number;
  data: string;
  previousHash: string;
  hash: string;

  /**
   * Block constructor
   * @param {number} index - порядковый номер блока
   * @param {string} data - данные
   * @param {string} previousHash - хэш предыдущего блока
   */
  constructor({index, data, previousHash = ''}: TBlock) {
    this.index = index;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  /**
   * Calculates hash of a block using sha256
   * @return {string} hash
   */
  calculateHash = () => {
    return sha256(this.index +
        this.previousHash +
        JSON.stringify(this.data)).toString();
  };
}

export default Block;
