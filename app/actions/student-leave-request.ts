import { EnumBookingStatus } from '../models/booking';
import mongoose from 'mongoose';
import StudentLeaveRequest, {
    StudentLeaveRequestModel
} from '../models/student-leave-request';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    student_id?: number;
    status?: number[] | any;
    start_time?: number | any;
    end_time?: number | any;
    page_size?: number;
    page_number?: number;
    search?: string;
    $or?: any;
    last_booking_id?: number;
};

export default class StudentLeaveRequestActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (
            filter.status &&
            Array.isArray(filter.status) &&
            filter.status.length > 0
        ) {
            conditions.status = {
                $in: filter.status
            };
        }
        if (filter.start_time) {
            conditions.start_time = filter.start_time;
        }
        if (filter.end_time) {
            conditions.end_time = filter.end_time;
        }
        if (filter.$or) {
            conditions.$or = filter.$or;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { status: 1, start_time: 1 }
    ): Promise<StudentLeaveRequest[]> {
        const conditions = StudentLeaveRequestActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return StudentLeaveRequestModel.find(conditions, {
            ...select_fields
        })
            .populate('teacher')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findEachPage(filter: FilterQuery) {
        const conditions: FilterQuery = {};
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        return StudentLeaveRequestModel.aggregate([
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
                    from: 'admins',
                    let: {
                        creator_id: '$creator_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$creator_id', '$id']
                                }
                            }
                        },
                        {
                            $project: {
                                username: 1,
                                id: 1,
                                fullname: 1,
                                phoneNumber: 1
                            }
                        }
                    ],
                    as: 'staff'
                }
            },
            {
                $unwind: {
                    path: '$staff',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $sort: { start_time: -1 } },

            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: 'count' }]
                }
            }
        ]);
    }

    public static findLeaveRequestAndBooking(filter: FilterQuery) {
        const conditions: any = {};
        const conditions2: any = {};
        if (filter.start_time && filter.end_time) {
            conditions['$and'] = [
                {
                    $or: [
                        {
                            $and: [
                                { end_time: { $gt: filter.start_time } },
                                { end_time: { $lte: filter.end_time } }
                            ]
                        },
                        {
                            $and: [
                                { start_time: { $gte: filter.start_time } },
                                { start_time: { $lt: filter.end_time } }
                            ]
                        },
                        {
                            $and: [
                                { start_time: { $lt: filter.start_time } },
                                { end_time: { $gt: filter.end_time } }
                            ]
                        }
                    ]
                }
            ];
        }
        const pageSize = filter.page_size || 100;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        if (filter.last_booking_id) {
            conditions2['booking.id'] = { $gt: filter.last_booking_id };
        }
        const fullFilter = [
            {
                $match: conditions
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: {
                        student_id: '$student_id',
                        leave_start_Time: '$start_time',
                        leave_end_time: '$end_time'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $in: [
                                                '$status',
                                                [
                                                    EnumBookingStatus.PENDING,
                                                    EnumBookingStatus.CONFIRMED
                                                ]
                                            ]
                                        },
                                        {
                                            $eq: ['$$student_id', '$student_id']
                                        },
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        {
                                                            $gte: [
                                                                '$$leave_start_Time',
                                                                '$calendar.start_time'
                                                            ]
                                                        },
                                                        {
                                                            $lt: [
                                                                '$$leave_start_Time',
                                                                '$calendar.end_time'
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        {
                                                            $lte: [
                                                                '$$leave_start_Time',
                                                                '$calendar.start_time'
                                                            ]
                                                        },
                                                        {
                                                            $gte: [
                                                                '$$leave_end_time',
                                                                '$calendar.end_time'
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        {
                                                            $gt: [
                                                                '$$leave_end_time',
                                                                '$calendar.start_time'
                                                            ]
                                                        },
                                                        {
                                                            $lte: [
                                                                '$$leave_end_time',
                                                                '$calendar.end_time'
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                id: 1,
                                status: 1,
                                calendar: 1
                            }
                        }
                    ],
                    as: 'booking'
                }
            },
            {
                $unwind: {
                    path: '$booking',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    booking: {
                        $exists: true
                    },
                    ...conditions2
                }
            },
            { $sort: { 'booking.id': 1 } },
            { $skip: skip },
            { $limit: limit }
        ];
        return StudentLeaveRequestModel.aggregate(fullFilter).exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { start_time: 1 }
    ): Promise<StudentLeaveRequest[]> {
        const conditions = StudentLeaveRequestActions.buildFilterQuery(filter);
        return StudentLeaveRequestModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = StudentLeaveRequestActions.buildFilterQuery(filter);
        return StudentLeaveRequestModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<StudentLeaveRequest | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return StudentLeaveRequestModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(
        request: StudentLeaveRequest
    ): Promise<StudentLeaveRequest> {
        const newModel = new StudentLeaveRequestModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('student_leave_request_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<any> {
        return StudentLeaveRequestModel.findOneAndUpdate(
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
        return StudentLeaveRequestModel.deleteOne({ _id });
    }
}
