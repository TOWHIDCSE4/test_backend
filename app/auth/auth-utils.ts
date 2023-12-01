import { AuthFailureError } from '../core/ApiError';
import JWT from '../core/jwt';
import { sign, verify } from 'jsonwebtoken';
import { promisify } from 'util';
import config from 'config';
import cacheService from '../services/redis/cache-service';

const meetKey = config.get('services.hamia_meet.key');
const expire_time_token = config.get('server.expire_time_token');

export enum MiddlewareType {
    ADMIN = 'admin',
    USER = 'user'
}

export const createToken = async (
    user: any,
    isAdmin: boolean,
    secret: string
) => {
    const access_token = await JWT.encode(
        {
            id: user.id,
            _id: user._id,
            zalo_id: user.zalo_id,
            username: user.username,
            name: user.fullname || user.full_name,
            full_name: user.fullname || user.full_name,
            email: user.email || '',
            role: user.role,
            department: user.department
                ? {
                      isRole: user.department.isRole,
                      _id: user.department.department._id,
                      id: user.department.department.id,
                      unsignedName: user.department.department.unsignedName
                  }
                : null,
            permissions: user.permissions,
            isAdmin: isAdmin,
            is_active: user.is_active
        },
        secret,
        Number(expire_time_token)
    );
    // tạm thời không set token vào cache vì chưa có tính năng cần logout từ xa
    // const listToken = await cacheService.get(id + '_token');
    // if (!listToken)) {
    //     listToken=[];
    // }
    // if (!listToken.find((e: any) => e == access_token)) {
    //     listToken.push(access_token);
    // }
    // await cacheService.set(
    //     id + '_token',
    //     listToken,
    //     Number(expire_time_token)
    // );
    return access_token;
};

export const getZoomAccessToken = (): string => {
    const jwt = require('jsonwebtoken');
    const iat = Math.floor(Date.now() / 1000);
    const time = 1; // số ngày hết hạn
    const exp = iat + time * 24 * 60 * 60;
    const token = jwt.sign(
        { iss: 'Fcnto8D1Rma0qrpTHgZeOA', iat, exp },
        'ENDogD1fmSPOzaZIpXMIk6bkCpo0HBp6zcCk',
        { algorithm: 'HS256' }
    );
    return token;
};

export const getMeetAccessToken = (payload: any): string => {
    // @ts-ignore
    return promisify(sign)({ ...payload }, meetKey, { algorithm: 'HS256' });
};
