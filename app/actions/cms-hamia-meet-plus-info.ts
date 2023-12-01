import mongoose from 'mongoose';
import Counter, { CounterModel } from '../models/counter';
import CMSHamiaMeetPlusInfo, {
    CMSHamiaMeetPlusInfoModel
} from '../models/cms-hamia-meet-plus-info';
import CounterActions from './counter';

const cacheService = require('../services/redis/cache-service');

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    booking_id?: number;
    student_id?: number;
    teacher_id?: number;
    page_size?: number;
    page_number?: number;
};
export default class CMSHamiaMeetPlusInfoActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: any = {};
        const f: any = filter;
        if (filter.id) {
            conditions.id = Number(filter.id);
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.booking_id) {
            conditions.booking_id = filter.booking_id;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 },
        select_fields: any = {}
    ): Promise<CMSHamiaMeetPlusInfo[]> {
        const conditions = CMSHamiaMeetPlusInfoActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return CMSHamiaMeetPlusInfoModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: 1 },
        select_fields: any = {}
    ): Promise<CMSHamiaMeetPlusInfo[]> {
        const conditions = CMSHamiaMeetPlusInfoActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return CMSHamiaMeetPlusInfoModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<CMSHamiaMeetPlusInfo | null> {
        const conditions = CMSHamiaMeetPlusInfoActions.buildFilterQuery(filter);
        return CMSHamiaMeetPlusInfoModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = CMSHamiaMeetPlusInfoActions.buildFilterQuery(filter);
        return CMSHamiaMeetPlusInfoModel.countDocuments(conditions).exec();
    }

    public static create(
        info: CMSHamiaMeetPlusInfo
    ): Promise<CMSHamiaMeetPlusInfo> {
        const newModel = new CMSHamiaMeetPlusInfoModel({
            ...info,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('cms_hmp_info_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: CMSHamiaMeetPlusInfo
    ): Promise<CMSHamiaMeetPlusInfo | null> {
        return CMSHamiaMeetPlusInfoModel.findOneAndUpdate(
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
        return CMSHamiaMeetPlusInfoModel.deleteOne({ _id });
    }
}
