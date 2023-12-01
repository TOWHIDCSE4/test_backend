import LogActions from '../../actions/log';
import { Request } from 'express';
import Log, { EnumPartner } from '../../models/log';
import _ from 'lodash';
const logger = require('dy-logger');

function deepDiff(fromObject: any, toObject: any) {
    const changes = {} as any;
    const buildPath = (path: any, obj: any, key: any) =>
        _.isUndefined(path) ? key : `${path}_${key}`;
    const walk = (fromObject: any, toObject: any, path?: any) => {
        for (const key of _.keys(fromObject)) {
            const currentPath = buildPath(path, fromObject, key);
            if (!_.has(toObject, key)) {
                changes[currentPath] = { from: _.get(fromObject, key) };
            }
        }

        for (const [key, to] of _.entries(toObject)) {
            const currentPath = buildPath(path, toObject, key);
            if (!_.has(fromObject, key)) {
                changes[currentPath] = { to };
            } else {
                const from = _.get(fromObject, key);
                if (!_.isEqual(from, to)) {
                    if (_.isObjectLike(to) && _.isObjectLike(from)) {
                        walk(from, to, currentPath);
                    } else {
                        changes[currentPath] = { from, to };
                    }
                }
            }
        }
    };
    walk(fromObject, toObject);
    return changes;
}

export enum EnumTypeChangeData {
    old = 'old',
    new = 'new'
}
export default class LogServices {
    public static async setChangeData(
        req: any,
        type: EnumTypeChangeData,
        name: string,
        data: any,
        pickUpData: any
    ) {
        if (req) {
            if (type === EnumTypeChangeData.old) {
                if (!req.old_data) {
                    req.old_data = {};
                }
                req.old_data[name] = _.pick(data, pickUpData);
            }

            if (type === EnumTypeChangeData.new) {
                if (!req.new_data) {
                    req.new_data = {};
                }
                req.new_data[name] = _.pick(data, pickUpData);
            }
        }
    }

    public static async saveLogData(
        req: any,
        description: string | any,
        code: number
    ) {
        try {
            const path = req?.route?.path;
            const method = req?.method;
            const originalUrl = req?.originalUrl;
            let user = null;
            if (req?.user) {
                user = {
                    id: req?.user?.id,
                    username: req?.user?.username,
                    _id: req?.user?._id
                };
            }
            let change_data = {};

            if (req?.old_data && req?.new_data) {
                change_data = deepDiff(req?.old_data, req?.new_data);
            }
            await LogActions.create({
                user,
                code,
                route: path,
                original_url: originalUrl,
                method,
                change_data: change_data,
                body_data: { ...req?.body },
                params_data: { ...req?.params },
                description
            } as Log);
        } catch (error: any) {
            console.log(error);
            logger.error('==>LogServices.SaveLogData', error?.message);
        }
    }

    public static async saveLogDataAdminCronjob(req: any) {
        if (req) {
            const path = req.route?.path;
            const method = req.method;
            if (
                method !== 'GET' &&
                (path.includes('admin') ||
                    path.includes('cron-jobs') ||
                    path.includes('student') ||
                    path.includes('teacher'))
            ) {
                await LogServices.saveLogData(req as any, '', 200);
            }
        }
    }
}
