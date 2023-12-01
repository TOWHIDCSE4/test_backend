import { escapeRegExp } from 'lodash';
import mongoose from 'mongoose';
import Unit, { UnitModel, EnumExamType } from '../models/unit';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    is_active?: boolean;
    course_id?: number | object;
    name?: string;
    search?: string;
    $or?: Array<object>;
    page_size?: number;
    page_number?: number;
    course_ids?: number[];
    exam?: any;
    exam_id?: number;
    homework?: any;
    homework_id?: number;
    exam_type?: number;
    test_topic?: any;
    test_topic_id?: number;
    ielts_reading_topic?: any;
    ielts_reading_topic_id?: number;
    ielts_writing_topic?: any;
    ielts_writing_topic_id?: number;
    ielts_listening_topic?: any;
    ielts_listening_topic_id?: number;
};

export default class UnitActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.course_id) {
            conditions.course_id = filter.course_id;
        }
        if (filter.name) {
            conditions.name = filter.name;
        }
        if (filter.search) {
            const searchRegexStr = escapeRegExp(filter.search);
            const name_search = {
                $regex: searchRegexStr,
                $options: 'i'
            };
            conditions.$or = [{ name: name_search }];
        }
        if (filter.course_ids && filter.course_ids.length > 0) {
            conditions.course_id = { $in: filter.course_ids };
        }
        if (filter.exam_type) {
            conditions.exam_type = filter.exam_type;
        }
        return conditions;
    }

    public static findAll(
        filter: FilterQuery,
        sort: object = { course_id: 1, id: 1 },
        select_fields: object = {}
    ): Promise<Unit[]> {
        const conditions = UnitActions.buildFilterQuery(filter);
        return UnitModel.find(conditions, {
            ...select_fields
        })
            .populate('course')
            .sort(sort)
            .exec();
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: object = { course_id: 1, display_order: 1, id: 1 },
        select_fields: object = {}
    ): Promise<Unit[]> {
        const conditions = UnitActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return UnitModel.find(conditions, {
            ...select_fields
        })
            .populate('course')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Unit | null> {
        const conditions = UnitActions.buildFilterQuery(filter);
        return UnitModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = UnitActions.buildFilterQuery(filter);
        return UnitModel.countDocuments(conditions).exec();
    }
    public static countCheckFinalExam(filter: FilterQuery): Promise<number> {
        const conditions: any = UnitActions.buildFilterQuery(filter);
        if (filter.id) {
            conditions.id = { $ne: filter.id };
        }
        return UnitModel.countDocuments(conditions).exec();
    }

    public static create(subject: Unit): Promise<Unit> {
        const newModel = new UnitModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('unit_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Unit
    ): Promise<any> {
        return UnitModel.findOneAndUpdate(
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
        return UnitModel.deleteOne({ _id });
    }

    public static findAllPublic(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { course_id: 1, id: 1 }
    ): Promise<Unit[]> {
        const conditions = UnitActions.buildFilterQuery(filter);
        return UnitModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findAllPublicAuth(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { course_id: 1, id: 1 }
    ): Promise<Unit[]> {
        const conditions = UnitActions.buildFilterQuery(filter);
        return UnitModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static getUnitOfFinalExam(course_id: number): Promise<Unit | null> {
        const query = {
            exam_id: { $ne: null },
            exam: { $ne: null },
            exam_type: EnumExamType.FINAL_EXAM,
            course_id
        };
        return UnitModel.findOne(query).exec();
    }
}
