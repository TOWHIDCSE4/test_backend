import { escapeRegExp } from 'lodash';
import mongoose from 'mongoose';
import Curriculum, { CurriculumModel } from '../models/curriculum';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    alias?: string;
    search?: string;
    $or?: Array<any>;
    $and?: Array<any>;
    page_size?: number;
    page_number?: number;
    age_list?: number[] | any;
};

export default class CurriculumActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.id) {
            conditions.id = filter.id;
        }
        const searchRegexStr = escapeRegExp(filter.search);
        if (filter.search) {
            const name_search = {
                $regex: searchRegexStr,
                $options: 'i'
            };
            const name_filter = [{ name: name_search }, { alias: name_search }];
            if (conditions.$or) {
                conditions.$and = [
                    { $or: conditions.$or },
                    { $or: name_filter }
                ];
                delete conditions['$or'];
            } else {
                conditions.$or = name_filter;
            }
        }
        if (
            filter.age_list &&
            Array.isArray(filter.age_list) &&
            filter.age_list.length > 0
        ) {
            conditions.age_list = { $all: filter.age_list };
        }
        return conditions;
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<Curriculum[]> {
        const conditions = CurriculumActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return CurriculumModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<Curriculum[]> {
        const conditions = CurriculumActions.buildFilterQuery(filter);
        return CurriculumModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = CurriculumActions.buildFilterQuery(filter);
        return CurriculumModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Curriculum | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return CurriculumModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(curriculum: Curriculum): Promise<Curriculum> {
        const newModel = new CurriculumModel({
            ...curriculum,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('curriculum_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Curriculum
    ): Promise<any> {
        return CurriculumModel.findOneAndUpdate(
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
        return CurriculumModel.deleteOne({ _id });
    }
}
