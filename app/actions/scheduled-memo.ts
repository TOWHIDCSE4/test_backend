import mongoose from 'mongoose';
import ScheduledMemo, { ScheduledMemoModel } from '../models/scheduled-memo';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    type?: number;
    course_id?: number;
    month?: number;
    year?: number;
    student_id?: number;
    teacher_id?: number | any;
    teacher_commented?: boolean;
    teacher_assigned?: boolean;
    page_size?: number;
    page_number?: number;
};

export default class ScheduledMemoActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.type) {
            conditions.type = filter.type;
        }
        if (filter.course_id) {
            conditions.course_id = filter.course_id;
        }
        if (filter.month) {
            conditions.month = filter.month;
        }
        if (filter.year) {
            conditions.year = filter.year;
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.hasOwnProperty('teacher_assigned')) {
            if (filter.teacher_assigned) {
                /**
                 * We don't need to care about this if we already search
                 * for specific teachers
                 */
                if (!filter.teacher_id) {
                    conditions.teacher_id = { $ne: null };
                }
            } else {
                conditions.teacher_id = { $eq: null };
            }
        }
        if (filter.hasOwnProperty('teacher_commented')) {
            conditions.teacher_commented = filter.teacher_commented;
        }
        return conditions;
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { year: -1, month: -1, course_id: 1, student_id: 1 },
        select_fields: any = {}
    ): Promise<ScheduledMemo[]> {
        const conditions = await ScheduledMemoActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return ScheduledMemoModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate(
                'teacher',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('course')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(
        filter: FilterQuery,
        sort: any = { year: -1, month: -1, course_id: 1, student_id: 1 },
        select_fields: any = {}
    ): Promise<ScheduledMemo[]> {
        if (Object.keys(filter).length === 0) return Promise.resolve([]);
        const conditions = await ScheduledMemoActions.buildFilterQuery(filter);
        return ScheduledMemoModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate(
                'teacher',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('course')
            .sort(sort)
            .exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = await ScheduledMemoActions.buildFilterQuery(filter);
        return ScheduledMemoModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<ScheduledMemo | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return ScheduledMemoModel.findOne(filter, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate(
                'teacher',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('course')
            .exec();
    }

    public static create(memo: ScheduledMemo): Promise<ScheduledMemo> {
        const newModel = new ScheduledMemoModel({
            ...memo,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('scheduled_memo_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ScheduledMemo
    ): Promise<any> {
        return ScheduledMemoModel.findOneAndUpdate(
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
        return ScheduledMemoModel.deleteOne({ _id });
    }

    public static getTeacherList(filter: FilterQuery): Promise<Array<any>> {
        const conditions = ScheduledMemoActions.buildFilterQuery(filter);
        const sort = {
            _id: 1
        };
        return ScheduledMemoModel.aggregate([
            { $match: conditions },
            {
                $project: {
                    teacher_id: 1,
                    teacher: 1
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    teacher: { $first: '$teacher' },
                    student_count: { $sum: 1 }
                }
            },
            { $sort: sort },
            {
                $lookup: {
                    from: 'users',
                    localField: 'teacher',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $project: {
                    teacher: {
                        _id: 0,
                        __v: 0,
                        password: 0,
                        role: 0,
                        is_password_null: 0,
                        login_counter: 0,
                        created_time: 0,
                        updated_time: 0
                    }
                }
            }
        ]).exec();
    }
}
