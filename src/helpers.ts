import cryptoRandomString from 'crypto-random-string';
import {TMessage} from './types';

export const randomString = () => {
  return String(cryptoRandomString({
    length: 256,
    type: 'base64',
  }));
};

export const message = ({
  type,
  data,
}: TMessage) => {
  return {
    type: type,
    data: data,
  };
};
