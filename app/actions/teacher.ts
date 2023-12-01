import { EnumReviewStatus } from './../models/teacher';
import mongoose from 'mongoose';
import _, { size } from 'lodash';
import Teacher, { TeacherModel } from '../models/teacher';

import CalendarActions from '../actions/calendar';
import UserActions from '../actions/user';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';

const logger = require('dy-logger');

export type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    user_id?: number | any;
    status?: string;
    staff_id?: string;
    search?: string;
    page_size?: number;
    page_number?: number;
    location_id?: number | any;
    location_ids?: number[];
    is_reviewed?: EnumReviewStatus;
    teacher_level_id?: number;
    'skills.subject_id'?: number;
    'skills.subject_skills'?: number[];
    'user.is_active'?: boolean;
    $or?: any;
    ref_code?: string;
    'ref_by_teacher.id'?: number;
    referred?: boolean;
    ref_by_teacher?: any;
    created_time?: any;
    updated_time?: any;
};

type CalendarFilterQuery = {
    is_active?: boolean;
    start_time?: number;
    end_time?: number;
};

export default class TeacherActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.user_id) {
            conditions.user_id = filter.user_id;
        }
        if (filter.location_id && Number(filter.location_id) !== -1) {
            conditions.location_id = filter.location_id;
        }
        if (filter.location_ids && filter.location_ids.length > 0) {
            conditions.location_id = { $in: filter.location_ids };
        }
        if (filter.teacher_level_id) {
            conditions.teacher_level_id = filter.teacher_level_id;
        }
        if (filter.hasOwnProperty('is_reviewed')) {
            conditions.is_reviewed = filter.is_reviewed;
        }
        if (filter['skills.subject_id']) {
            conditions['skills.subject_id'] = filter['skills.subject_id'];
        }
        if (filter['skills.subject_skills']) {
            conditions['skills.subject_skills'] =
                filter['skills.subject_skills'];
        }
        if (filter['user.is_active'] != null) {
            conditions['user.is_active'] = filter['user.is_active'];
        }
        if (filter['staff_id'] != null) {
            conditions['staff_id'] = filter['staff_id'];
        }
        if (filter.search) {
            conditions['$or'] = [
                {
                    'user.full_name': {
                        $regex: _.escapeRegExp(filter.search),
                        $options: 'i'
                    }
                },
                {
                    'user.username': {
                        $regex: _.escapeRegExp(filter.search),
                        $options: 'i'
                    }
                }
            ];
        }
        if (filter.ref_code) {
            conditions.ref_code = filter.ref_code;
        }
        if (filter['ref_by_teacher.id']) {
            conditions['ref_by_teacher.id'] = filter['ref_by_teacher.id'];
        }
        if (filter.referred) {
            conditions.ref_by_teacher = { $ne: null };
        }
        if (filter.created_time) {
            conditions.created_time = filter.created_time;
        }
        if (filter.updated_time) {
            conditions.updated_time = filter.updated_time;
        }
        return conditions;
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { 'user.full_name': 1 }
    ): Promise<Teacher[]> {
        const conditions = TeacherActions.buildFilterQuery(filter);
        return TeacherModel.find(conditions, {
            ...select_fields
        })
            .populate('level', 'id name')
            .populate('location', 'id name')
            .populate('user_info', 'full_name is_active avatar')
            .sort(sort)
            .exec();
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<Teacher[]> {
        const conditions = TeacherActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        logger.info('teacher findAllAndPaginated query:');
        logger.info(JSON.stringify(conditions));
        return TeacherModel.find(conditions, {
            ...select_fields
        })
            .populate('level', '-hourly_rates')
            .populate('location', 'id name currency')
            .populate('user_info', '-password')
            .populate('teacher_salary')
            .populate('staff', 'fullname id')
            .populate('trial_teacher', 'teacher_id')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    /**
     * @description Getting teacher records by searching through teachers' free calendar
     *              that teachers set before
     * @param filter Teacher field filter
     * @param calendar_filter The calendar filter that the teachers set
     * @param select_fields The fields to include or exclude
     * @param sort Fields to sort the result
     * @returns The list of teacher matching filters
     */
    public static async findAllAndPaginatedWithNormalCalendar(
        filter: FilterQuery,
        calendar_filter: CalendarFilterQuery = {},
        select_fields: any = {},
        sort: any = { 'user.full_name': 1 }
    ): Promise<Teacher[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const teacherFilterResults = await TeacherActions.findAll(
            filter,
            select_fields,
            sort
        );

        let teachers = new Array<Teacher>();
        const teacherCalendarSet = new Set();

        if (calendar_filter.hasOwnProperty('start_time')) {
            const calendars = await CalendarActions.findAll(calendar_filter, {
                teacher_id: 1
            });
            calendars.map((calendar: any) => {
                teacherCalendarSet.add(calendar.teacher_id);
            });
        }

        await Promise.all(
            teacherFilterResults.map(async (teacher: Teacher) => {
                const user = await UserActions.findOne({ id: teacher.user_id });
                if (user) {
                    if (calendar_filter.hasOwnProperty('start_time')) {
                        if (teacherCalendarSet.has(teacher.user_id)) {
                            teachers.push(teacher);
                        }
                    } else {
                        teachers.push(teacher);
                    }
                }
            })
        );
        teachers = teachers.slice(skip, skip + limit);
        return teachers;
    }

    /**
     * @description Getting teacher records by searching through teachers'
     *              regular calendar that they registered with admins
     * @param filter Teacher field filter
     * @param regular_time A regular time of the week that teacher registered
     */
    public static async findAllAndPaginatedWithRegularCalendar(
        filter: FilterQuery,
        regular_time: number,
        select_fields: any = {},
        sort: any = { 'user.full_name': 1 }
    ): Promise<Teacher[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        filter['user.is_active'] = true;

        const conditions = TeacherActions.buildFilterQuery(filter);
        return TeacherModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] },
                                regular_times: regular_time
                            }
                        }
                    ],
                    as: 'matched_users'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$matched_users' }, 1] }
                }
            },
            {
                $unwind: '$matched_users'
            },
            {
                $lookup: {
                    from: 'regular-calendar',
                    let: {
                        id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$teacher_id'] },
                                regular_start_time: regular_time,
                                status: {
                                    $in: [
                                        EnumRegularCalendarStatus.ACTIVE,
                                        EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                                        EnumRegularCalendarStatus.EXPIRED
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'regular_calendar'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$regular_calendar' }, 0] }
                }
            },
            {
                $lookup: {
                    from: 'locations',
                    let: {
                        id: '$location_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] }
                            }
                        }
                    ],
                    as: 'location'
                }
            },
            {
                $unwind: '$location'
            },
            {
                $lookup: {
                    from: 'teacher-levels',
                    let: {
                        id: '$teacher_level_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] }
                            }
                        },
                        {
                            $project: {
                                id: 1,
                                name: 1
                            }
                        }
                    ],
                    as: 'level'
                }
            },
            {
                $unwind: '$level'
            },
            {
                $addFields: {
                    'user.skype_account': '$matched_users.skype_account'
                }
            },
            {
                $project: {
                    matched_users: 0,
                    ...select_fields
                }
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);
    }

    public static async findAllAndPaginatedWithStatus(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<Teacher[]> {
        if (_.isEmpty(filter)) return [];
        return TeacherActions.findAllAndPaginated(filter, select_fields, sort);
    }

    public static async countWithRegularCalendar(
        filter: FilterQuery,
        regular_time: number
    ): Promise<number> {
        filter['user.is_active'] = true;
        const conditions = TeacherActions.buildFilterQuery(filter);

        const matchedTeachers = await TeacherModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] },
                                regular_times: regular_time
                            }
                        }
                    ],
                    as: 'matched_users'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$matched_users' }, 1] }
                }
            },
            {
                $lookup: {
                    from: 'regular-calendar',
                    let: {
                        id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$teacher_id'] },
                                regular_start_time: regular_time,
                                status: {
                                    $in: [
                                        EnumRegularCalendarStatus.ACTIVE,
                                        EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                                        EnumRegularCalendarStatus.EXPIRED
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'regular_calendar'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$regular_calendar' }, 0] }
                }
            },
            { $count: 'count' }
        ]);
        if (!matchedTeachers) return 0;
        if (matchedTeachers.length <= 0) return 0;
        let count = 0;
        if (matchedTeachers[0].hasOwnProperty('count')) {
            count = matchedTeachers[0].count;
        }
        return count;
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Teacher | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TeacherModel.findOne(filter, {
            ...select_fields
        })
            .populate('location')
            .populate(
                'level',
                'id name min_calendar_per_circle min_peak_time_per_circle'
            )
            .exec();
    }

    public static async countWithNormalCalendar(
        filter: FilterQuery,
        calendar_filter: CalendarFilterQuery = {}
    ): Promise<number> {
        if (calendar_filter.hasOwnProperty('start_time')) {
            let count = 0;

            const teachers = await TeacherActions.findAll(filter);
            const calendars = await CalendarActions.findAll(calendar_filter, {
                teacher_id: 1
            });
            const teacherCalendarSet = new Set();
            calendars.map((calendar: any) => {
                teacherCalendarSet.add(calendar.teacher_id);
            });
            teachers.map((teacher: Teacher) => {
                if (teacherCalendarSet.has(teacher.user_id)) count++;
            });
            return count;
        } else {
            const count = await TeacherActions.count(filter);
            return count;
        }
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = TeacherActions.buildFilterQuery(filter);
        return TeacherModel.countDocuments(conditions).exec();
    }

    public static create(teacher: Teacher): Promise<Teacher> {
        const newModel = new TeacherModel({
            ...teacher,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Teacher
    ): Promise<any> {
        return TeacherModel.findOneAndUpdate(
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
        return TeacherModel.deleteOne({ _id });
    }

    public static removeByUserId(user_id: number): any {
        return TeacherModel.deleteOne({ user_id });
    }

    public static async findAllAndPaginatedNotInTrial(
        filter: FilterQuery,
        sort: any
    ): Promise<Teacher[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const conditions = TeacherActions.buildFilterQuery(filter);
        delete conditions.user_id;
        const teachers = await TeacherModel.aggregate(
            [
                Object.keys(conditions).length && { $match: conditions },
                {
                    $lookup: {
                        from: 'trial-teachers',
                        localField: 'user_id',
                        foreignField: 'teacher_id',
                        as: 'trial_teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$trial_teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: { trial_teacher: null }
                },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit }
            ].filter((v) => v)
        );
        if (
            filter.user_id &&
            !teachers.some((v) => v.user_id === filter.user_id)
        ) {
            const teacher = await TeacherActions.findOne({
                user_id: filter.user_id
            });
            teachers.unshift(teacher);
        }
        return teachers;
    }
    public static async countNotInTrial(filter: FilterQuery): Promise<number> {
        const conditions = TeacherActions.buildFilterQuery(filter);

        const result = await TeacherModel.aggregate(
            [
                Object.keys(conditions).length && { $match: conditions },
                {
                    $lookup: {
                        from: 'trial-teachers',
                        localField: 'user_id',
                        foreignField: 'teacher_id',
                        as: 'trial_teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$trial_teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        $or: [
                            { trial_teacher: null },
                            { user_id: filter.user_id }
                        ]
                    }
                },
                { $count: 'count' }
            ].filter((v) => v)
        );
        if (!result) return 0;
        if (result.length <= 0) return 0;
        let count = 0;
        if (result[0].hasOwnProperty('count')) {
            count = result[0].count;
        }
        return count;
    }

    public static async findAllAndPaginatedByRegularTime(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        filter_regular_time: any
    ): Promise<Teacher[]> {
        const conditions = TeacherActions.buildFilterQuery(filter);
        if (filter.location_id) {
            conditions.location_id = parseInt(filter.location_id);
        }
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        logger.info('teacher findAllAndPaginatedByRegularTime query:');
        logger.info(JSON.stringify(conditions));
        return await TeacherModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $match: { $or: filter_regular_time }
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);
    }

    public static async countByRegularTime(
        filter: FilterQuery,
        filter_regular_time: any
    ): Promise<Teacher[]> {
        const conditions = TeacherActions.buildFilterQuery(filter);
        if (filter.location_id) {
            conditions.location_id = parseInt(filter.location_id);
        }
        return await TeacherModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $match: { $or: filter_regular_time }
            },
            { $count: 'count' }
        ]);
    }
}
