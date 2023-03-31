import cryptoRandomString from 'crypto-random-string';

export const randomString = () => {
  return String(cryptoRandomString({
    length: 256,
    type: 'base64',
  }));
};
