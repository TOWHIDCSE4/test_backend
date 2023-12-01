import _ from 'lodash';
import mongoose from 'mongoose';
import TeacherLevel, { TeacherLevelModel } from '../models/teacher-level';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    alias?: string;
    is_active?: boolean;
    search?: string;
    $or?: Array<object>;
    page_size?: number;
    page_number?: number;
};

export default class TeacherLevelActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.alias) {
            conditions.alias = filter.alias;
        }
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.search) {
            const name_search = {
                $regex: _.escapeRegExp(filter.search),
                $options: 'i'
            };
            conditions.$or = [{ name: name_search }, { alias: name_search }];
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: object = { id: 1 },
        select_fields: object = {}
    ): Promise<TeacherLevel[]> {
        const conditions = TeacherLevelActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TeacherLevelModel.find(conditions, {
            ...select_fields
        })
            .populate('hourly_rates.location', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: object = { id: 1 },
        select_fields: object = {}
    ): Promise<TeacherLevel[]> {
        const conditions = TeacherLevelActions.buildFilterQuery(filter);
        return TeacherLevelModel.find(conditions, {
            ...select_fields
        })
            .populate('hourly_rates.location', 'name')
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = TeacherLevelActions.buildFilterQuery(filter);
        return TeacherLevelModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<TeacherLevel | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TeacherLevelModel.findOne(filter, {
            ...select_fields
        })
            .populate('hourly_rates.location', 'name')
            .exec();
    }

    public static create(level: TeacherLevel): Promise<TeacherLevel> {
        const newModel = new TeacherLevelModel({
            ...level,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('teacher_level_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: TeacherLevel
    ): Promise<any> {
        return TeacherLevelModel.findOneAndUpdate(
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
        return TeacherLevelModel.deleteOne({ _id });
    }
}
