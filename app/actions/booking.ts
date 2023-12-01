import mongoose from 'mongoose';
import moment from 'moment';

import Booking, { BookingModel, EnumBookingStatus } from '../models/booking';
import { IGNORE_SENSITIVE_FIELDS } from '../models/user';
import {
    MIN_COMPLETED_BOOKING_FOR_MONTHLY_MEMO,
    MIN_PERCENTAGE_TO_PICK_TEACHERS_FOR_COMMENT
} from '../const/booking';
import { EnumPackageOrderType } from '../const/package';
import _, { escapeRegExp, isBoolean } from 'lodash';
import CounterActions from './counter';
import { EnumHomeworkType } from '../models/unit';

const logger = require('dy-logger');

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    page_size?: number;
    page_number?: number;
    start_time?: number | any;
    end_time?: number;
    teacher_id?: number;
    student_id?: number;
    course_id?: number;
    calendar_id?: number;
    ordered_package_id?: number | any;
    memo?: any;
    unit_id?: number;
    status?: number[] | any;
    student_rating?: number[] | any;
    'calendar.start_time'?: number | any;
    'calendar.end_time'?: number | any;
    min_start_time?: number;
    max_end_time?: number;
    best_memo?: any;
    is_late?: any;
    is_regular_booking?: boolean;
    is_exists_homework?: boolean;
    unit_name?: string;
    finished_at?: number | any;
    record_link?: any;
    not_done_over_time?: any;
    alerted?: any;
    $or?: any;
    substitute_for_teacher_id?: number;
    ordered_package?: mongoose.Types.ObjectId;
    report?: any;
    ispeak_booking_id?: number;
    exam_type?: string;
    source?: string;
    memo_status?: number;
    updated_time?: any;
    admin_unit_lock?: any;
    from_ispeak?: any;
    test_result_id?: number;
    test_result?: any;
    min_test_start_time?: number;
    max_test_start_time?: number;
    created_time?: any;
    test_topic_id?: number;
    homework?: any;
    'unit.homework_id'?: any;
    'unit.homework.id'?: any;
    'unit.homework2_id'?: any;
    'unit.homework2.id'?: any;
    $and?: any;
    'homework.sessions'?: any;
    homework_type?: string;
    'ordered_package.type'?: any;
    sale_id?: number;
    session_homework?: any;
    'homework.sessions.0.id'?: any;
    booking_ids?: any;
};

export default class BookingActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: any = {};
        const f: any = filter;
        if (filter.id) {
            conditions.id = Number(filter.id);
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.from_ispeak) {
            conditions.from_ispeak = filter.from_ispeak;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.calendar_id) {
            conditions.calendar_id = filter.calendar_id;
        }
        if (filter.hasOwnProperty('is_late')) {
            conditions.is_late = filter.is_late;
        }
        if (filter.course_id) {
            conditions.course_id = filter.course_id;
        }
        if (filter.ordered_package_id) {
            conditions.ordered_package_id = filter.ordered_package_id;
        }
        if (filter.unit_id) {
            conditions.unit_id = filter.unit_id;
        }
        if (filter.admin_unit_lock) {
            conditions.admin_unit_lock = filter.admin_unit_lock;
        }
        if (filter.test_result) {
            conditions.test_result = filter.test_result;
        }
        if (typeof filter.best_memo !== 'undefined') {
            if (filter.best_memo) {
                conditions.best_memo = filter.best_memo;
            } else {
                conditions.best_memo = { $in: [null, false] };
            }
        }
        if (filter['calendar.start_time']) {
            conditions['calendar.start_time'] = filter['calendar.start_time'];
        }
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0) {
                conditions.status = { $in: filter.status };
            }
            if (!Array.isArray(filter.status)) {
                conditions.status = filter.status;
            }
        }
        if (filter.student_rating) {
            if (
                Array.isArray(filter.student_rating) &&
                filter.student_rating.length > 0
            ) {
                conditions.student_rating = { $in: filter.student_rating };
            } else {
                conditions.student_rating = filter.student_rating;
            }
        }
        if (filter.report) {
            conditions.report = filter.report;
        }
        if (filter.hasOwnProperty('min_start_time')) {
            conditions['calendar.start_time'] = { $gte: filter.min_start_time };
        }
        if (filter.hasOwnProperty('max_end_time')) {
            conditions['calendar.end_time'] = { $lte: filter.max_end_time };
        }
        if (filter.hasOwnProperty('is_regular_booking')) {
            conditions.is_regular_booking = filter.is_regular_booking;
        }
        if (filter.substitute_for_teacher_id) {
            conditions.substitute_for_teacher_id =
                filter.substitute_for_teacher_id;
        }
        // if (filter.is_exists_homework) {
        //     conditions['unit.homework'] = { $exists: true }
        // }
        if (f['$and'] && f['$and'].length) {
            conditions['$and'] = f['$and'];
        }
        if (f['$or'] && f['$or'].length) {
            conditions['$or'] = f['$or'];
        }
        if (filter.hasOwnProperty('memo')) conditions.memo = filter?.memo;
        if (filter.finished_at) {
            conditions.finished_at = filter.finished_at;
        }
        if (filter.record_link) {
            conditions.record_link = filter.record_link;
        }
        if (filter.ispeak_booking_id) {
            conditions.ispeak_booking_id = filter.ispeak_booking_id;
        }
        if (filter.memo_status) {
            if (filter.memo_status === 1) {
                conditions['memo.created_time'] = { $exists: true };
            }
            if (filter.memo_status === 2) {
                conditions['memo.created_time'] = { $exists: false };
            }
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
        if (filter['ordered_package.type']) {
            if (
                Array.isArray(filter['ordered_package.type']) &&
                filter['ordered_package.type'].length > 0
            ) {
                conditions['ordered_package.type'] = {
                    $in: filter['ordered_package.type']
                };
            }
            if (!Array.isArray(filter['ordered_package.type'])) {
                conditions['ordered_package.type'] = Number(
                    filter['ordered_package.type']
                );
            }
        }
        if (filter.booking_ids) {
            if (
                Array.isArray(filter.booking_ids) &&
                filter.booking_ids.length > 0
            ) {
                conditions.id = {
                    $in: filter.booking_ids
                };
            }
            if (!Array.isArray(filter.booking_ids)) {
                conditions.id = Number(filter.booking_ids);
            }
        }
        return conditions;
    }
    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 },
        select_fields: any = {}
    ): Promise<Booking[]> {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return BookingModel.find(conditions, {
            ...select_fields
        })
            .populate('student', { ...IGNORE_SENSITIVE_FIELDS })
            .populate('teacher', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('unit')
            .populate('ordered_package')
            .populate('report')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 },
        select_fields: any = {}
    ): Promise<Booking[]> {
        const conditions = BookingActions.buildFilterQuery(filter);
        return BookingModel.find(conditions, {
            ...select_fields
        })
            .populate('student', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('teacher', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('report')
            .populate('unit')
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static findAllAgg(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 },
    ): Promise<Booking[]> {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        return BookingModel.aggregate([
            {
                $match: conditions
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
                    from: 'users',
                    localField: 'teacher_id',
                    foreignField: 'id',
                    as: 'teacher'
                }
            },
            {
                $unwind: '$teacher'
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
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
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package_id',
                    foreignField: 'id',
                    as: 'ordered_package'
                }
            },
            {
                $unwind: '$ordered_package'
            },
            {
                $lookup: {
                    from: 'reports',
                    localField: 'id',
                    foreignField: 'booking_id',
                    as: 'reports'
                }
            },
            {
                $unwind: {
                    path: '$reports',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'advice-letter',
                    localField: 'id',
                    foreignField: 'booking_id',
                    as: 'advice_letters'
                }
            },
            {
                $unwind: {
                    path: '$advice_letters',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: sort
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]).exec();
    }

    public static async findAllAndPaginatedNotPopulate(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 }
    ) {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return BookingModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
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
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $lookup: {
                    from: 'users',
                    let: { t_id: '$teacher_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$$t_id', '$id'] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                full_name: 1,
                                avatar: 1,
                                email: 1,
                                gender: 1,
                                phone_number: 1,
                                skype_account: 1,
                                username: 1
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered_package'
                }
            },
            {
                $unwind: '$ordered_package'
            },
            {
                $lookup: {
                    from: 'homework-test-result',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$booking_id'] }
                            }
                        },
                        {
                            $match: {
                                'test_result.submission_time': { $exists: true }
                            }
                        },
                        {
                            $project: {
                                test_result_code: 1,
                                test_result: 1,
                                test_result_id: 1,
                                test_topic_id: 1,
                                test_topic_name: 1,
                                test_type: 1
                            }
                        },
                        { $sort: { id: 1 } },
                        { $limit: 1 }
                    ],
                    as: 'homework_test_result'
                }
            },
            {
                $unwind: {
                    path: '$homework_test_result',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async findAllNotPopulate(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 }
    ) {
        const conditions = BookingActions.buildFilterQuery(filter);
        return BookingModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
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
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $lookup: {
                    from: 'users',
                    let: { t_id: '$teacher_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$$t_id', '$id'] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                full_name: 1,
                                avatar: 1,
                                email: 1,
                                gender: 1,
                                phone_number: 1,
                                skype_account: 1,
                                username: 1
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered_package'
                }
            },
            {
                $unwind: '$ordered_package'
            },
            {
                $lookup: {
                    from: 'homework-test-result',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$booking_id'] }
                            }
                        },
                        {
                            $match: {
                                'test_result.submission_time': { $exists: true }
                            }
                        },
                        {
                            $project: {
                                test_result_code: 1,
                                test_result: 1,
                                test_result_id: 1,
                                test_topic_id: 1,
                                test_topic_name: 1,
                                test_type: 1
                            }
                        },
                        { $sort: { id: 1 } },
                        { $limit: 1 }
                    ],
                    as: 'homework_test_result'
                }
            },
            {
                $unwind: {
                    path: '$homework_test_result',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: conditions },
            { $sort: sort }
        ]).exec();
    }

    public static findAllByCaculateSalary(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 },
        select_fields: any = {}
    ): Promise<Booking[]> {
        const conditions = BookingActions.buildFilterQuery(filter);
        return BookingModel.find(conditions, {
            ...select_fields
        })
            .populate('student', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static findAllTrialBookingByCaculateSalary(teacher_id: number): any {
        return BookingModel.aggregate([
            { $match: { teacher_id, status: EnumBookingStatus.COMPLETED } },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered-packages'
                }
            },
            {
                $unwind: '$ordered-packages'
            },
            { $match: { 'ordered-packages.type': EnumPackageOrderType.TRIAL } }
        ]);
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort: any = {}
    ): Promise<Booking | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return BookingModel.findOne(filter, {
            ...select_fields
        })
            .populate('student', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('teacher', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('report')
            .populate('unit')
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static findOneWithLatestCalendar(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Booking | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return BookingModel.findOne(filter, {
            ...select_fields
        })
            .populate('student', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('teacher', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('unit')
            .populate('report')
            .populate('ordered_package')
            .sort({ 'calendar.end_time': -1 })
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = BookingActions.buildFilterQuery(filter);
        return BookingModel.countDocuments(conditions).exec();
    }

    public static create(booking: Booking): Promise<Booking> {
        const newModel = new BookingModel({
            ...booking,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('booking_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Booking
    ): Promise<Booking | null> {
        if (diff?.status === EnumBookingStatus.COMPLETED) {
            diff.finished_at = moment().valueOf();
        }
        if (diff?.status === EnumBookingStatus.TEACHING) {
            diff.started_at = moment().valueOf();
        }
        return BookingModel.findOneAndUpdate(
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
        return BookingModel.deleteOne({ _id });
    }

    public static getLessonTeachingOverTime(): Promise<Booking[]> {
        return BookingModel.find({
            status: {
                $in: [
                    EnumBookingStatus.TEACHING,
                    EnumBookingStatus.PENDING,
                    EnumBookingStatus.CONFIRMED,
                    EnumBookingStatus.TEACHER_CONFIRMED
                ]
            },
            'calendar.end_time': { $lt: moment().valueOf() }
        })
            .populate('student', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('teacher', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('unit')
            .populate('ordered_package')
            .exec();
    }

    public static async findHomeworksByStudent(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 }
    ): Promise<Booking[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const conditions: FilterQuery = {};
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0)
                conditions.status = { $in: filter.status };
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }

        if (filter.homework_type === EnumHomeworkType.v1) {
            conditions['$and'] = [
                {
                    $or: [
                        {
                            $and: [
                                { 'unit.homework.id': { $exists: true } },
                                { 'unit.homework2': null },
                                {
                                    $or: [
                                        { 'homework.sessions': { $size: 0 } },
                                        { homework: null }
                                    ]
                                }
                            ]
                        },
                        {
                            $and: [
                                { 'unit.homework.id': { $exists: true } },
                                { 'homework.sessions': { $gt: { $size: 0 } } }
                            ]
                        }
                    ]
                }
            ];
        }

        if (filter.homework_type === EnumHomeworkType.v2) {
            conditions['$and'] = [
                { 'unit.homework2.id': { $exists: true } },
                {
                    $or: [
                        { 'homework.sessions': { $size: 0 } },
                        { homework: null }
                    ]
                }
            ];
        }

        return BookingModel.aggregate([
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
                    from: 'users',
                    let: {
                        id: '$teacher_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] }
                            }
                        },
                        {
                            $project: {
                                ...IGNORE_SENSITIVE_FIELDS
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            {
                $unwind: '$teacher'
            },
            {
                $lookup: {
                    from: 'homework-test-result',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$booking_id'] }
                            }
                        },
                        {
                            $match: {
                                'test_result.submission_time': { $exists: true }
                            }
                        },
                        {
                            $project: {
                                test_result_code: 1,
                                test_result: 1,
                                test_result_id: 1,
                                test_topic_id: 1,
                                test_topic_name: 1,
                                test_type: 1
                            }
                        },
                        { $sort: { id: 1 } },
                        { $limit: 1 }
                    ],
                    as: 'homework_test_result'
                }
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);
    }

    public static async findExamsByStudent(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 }
    ): Promise<Booking[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const conditions: FilterQuery = {};
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0)
                conditions.status = { $in: filter.status };
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }

        return BookingModel.aggregate([
            { $match: conditions },
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
            {
                $match:
                    filter.exam_type === 'TEST'
                        ? {
                              'unit.exam_id': { $ne: null },
                              'unit.exam_type': 3
                          }
                        : filter.exam_type === 'EXAM'
                        ? {
                              'unit.exam_id': { $ne: null },
                              'unit.exam_type': { $ne: 3 }
                          }
                        : { 'unit.exam_id': { $ne: null } }
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
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);
    }

    public static async countExamsByStudent(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 }
    ): Promise<number> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const conditions: FilterQuery = {};
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0)
                conditions.status = { $in: filter.status };
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }

        const matchExams = await BookingModel.aggregate([
            { $match: conditions },
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
            {
                $match:
                    filter.exam_type === 'TEST'
                        ? {
                              'unit.exam_id': { $ne: null },
                              'unit.exam_type': 3
                          }
                        : filter.exam_type === 'EXAM'
                        ? {
                              'unit.exam_id': { $ne: null },
                              'unit.exam_type': { $ne: 3 }
                          }
                        : { 'unit.exam_id': { $ne: null } }
            },
            { $count: 'count' }
        ]);

        if (!matchExams) return 0;
        if (matchExams.length <= 0) return 0;
        let count = 0;
        if (matchExams[0].hasOwnProperty('count')) {
            count = matchExams[0].count;
        }
        return count;
    }

    public static async findAllHomeworks(
        filter: FilterQuery
    ): Promise<Booking[]> {
        const conditions: FilterQuery = {};
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0)
                conditions.status = { $in: filter.status };
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }

        if (filter.not_done_over_time) {
            filter['calendar.start_time'] = filter.not_done_over_time;
        }

        if (filter.alerted && _.isArray(filter.alerted)) {
            conditions.$or = conditions.$or
                ? conditions.$or?.concat(filter.alerted)
                : filter.alerted;
        }

        return BookingModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'units',
                    localField: 'unit_id',
                    foreignField: 'id',
                    as: 'unit'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$unit' }, 1] }
                }
            },
            {
                $unwind: '$unit'
            },
            {
                $match: {
                    'unit.homework': { $exists: true, $not: { $size: 0 } }
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
                $match: {
                    $expr: { $eq: [{ $size: '$course' }, 1] }
                }
            },
            {
                $unwind: '$course'
            },
            {
                $lookup: {
                    from: 'users',
                    let: {
                        id: '$teacher_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] }
                            }
                        },
                        {
                            $project: {
                                ...IGNORE_SENSITIVE_FIELDS
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$teacher' }, 1] }
                }
            },
            {
                $unwind: '$teacher'
            }
        ]);
    }

    public static async countHomeworksByStudent(
        filter: FilterQuery
    ): Promise<number> {
        const conditions: FilterQuery = {};
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0)
                conditions.status = { $in: filter.status };
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }

        if (filter.homework_type === EnumHomeworkType.v1) {
            conditions['$and'] = [
                {
                    $or: [
                        {
                            $and: [
                                { 'unit.homework.id': { $exists: true } },
                                { 'unit.homework2': null },
                                {
                                    $or: [
                                        { 'homework.sessions': { $size: 0 } },
                                        { homework: null }
                                    ]
                                }
                            ]
                        },
                        {
                            $and: [
                                { 'unit.homework.id': { $exists: true } },
                                { 'homework.sessions': { $gt: { $size: 0 } } }
                            ]
                        }
                    ]
                }
            ];
        }

        if (filter.homework_type === EnumHomeworkType.v2) {
            conditions['$and'] = [
                { 'unit.homework2.id': { $exists: true } },
                {
                    $or: [
                        { 'homework.sessions': { $size: 0 } },
                        { homework: null }
                    ]
                }
            ];
        }
        const matchedHomework = await BookingModel.aggregate([
            {
                $lookup: {
                    from: 'units',
                    localField: 'unit_id',
                    foreignField: 'id',
                    as: 'unit'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$unit' }, 1] }
                }
            },
            {
                $unwind: '$unit'
            },
            { $match: conditions },
            { $count: 'count' }
        ]);
        if (!matchedHomework) return 0;
        if (matchedHomework.length <= 0) return 0;
        let count = 0;
        if (matchedHomework[0].hasOwnProperty('count')) {
            count = matchedHomework[0].count;
        }
        return count;
    }

    public static async findHomeworks(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 }
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const conditions: FilterQuery = {};
        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0)
                conditions.status = { $in: filter.status };
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.min_start_time) {
            conditions['calendar.start_time'] = { $gte: filter.min_start_time };
        }
        if (filter.max_end_time) {
            conditions['calendar.end_time'] = { $lte: filter.max_end_time };
        }
        if (filter.course_id) {
            conditions.course_id = filter.course_id;
        }

        const searchRegexUnitNameStr = filter.unit_name
            ? escapeRegExp(filter.unit_name)
            : '';
        return BookingModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'units',
                    localField: 'unit_id',
                    foreignField: 'id',
                    as: 'unit'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$unit' }, 1] }
                }
            },
            {
                $unwind: '$unit'
            },
            {
                $match: {
                    'unit.name': {
                        $regex: searchRegexUnitNameStr,
                        $options: 'i'
                    }
                }
            },
            {
                $match: {
                    'unit.homework': { $exists: true, $not: { $size: 0 } }
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: 'unit.homework',
                    foreignField: '_id',
                    as: 'quiz'
                }
            },
            { $unwind: '$quiz' },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $lookup: {
                    from: 'users',
                    let: { t_id: '$teacher_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$$t_id', '$id'] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                full_name: 1,
                                avatar: 1,
                                email: 1,
                                gender: 1,
                                phone_number: 1,
                                skype_account: 1,
                                username: 1
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'users',
                    let: { t_id: '$student_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$$t_id', '$id'] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                full_name: 1,
                                avatar: 1,
                                email: 1,
                                gender: 1,
                                phone_number: 1,
                                skype_account: 1,
                                username: 1
                            }
                        }
                    ],
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            { $sort: sort },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ]);
    }

    public static async getCoursesByStudent(
        student_id: any
    ): Promise<mongoose.Types.ObjectId[]> {
        return BookingModel.distinct('course', { student_id: student_id });
    }

    public static async getCoursesByTeacher(
        teacher_id: any
    ): Promise<mongoose.Types.ObjectId[]> {
        return BookingModel.distinct('course', { teacher_id: teacher_id });
    }

    public static async getStudentsByTeacher(
        teacher_id: any
    ): Promise<mongoose.Types.ObjectId[]> {
        return BookingModel.distinct('student_id', { teacher_id: teacher_id });
    }

    public static async findStudentsNeedingMonthlyMemo(
        filter: FilterQuery
    ): Promise<Array<any>> {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const sort = { _id: 1 };
        return BookingModel.aggregate([
            { $match: conditions },
            {
                $project: {
                    student_id: 1,
                    student: 1
                }
            },
            {
                $group: {
                    _id: '$student_id',
                    student: { $first: '$student' },
                    lesson_count: { $sum: 1 }
                }
            },
            {
                $match: {
                    lesson_count: {
                        $gte: MIN_COMPLETED_BOOKING_FOR_MONTHLY_MEMO
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    student: {
                        ...IGNORE_SENSITIVE_FIELDS
                    }
                }
            },
            {
                $facet: {
                    data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async findTeacherToCommentOnMemo(
        filter: FilterQuery,
        booking_limit: number
    ) {
        const conditions = BookingActions.buildFilterQuery(filter);
        const min_lesson_taught =
            (MIN_PERCENTAGE_TO_PICK_TEACHERS_FOR_COMMENT / 100) * booking_limit;
        return BookingModel.aggregate([
            { $match: conditions },
            { $sort: { 'calendar.start_time': -1 } },
            { $limit: booking_limit },
            {
                $project: {
                    teacher_id: 1,
                    teacher: 1,
                    calendar: 1
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    calendar: { $first: '$calendar' },
                    teacher: { $first: '$teacher' },
                    lesson_taught: { $sum: 1 }
                }
            },
            {
                $match: {
                    lesson_taught: { $gte: min_lesson_taught }
                }
            },
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
                    calendar: 0
                }
            },
            { $sort: { lesson_taught: -1, 'calendar.start_time': -1 } },
            { $limit: 1 }
        ]).exec();
    }

    public static async getLearntUnitIds(
        filter: FilterQuery
    ): Promise<Array<number>> {
        const conditions = BookingActions.buildFilterQuery(filter);
        return BookingModel.distinct('unit_id', conditions).exec();
    }

    public static async getTrialAndPaidStudentsByTeacher(filter: FilterQuery) {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return BookingModel.aggregate([
            { $match: conditions },
            { $sort: { teacher_id: 1 } },
            {
                $lookup: {
                    from: 'trial-booking',
                    localField: '_id',
                    foreignField: 'booking',
                    as: 'trial_booking'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$trial_booking' }, 1] }
                }
            },
            {
                $group: {
                    _id: {
                        teacher_id: '$teacher_id',
                        student_id: '$student_id'
                    },
                    teacher: { $first: '$teacher' },
                    lesson_count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        student_id: '$_id.student_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$student_id']
                                        }
                                    },
                                    {
                                        $or: [
                                            {
                                                $expr: {
                                                    $eq: [
                                                        '$type',
                                                        EnumPackageOrderType.STANDARD
                                                    ]
                                                }
                                            },
                                            {
                                                $expr: {
                                                    $eq: [
                                                        '$type',
                                                        EnumPackageOrderType.PREMIUM
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ],
                    as: 'paid_packages'
                }
            },
            {
                $project: {
                    _id: 0,
                    teacher_id: '$_id.teacher_id',
                    teacher: 1,
                    is_paid_student: {
                        $cond: {
                            if: { $eq: [{ $size: '$paid_packages' }, 0] },
                            then: 0,
                            else: 1
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    teacher: { $first: '$teacher' },
                    trial_student_number: { $sum: 1 },
                    paid_student_number: { $sum: '$is_paid_student' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'teacher',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$teacher' }, 1] }
                }
            },
            {
                $unwind: '$teacher'
            },
            {
                $project: {
                    _id: 0,
                    teacher_id: '$_id',
                    is_active: '$teacher.is_active',
                    email: '$teacher.email',
                    username: '$teacher.username',
                    full_name: '$teacher.full_name',
                    avatar: '$teacher.avatar',
                    trial_student_number: 1,
                    paid_student_number: 1
                }
            },
            {
                $facet: {
                    data: [
                        { $sort: { teacher_id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]);
    }

    public static async getTrialBookingsOfTeacher(filter: FilterQuery) {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return BookingModel.aggregate([
            { $match: conditions },
            { $sort: { teacher_id: 1 } },
            {
                $lookup: {
                    from: 'trial-booking',
                    localField: '_id',
                    foreignField: 'booking',
                    as: 'trial_booking'
                }
            },
            {
                $unwind: '$trial_booking'
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        student_id: '$student_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$student_id']
                                        }
                                    },
                                    {
                                        $or: [
                                            {
                                                $expr: {
                                                    $eq: [
                                                        '$type',
                                                        EnumPackageOrderType.STANDARD
                                                    ]
                                                }
                                            },
                                            {
                                                $expr: {
                                                    $eq: [
                                                        '$type',
                                                        EnumPackageOrderType.PREMIUM
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ],
                    as: 'ordered_packages'
                }
            },
            {
                $lookup: {
                    from: 'curriculums',
                    localField: 'curriculum',
                    foreignField: '_id',
                    as: 'curriculum'
                }
            },
            {
                $unwind: '$curriculum'
            },
            {
                $project: {
                    _id: 0,
                    student_id: 1,
                    calendar: 1,
                    student: {
                        is_active: 1,
                        email: 1,
                        username: 1,
                        full_name: 1,
                        avatar: 1
                    },
                    curriculum_id: '$trial_booking.curriculum_id',
                    ordered_packages: 1,
                    curriculum: 1
                }
            },
            {
                $facet: {
                    data: [
                        { $sort: { student_id: 1, 'calendar.start_time': 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]);
    }

    public static async getTeacherAbsenceCount(
        start_time: number,
        end_time: number,
        teacher_id?: any
    ) {
        const aggregate = [
            {
                $match: {
                    status: EnumBookingStatus.TEACHER_ABSENT,
                    'calendar.start_time': { $gte: start_time },
                    'calendar.end_time': { $lte: end_time }
                }
            },
            {
                $project: {
                    teacher_id: 1,
                    teacher: 1,
                    is_unauthorized_absence_lesson: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: ['$reported_absence_at', null] },
                                    {
                                        $gte: [
                                            '$reported_absence_at',
                                            '$calendar.start_time'
                                        ]
                                    }
                                ]
                            },
                            then: 1,
                            else: 0
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$teacher_id',
                    teacher: { $first: '$teacher' },
                    total_unauthorized_leave: {
                        $sum: '$is_unauthorized_absence_lesson'
                    },
                    total_absence: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'teachers',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'admins',
                    localField: 'teacher.staff_id',
                    foreignField: 'id',
                    as: 'staff'
                }
            },
            {
                $unwind: {
                    path: '$staff',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    teacher_id: '$_id',
                    teacher_name: '$teacher.user.full_name',
                    teacher_avatar: '$teacher.avatar',
                    staff_id: '$teacher.staff_id',
                    staff_name: '$staff.fullname',
                    total_unauthorized_leave: 1,
                    total_authorized_leave: {
                        $subtract: [
                            '$total_absence',
                            '$total_unauthorized_leave'
                        ]
                    }
                }
            }
        ] as any;
        if (teacher_id) {
            const matchTeacher = {
                $match: {
                    teacher_id: Number(teacher_id)
                }
            };
            aggregate.unshift(matchTeacher);
        }
        return BookingModel.aggregate(aggregate);
    }

    public static async getTeacherAbsenceData(
        teacher_id: number,
        start_time: number,
        end_time: number
    ) {
        return BookingModel.aggregate([
            {
                $match: {
                    status: EnumBookingStatus.TEACHER_ABSENT,
                    teacher_id: teacher_id,
                    'calendar.start_time': { $gte: start_time },
                    'calendar.end_time': { $lte: end_time }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    student_id: 1,
                    student: {
                        full_name: 1,
                        email: 1,
                        avatar: 1,
                        is_active: 1,
                        username: 1
                    },
                    calendar: 1,
                    is_unauthorized_absence_lesson: {
                        $or: [
                            { $eq: ['$reported_absence_at', null] },
                            {
                                $gte: [
                                    '$reported_absence_at',
                                    '$calendar.start_time'
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $sort: {
                    is_unauthorized_absence_lesson: 1,
                    student_id: 1,
                    'calendar.start_time': 1
                }
            }
        ]);
    }

    public static async getFinishStudentsOrPackages(
        filter: FilterQuery,
        is_student: boolean
    ) {
        filter.status = [
            EnumBookingStatus.COMPLETED,
            EnumBookingStatus.PENDING,
            EnumBookingStatus.CONFIRMED,
            EnumBookingStatus.TEACHING,
            EnumBookingStatus.STUDENT_ABSENT
        ];
        const return_field = is_student ? '$student_id' : '$ordered_package_id';
        const conditions = BookingActions.buildFilterQuery(filter);
        const query_result = await BookingModel.aggregate([
            { $match: conditions },
            {
                $group: {
                    _id: '$ordered_package_id',
                    student_id: { $first: '$student_id' },
                    ordered_package_id: { $first: '$ordered_package_id' }
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        student_id: '$student_id',
                        ordered_package_id: '$_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$id', '$$ordered_package_id']
                                        }
                                    },
                                    {
                                        $expr: { $eq: ['$number_class', 0] }
                                    },
                                    {
                                        $or: [
                                            {
                                                $expr: {
                                                    $eq: [
                                                        '$type',
                                                        EnumPackageOrderType.STANDARD
                                                    ]
                                                }
                                            },
                                            {
                                                $expr: {
                                                    $eq: [
                                                        '$type',
                                                        EnumPackageOrderType.PREMIUM
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ],
                    as: 'ordered_package'
                }
            },
            { $unwind: '$ordered_package' },
            {
                $group: {
                    _id: return_field
                }
            }
        ]).exec();
        const result_list = query_result.map((x: any) => x._id);
        return Promise.resolve(result_list);
    }

    public static findAllByArrayId(
        filter: FilterQuery,
        sort: any = { 'calendar.start_time': -1 },
        select_fields: any = {}
    ): Promise<Booking[]> {
        const conditions = filter;
        return BookingModel.find(conditions, {
            ...select_fields
        })
            .populate('student', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('teacher', {
                ...IGNORE_SENSITIVE_FIELDS
            })
            .populate('course')
            .populate('report')
            .populate('unit')
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static async findOneByCheckHomeWorkV1(
        filter: any,
        sort: any = {}
    ): Promise<Booking[]> {
        return await BookingModel.aggregate([
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
            { $match: filter },
            { $sort: sort },
            { $limit: 1 }
        ]);
    }

    public static async getAllBookingsByStatus(filter: FilterQuery) {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return BookingModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
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
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $lookup: {
                    from: 'users',
                    let: { t_id: '$teacher_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$$t_id', '$id'] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                full_name: 1,
                                avatar: 1,
                                email: 1,
                                gender: 1,
                                phone_number: 1,
                                skype_account: 1,
                                username: 1
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered_package'
                }
            },
            {
                $unwind: '$ordered_package'
            },
            { $match: conditions }
        ]).exec();
    }

    public static async getAllBookingsCheckDoHomework(filter: FilterQuery) {
        filter['$and'] = [
            {
                $or: [
                    {
                        $and: [
                            { 'unit.homework.id': { $exists: true } },
                            {
                                $or: [
                                    { 'homework.sessions': { $size: 0 } },
                                    { homework: null }
                                ]
                            }
                        ]
                    },
                    {
                        $and: [
                            { 'unit.homework2.id': { $exists: true } },
                            {
                                'homework_test_result.test_result.submission_time':
                                    { $exists: false }
                            }
                        ]
                    }
                ]
            }
        ];
        return BookingModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
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
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            { $unwind: '$course' },
            {
                $lookup: {
                    from: 'users',
                    let: { t_id: '$teacher_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$$t_id', '$id'] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                full_name: 1,
                                avatar: 1,
                                email: 1,
                                gender: 1,
                                phone_number: 1,
                                skype_account: 1,
                                username: 1
                            }
                        }
                    ],
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered_package'
                }
            },
            {
                $unwind: '$ordered_package'
            },
            {
                $lookup: {
                    from: 'homework-test-result',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$booking_id'] }
                            }
                        },
                        {
                            $match: {
                                'test_result.submission_time': { $exists: true }
                            }
                        },
                        {
                            $project: {
                                test_result_code: 1,
                                test_result: 1,
                                test_result_id: 1,
                                test_topic_id: 1,
                                test_topic_name: 1,
                                test_type: 1
                            }
                        },
                        { $sort: { id: 1 } },
                        { $limit: 1 }
                    ],
                    as: 'homework_test_result'
                }
            },
            {
                $unwind: {
                    path: '$homework_test_result',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: filter }
        ]).exec();
    }

    public static async getTrialBookingsOfSale(filter: FilterQuery) {
        const conditions = BookingActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return BookingModel.aggregate([
            {
                $match: {
                    ...conditions
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $match: {
                    'student.crm.sale_user_id': filter.sale_id,
                    is_regular_booking: false
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        ordered_package_id: '$ordered_package_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$id', '$$ordered_package_id']
                                        }
                                    },
                                    {
                                        $expr: {
                                            $eq: [
                                                '$type',
                                                EnumPackageOrderType.TRIAL
                                            ]
                                        }
                                    }
                                ]
                            }
                        },
                        { $limit: 1 },
                        {
                            $lookup: {
                                from: 'orders',
                                localField: 'order',
                                foreignField: '_id',
                                as: 'order'
                            }
                        },
                        {
                            $unwind: '$order'
                        }
                    ],
                    as: 'ordered_package'
                }
            },
            {
                $unwind: {
                    path: '$ordered_package',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: {
                        student_id: '$student_id'
                    },
                    data: { $first: '$$ROOT' }
                }
            },
            {
                $project: {
                    _id: 0,
                    student_id: '$data.student_id',
                    id: '$data.id',
                    status: '$data.status',
                    calendar: '$data.calendar',
                    student: {
                        username: '$data.student.username',
                        full_name: '$data.student.full_name'
                    },
                    ordered_package: '$data.ordered_package'
                }
            },
            {
                $facet: {
                    data: [
                        {
                            $sort: {
                                'calendar.start_time': -1
                            }
                        },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]);
    }
}
