import { isInteger, isString } from 'lodash';

export const forceParseInt = (value: any) => {
    if (isInteger(value)) {
        return value;
    } else if (isString(value)) {
        return parseInt(value);
    }
    return value;
};
