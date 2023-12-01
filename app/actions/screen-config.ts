import mongoose from 'mongoose';
import ScreenConfig, {
    ScreenConfigModel
} from '../models/screen-configuration';

import { DAY_TO_MS } from '../const/date-time';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    server?: string;
    screen?: number | number[];
    is_show?: boolean;
    search?: string;
    $and?: Array<any>;
};

export default class ScreenConfigActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.server) {
            conditions.server = filter.server;
        }
        if (filter.screen) {
            conditions.screen = filter.screen;
        }
        if (filter.hasOwnProperty('is_show')) {
            conditions.is_show = filter.is_show;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<ScreenConfig[]> {
        const conditions = ScreenConfigActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return ScreenConfigModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<ScreenConfig[]> {
        const conditions = ScreenConfigActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return ScreenConfigModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<ScreenConfig | null> {
        const conditions = ScreenConfigActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve(null);
        return ScreenConfigModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = ScreenConfigActions.buildFilterQuery(filter);
        return ScreenConfigModel.countDocuments(conditions).exec();
    }

    public static create(subject: ScreenConfig): Promise<ScreenConfig> {
        const newModel = new ScreenConfigModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ScreenConfig
    ): Promise<any> {
        return ScreenConfigModel.findOneAndUpdate(
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
        return ScreenConfigModel.deleteOne({ _id });
    }
}
