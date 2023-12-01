import mongoose from 'mongoose';

import SkypeMeetingPool, {
    SkypeMeetingPoolModel
} from '../models/skype-meeting-pool';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    status?: number;
    is_active?: boolean;
    info?: any;
    created_time?: any;
    updated_time?: any;
};

export default class SkypeMeetingPoolActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: any = {};
        const f: any = filter;
        if (filter.status) {
            conditions.status = filter.status;
        }
        if (filter.is_active) {
            conditions.is_active = filter.is_active;
        }
        if (filter.info) {
            conditions.info = filter.info;
        }
        if (f['$and'] && f['$and'].length) {
            conditions['$and'] = f['$and'];
        }
        if (f['$or'] && f['$or'].length) {
            conditions['$or'] = f['$or'];
        }
        if (filter.updated_time) {
            conditions.updated_time = filter.updated_time;
        }
        if (filter.created_time) {
            conditions.created_time = filter.created_time;
        }
        return conditions;
    }
    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): any {
        const conditions = SkypeMeetingPoolActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const aggregate = [
            {
                $sort: sort
            },
            { $match: conditions },
            { $skip: skip },
            { $limit: limit }
        ];
        return SkypeMeetingPoolModel.aggregate(aggregate);
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<SkypeMeetingPool[]> {
        const conditions = SkypeMeetingPoolActions.buildFilterQuery(filter);
        return SkypeMeetingPoolModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort: any = {}
    ): Promise<SkypeMeetingPool | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return SkypeMeetingPoolModel.findOne(filter, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = SkypeMeetingPoolActions.buildFilterQuery(filter);
        return SkypeMeetingPoolModel.countDocuments(conditions).exec();
    }

    public static create(
        skypeMeetingPool: SkypeMeetingPool
    ): Promise<SkypeMeetingPool> {
        const newModel = new SkypeMeetingPoolModel({
            ...skypeMeetingPool,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<SkypeMeetingPool | null> {
        return SkypeMeetingPoolModel.findOneAndUpdate(
            { _id },
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

    public static remove(_id: mongoose.Types.ObjectId): any {
        return SkypeMeetingPoolModel.deleteOne({ _id });
    }
}
