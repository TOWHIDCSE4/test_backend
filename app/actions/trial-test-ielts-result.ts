import mongoose from 'mongoose';

import TrialTestIeltsResult, {
    TrialTestIeltsResultModel
} from '../models/trial-test-ielts-result';
import { IGNORE_SENSITIVE_FIELDS } from '../models/user';
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
    code_access?: string;
    test_url?: string;
    test_topic_id?: number;
    test_result_id?: number;
    test_result_code?: string;
    test_topic_name?: string;
    test_result_grammar?: any;
    test_result_writing?: any;
    test_result_listening?: any;
    test_result_reading?: any;
    test_result_speaking?: any;
    created_time?: any;
    updated_time?: any;
    'test_result_grammar.test_start_time'?: any;
    'test_result_grammar.test_topic_id'?: any;
};

export default class TrialTestIeltsResultActions {
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
        if (filter.test_result_grammar) {
            conditions.test_result_grammar = filter.test_result_grammar;
        }
        if (filter['test_result_grammar.test_start_time']) {
            conditions['test_result_grammar.test_start_time'] =
                filter['test_result_grammar.test_start_time'];
        }
        if (filter['test_result_grammar.test_topic_id']) {
            conditions['test_result_grammar.test_topic_id'] =
                filter['test_result_grammar.test_topic_id'];
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
        if (filter.booking_id) {
            conditions.booking_id = filter.booking_id;
        }
        return conditions;
    }
    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): any {
        const conditions = TrialTestIeltsResultActions.buildFilterQuery(filter);
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
                $unwind: '$student'
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
                $unwind: '$course'
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
                $unwind: '$unit'
            },
            { $match: conditions },
            { $skip: skip },
            { $limit: limit }
        ];
        return TrialTestIeltsResultModel.aggregate(aggregate);
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<any[]> {
        const conditions = TrialTestIeltsResultActions.buildFilterQuery(filter);
        return TrialTestIeltsResultModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: any,
        select_fields?: any,
        sort: any = {}
    ): Promise<TrialTestIeltsResult | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TrialTestIeltsResultModel.findOne(filter, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = TrialTestIeltsResultActions.buildFilterQuery(filter);
        return TrialTestIeltsResultModel.countDocuments(conditions).exec();
    }

    public static create(
        trialTestIeltsResult: TrialTestIeltsResult
    ): Promise<TrialTestIeltsResult> {
        const newModel = new TrialTestIeltsResultModel({
            ...trialTestIeltsResult,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('trial_test_ielts_result_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<TrialTestIeltsResult | null> {
        return TrialTestIeltsResultModel.findOneAndUpdate(
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
        return TrialTestIeltsResultModel.deleteOne({ _id });
    }
}
