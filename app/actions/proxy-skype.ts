import Proxy, { ProxyModel } from '../models/proxy';
import { EnumProxySkypeStatus } from './../models/proxy';
import mongoose from 'mongoose';

export type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    skype_call_status?: EnumProxySkypeStatus;
    last_time_use?: Date;
    error_msg?: string;
};

export default class ProxyActions {
    public static create(proxy: Proxy): Promise<Proxy> {
        const newModel = new ProxyModel({
            ...proxy,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(host: string, diff: Proxy): Promise<any> {
        return ProxyModel.findOneAndUpdate(
            { host },
            {
                $set: {
                    ...diff,
                    updated_time: new Date()
                }
            },
            {
                upsert: false,
                new: true,
                returnOriginal: false
            }
        ).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Proxy | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return ProxyModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {}
    ): Promise<Proxy[]> {
        return ProxyModel.find(filter, {
            ...select_fields
        }).exec();
    }

    public static findOneWithLastTimeUse(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Proxy | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return ProxyModel.findOne(filter, {
            ...select_fields
        })
            .sort({ last_time_use: 1 })
            .limit(1)
            .exec();
    }

    public static removeMany(arrayHost: any): any {
        return ProxyModel.deleteMany({ host: { $in: arrayHost } });
    }

    public static removeManyAvailableStatusAndNotIn(arrayHost: any): any {
        return ProxyModel.deleteMany({
            host: { $nin: arrayHost },
            skype_call_status: EnumProxySkypeStatus.AVAILABLE
        });
    }
}
