export const base64Encode = (text: string) => {
    const strEnCode = Buffer.from(text).toString('base64');
    return strEnCode;
};

export const base64Decode = (hash: string) => {
    const strDecode = Buffer.from(hash, 'base64').toString('ascii');
    return strDecode;
};
