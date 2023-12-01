import config from 'config';
import { AccessTokenError, AuthFailureError } from '../core/ApiError';
import AsyncHandler from '../core/async-handler';
import JWT from '../core/jwt';
import { ProtectedRequest } from 'app-request';
import { Request, Response, NextFunction } from 'express';

export const validateToken = () =>
    AsyncHandler(
        async (req: ProtectedRequest, res: Response, next: NextFunction) => {
            try {
                const access_token = req.headers.authorization;
                if (!access_token || typeof access_token === 'undefined')
                    throw new AccessTokenError(
                        req.t('errors.authentication.access_token_invalid')
                    );
                const secret: string = config.get('server.secret_token');
                const decoded = await JWT.decode(access_token, secret);
                // tạm thời không check token trong cache vì chưa có tính năng cần logout từ xa
                // const cacheTokens = await CacheService.get(
                //     decoded.id + '_token'
                // );
                // console.log(cacheToken);
                // cacheTokens là 1 mảng các token được sinh ra khi user login trên nhiều thiết bị khác nhau
                // if (!cacheTokens || !cacheTokens.includes(access_token) ) {
                //     throw new AccessTokenError(
                //         req.t('errors.authentication.access_token_invalid')
                //     );
                // }
                req.access_token = access_token;
                req.user = decoded;
                return next();
            } catch (err: any) {
                console.log(err);
                throw new AccessTokenError(err.message);
            }
        }
    );

export const validatePermission = (permissionsArr: string[]) =>
    AsyncHandler(
        async (req: ProtectedRequest, res: Response, next: NextFunction) => {
            try {
                if (!req.user) {
                    throw new AuthFailureError();
                }
                const permissions = req.user.permissions;
                if (
                    permissions &&
                    permissions.length &&
                    permissionsArr.length
                ) {
                    for (const iterator of permissionsArr) {
                        // kiểm tra danh sách quyền của user có tồn tại 1 trong các key yêu cầu của api hay không
                        if (permissions.includes(iterator)) {
                            return next();
                        }
                    }
                }
                throw new AuthFailureError();
            } catch (err: any) {
                console.log(err);
                throw new AuthFailureError(err.message);
            }
        }
    );

export const validateService = (serviceName: string) =>
    AsyncHandler(
        async (req: ProtectedRequest, res: Response, next: NextFunction) => {
            try {
                const key = req.headers['api-key'];
                if (!key || !serviceName)
                    throw new AuthFailureError(
                        req.t('errors.authentication.permission_denied')
                    );
                const apiKey = config.get(
                    'auth_services.' + serviceName + '.key'
                );
                if (key !== apiKey)
                    throw new AuthFailureError(
                        req.t('errors.authentication.permission_denied')
                    );
                next();
            } catch (err: any) {
                console.log(err);
                throw new AuthFailureError(err.message);
            }
        }
    );

export default {
    validateToken,
    validatePermission,
    validateService
};
