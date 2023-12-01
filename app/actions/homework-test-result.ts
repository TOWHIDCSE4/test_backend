import mongoose from 'mongoose';

import HomeworkTestResult, {
    HomeworkTestResultModel
} from '../models/homework-test-result';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    page_size?: number;
    page_number?: number;
    student_id?: number;
    booking_id?: number;
    course_id?: number;
    unit_id?: number;
    test_type?: number;
    test_topic_id?: number;
    test_result_id?: number;
    test_result_code?: string;
    test_result?: any;
    test_topic_name?: string;
    test_url?: string;
    created_time?: any;
    updated_time?: any;
    'test_result.submission_time'?: any;
    $or?: any;
    $and?: any;
};

export default class HomeworkTestResultActions {
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
        if (filter.course_id) {
            conditions.course_id = filter.course_id;
        }
        if (filter.unit_id) {
            conditions.unit_id = filter.unit_id;
        }
        if (filter.test_result) {
            conditions.test_result = filter.test_result;
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
        if (filter.test_topic_id) {
            conditions.test_topic_id = filter.test_topic_id;
        }
        if (filter.test_topic_id) {
            conditions.test_topic_id = filter.test_topic_id;
        }
        if (filter['test_result.submission_time']) {
            conditions['test_result.submission_time'] =
                filter['test_result.submission_time'];
        }
        return conditions;
    }
    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): any {
        const conditions = HomeworkTestResultActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const aggregate = [
            {
                $sort: sort
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $unwind: {
                    path: '$student',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            {
                $unwind: {
                    path: '$course',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'units',
                    localField: 'unit_id',
                    foreignField: 'id',
                    as: 'unit'
                }
            },
            {
                $unwind: {
                    path: '$unit',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: conditions },
            { $skip: skip },
            { $limit: limit }
        ];
        return HomeworkTestResultModel.aggregate(aggregate);
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<HomeworkTestResult[]> {
        const conditions = HomeworkTestResultActions.buildFilterQuery(filter);
        return HomeworkTestResultModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort: any = {}
    ): Promise<HomeworkTestResult | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return HomeworkTestResultModel.findOne(filter, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = HomeworkTestResultActions.buildFilterQuery(filter);
        return HomeworkTestResultModel.countDocuments(conditions).exec();
    }

    public static create(
        homeworkTestResult: HomeworkTestResult
    ): Promise<HomeworkTestResult> {
        const newModel = new HomeworkTestResultModel({
            ...homeworkTestResult,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('homework_test_result_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: HomeworkTestResult
    ): Promise<HomeworkTestResult | null> {
        return HomeworkTestResultModel.findOneAndUpdate(
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
        return HomeworkTestResultModel.deleteOne({ _id });
    }
}
