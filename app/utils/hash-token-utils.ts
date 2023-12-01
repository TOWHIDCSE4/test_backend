const crypto = require('crypto');

export const sha1Utils = (input: string) => {
    return crypto.createHash('sha1').update(input).digest();
};

export const emailCacheTokenUtils = (input: string) => {
    return crypto.createHash('sha256').update(input).digest('hex');
};

export const resetPassCacheTokenUtils = (input: string) => {
    return crypto.createHash('sha512').update(input).digest('hex');
};
