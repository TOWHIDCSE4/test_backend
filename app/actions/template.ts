import _ from 'lodash';
import mongoose from 'mongoose';
import Template, { EnumTemplateType, TemplateModel } from '../models/template';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    type?: EnumTemplateType | EnumTemplateType[];
    code?: string | string[] | any;
    search?: string;
    page_size?: number;
    page_number?: number;
    $or?: Array<object>;
};

export default class TemplateActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) conditions._id = filter._id;
        if (filter.type) conditions.type = filter.type;
        if (filter.code) conditions.code = filter.code;
        if (filter.search) {
            const search = {
                $regex: _.escapeRegExp(filter.search),
                $options: 'i'
            };
            conditions.$or = [{ name: search }, { code: search }];
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ): Promise<Template[]> {
        const conditions = TemplateActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TemplateModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Template | null> {
        const conditions = TemplateActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve(null);
        return TemplateModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static find(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Template[]> {
        const conditions = TemplateActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return TemplateModel.find(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = TemplateActions.buildFilterQuery(filter);
        return TemplateModel.countDocuments(conditions).exec();
    }

    public static create(subject: Template): Promise<Template> {
        const newModel = new TemplateModel({
            ...subject
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Template
    ): Promise<any> {
        return TemplateModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff
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
        return TemplateModel.deleteOne({ _id });
    }
}
