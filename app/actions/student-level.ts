import { escapeRegExp } from 'lodash';
import mongoose from 'mongoose';
import StudentLevel, { StudentLevelModel } from '../models/student-level';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    search?: string;
    name?: string | any;
    page_size?: number;
    page_number?: number;
};

export default class StudentLevelActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.search) {
            const searchRegexStr = escapeRegExp(filter.search);
            const name_search = {
                $regex: searchRegexStr,
                $options: 'i'
            };
            conditions.name = name_search;
        }
        if (filter.id) {
            conditions.id = filter.id;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { id: 1 },
        select_fields: any = {}
    ): Promise<StudentLevel[]> {
        const conditions = StudentLevelActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return StudentLevelModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { id: 1 },
        select_fields: any = {}
    ): Promise<StudentLevel[]> {
        const conditions = StudentLevelActions.buildFilterQuery(filter);
        return StudentLevelModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = StudentLevelActions.buildFilterQuery(filter);
        return StudentLevelModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<StudentLevel | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return StudentLevelModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(level: StudentLevel): Promise<StudentLevel> {
        const newModel = new StudentLevelModel({
            ...level,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: StudentLevel
    ): Promise<any> {
        return StudentLevelModel.findOneAndUpdate(
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
        return StudentLevelModel.deleteOne({ _id });
    }
}
