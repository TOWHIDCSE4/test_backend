import mongoose from 'mongoose';
import TrialBooking, { TrialBookingModel } from '../models/trial-booking';
import UserActions from './user';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    booking_id?: number;
    status?: number[] | any;
    page_size?: number;
    page_number?: number;
    memo_status?: number;
    best_memo?: any;
    $or?: any;
};

export default class TrialBookingActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: any = {};
        if (filter.booking_id) {
            conditions.booking_id = filter.booking_id;
        }
        if (filter.status && Array.isArray(filter.status)) {
            conditions.status = { $in: filter.status };
        }
        if (filter['$or'] && filter['$or'].length) {
            conditions['$or'] = filter['$or'];
        }
        if (typeof filter.best_memo !== 'undefined') {
            conditions['booking.best_memo'] = Number(filter.best_memo) === 1;
        }
        if (filter.memo_status) {
            if (filter.memo_status === 1) {
                conditions['memo.note.1'] = { $exists: true };
            }
            if (filter.memo_status === 2) {
                conditions['memo.note.1'] = { $exists: false };
            }
        }
        return conditions;
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { booking_id: -1 }
    ): Promise<TrialBooking[]> {
        const conditions = TrialBookingActions.buildFilterQuery(filter);
        return TrialBookingModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'booking',
                '-memo -__v -admin_unit_lock -is_regular_booking'
            )
            .sort(sort)
            .exec();
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { booking_id: -1 }
    ): any {
        const conditions = TrialBookingActions.buildFilterQuery(filter);
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
                    from: 'bookings',
                    let: {
                        booking_id: '$booking_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$booking_id', '$id']
                                }
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
                            $project: {
                                'unit.name': 1,
                                'course.name': 1,
                                memo: 1,
                                id: 1,
                                best_memo: 1,
                                teacher: {
                                    full_name: 1,
                                    username: 1
                                },
                                student: {
                                    full_name: 1,
                                    username: 1
                                }
                            }
                        }
                    ],
                    as: 'booking'
                }
            },
            {
                $unwind: {
                    path: '$booking',
                    preserveNullAndEmptyArrays: false
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ];
        return TrialBookingModel.aggregate(aggregate);
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = TrialBookingActions.buildFilterQuery(filter);
        return TrialBookingModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort = { created_time: -1 }
    ): Promise<TrialBooking | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        if (filter.status && Array.isArray(filter.status)) {
            filter.status = { $in: filter.status };
        }
        return TrialBookingModel.findOne(filter, {
            ...select_fields
        })
            .populate({
                path: 'booking',
                select: '-memo -__v -admin_unit_lock',
                populate: [
                    {
                        path: 'student',
                        select: '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
                    },
                    {
                        path: 'teacher',
                        select: '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
                    },
                    {
                        path: 'course'
                    },
                    {
                        path: 'unit'
                    },
                    {
                        path: 'ordered_package'
                    }
                ]
            })
            .sort(sort)
            .exec();
    }

    public static create(request: TrialBooking): Promise<TrialBooking> {
        const newModel = new TrialBookingModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: TrialBooking
    ): Promise<any> {
        return TrialBookingModel.findOneAndUpdate(
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
        return TrialBookingModel.deleteOne({ _id });
    }

    public static getTrialStudents(
        filter: any,
        sort: any = { 'booking.calendar.start_time': -1, recent_lesson_at: -1 }
    ) {
        const user_filter = UserActions.buildFilterQuery(filter);
        const conditions = Object.fromEntries(
            /** We need to add a prefix 'student.' to all the fields */
            Object.entries(user_filter).map(([key, value]) => {
                if (key == '$or') {
                    if (Array.isArray(value)) {
                        const new_value = value.map((element: any) => {
                            return Object.fromEntries(
                                Object.entries(element).map(([key, value]) => {
                                    return [`student.${key}`, value];
                                })
                            );
                        });
                        return [key, new_value];
                    }
                    return [key, value];
                } else {
                    return [`student.${key}`, value];
                }
            })
        );
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        sort.student_id = 1;
        return TrialBookingModel.aggregate([
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'booking',
                    foreignField: '_id',
                    as: 'booking'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$booking' }, 1] }
                }
            },
            {
                $unwind: '$booking'
            },
            {
                $sort: sort
            },
            {
                $group: {
                    _id: '$booking.student_id',
                    booking: { $first: '$booking' },
                    recent_teacher_assessment: {
                        $first: '$teacher_assessment'
                    },
                    recent_admin_assessment: { $first: '$admin_assessment' },
                    student_starting_level: {
                        $first: '$student_starting_level'
                    },
                    lesson_count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    student: {
                        full_name: 1,
                        email: 1,
                        username: 1,
                        gender: 1,
                        date_of_birth: 1,
                        phone_number: 1,
                        skype_account: 1,
                        created_time: 1
                    },
                    booking: {
                        id: 1,
                        status: 1,
                        calendar: 1,
                        teacher: 1,
                        admin_note: 1,
                        teacher_note: 1,
                        course: 1,
                        unit: 1
                    },
                    recent_teacher_assessment: 1,
                    recent_admin_assessment: 1,
                    student_starting_level: 1,
                    lesson_count: 1
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'booking.course',
                    foreignField: '_id',
                    as: 'booking.course'
                }
            },
            { $unwind: '$booking.course' },
            {
                $lookup: {
                    from: 'units',
                    localField: 'booking.unit',
                    foreignField: '_id',
                    as: 'booking.unit'
                }
            },
            { $unwind: '$booking.unit' },
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
}
