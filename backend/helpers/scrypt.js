import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const keyLength = 32;

/**
 * Hash a password using scrypt
 * @param {string} password
 * @returns {Promise<string>} The salt+hash
 */
export const hash = (password) => {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');

    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}.${derivedKey.toString('hex')}`);
    });
  });
};

/**
 * Compare a plain text password with a hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const compare = (password, hash) => {
  return new Promise((resolve, reject) => {
    const [salt, hashKey] = hash.split('.');
    const hashKeyBuff = Buffer.from(hashKey, 'hex');

    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(timingSafeEqual(hashKeyBuff, derivedKey));
    });
  });
};
