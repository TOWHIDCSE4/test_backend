const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    32
);

export const uidUtils = async () => {
    return await nanoid();
};
