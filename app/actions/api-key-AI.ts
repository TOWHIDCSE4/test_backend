import mongoose from 'mongoose';
import ApiKeyAI, { ApiKeyAIModel } from '../models/api-key-AI';
import _ from 'lodash';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    title?: any;
    api_key?: string;
    is_active?: number[] | any;
    page_size?: number;
    page_number?: number;
    search?: string;
    $and?: Array<any>;
};

export default class ApiKeyAIActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.search) {
            conditions.title = {
                $regex: _.escapeRegExp(filter.search),
                $options: 'i'
            };
        }
        if (filter.api_key) {
            conditions.api_key = filter.api_key;
        }
        if (filter.is_active || filter.is_active === false) {
            conditions.is_active = filter.is_active;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<ApiKeyAI[]> {
        const conditions = ApiKeyAIActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return ApiKeyAIModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<ApiKeyAI[]> {
        const conditions = ApiKeyAIActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return ApiKeyAIModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort: any = {}
    ): Promise<ApiKeyAI | null> {
        const conditions = ApiKeyAIActions.buildFilterQuery(filter);
        return ApiKeyAIModel.findOne(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = ApiKeyAIActions.buildFilterQuery(filter);
        return ApiKeyAIModel.countDocuments(conditions).exec();
    }

    public static create(subject: ApiKeyAI): Promise<ApiKeyAI> {
        const newModel = new ApiKeyAIModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ApiKeyAI
    ): Promise<any> {
        return ApiKeyAIModel.findOneAndUpdate(
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
        return ApiKeyAIModel.deleteOne({ _id });
    }
}
