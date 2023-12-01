import { sign, verify } from 'jsonwebtoken';
import { promisify } from 'util';
export default class JWT {
    public static async encode(
        payload: any,
        secret: string,
        expiresIn: Number
    ): Promise<string> {
        // @ts-ignore
        return promisify(sign)({ ...payload }, secret, {
            expiresIn,
            algorithm: 'HS256'
        });
    }

    public static async decode(token: string, secret: string): Promise<any> {
        // @ts-ignore
        return await promisify(verify)(token, secret);
    }
}
