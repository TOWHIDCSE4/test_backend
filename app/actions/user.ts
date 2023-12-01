import { RoleCode } from '../const/role';
import mongoose, { FilterQuery as FilterQueryMG } from 'mongoose';
import User, { UserModel } from '../models/user';
import { OrderModel } from '../models/order';
import CounterActions from './counter';
import { escapeRegExp } from 'lodash';
import { EnumPackageOrderType } from '../const/package';
import { DAY_TO_MS } from '../const';
import { EnumBookingStatus } from '../models/booking';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    status?: string;
    search?: string;
    zalo_id?: string;
    page_size?: number;
    page_number?: number;
    email?: string;
    username?: string | any;
    is_active?: boolean;
    is_verified_email?: boolean;
    role?: RoleCode[] | any;
    name?: string;
    regular_times?: number;
    $or?: Array<any>;
    $all?: any;
    full_name?: any;
    ispeak_user_id?: number;
    phone_number?: string;
    $expr?: any;
};

export default class UserActions {
    public static buildFilterQuery(filter: any): FilterQueryMG<User> {
        const conditions: any = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.hasOwnProperty('role') && filter.role) {
            conditions.role = { $all: filter.role };
        }
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.regular_times || filter.regular_times == 0) {
            conditions.regular_times = filter.regular_times;
        }
        if (filter.name) {
            const searchRegexStr = escapeRegExp(filter.name);
            conditions.$or = [
                {
                    full_name: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    email: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    username: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                }
            ];
        }
        if (filter.email) {
            conditions.email = filter.email;
        }
        if (filter.is_verified_email) {
            conditions.is_verified_email = filter.is_verified_email;
        }

        if (filter.search) {
            const searchRegexStr = escapeRegExp(filter.search);
            conditions.$or = [
                {
                    full_name: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    email: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    phone_number: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    username: {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                }
            ];
        }

        if (filter.hasOwnProperty('regular_time')) {
            conditions.regular_times = filter.regular_times;
        }
        if (filter.ispeak_user_id) {
            conditions.ispeak_user_id = filter.ispeak_user_id;
        }

        if (filter['student.staff_id']) {
            conditions['student.staff_id'] = filter['student.staff_id'];
        }
        if (filter.phone_number) {
            conditions.phone_number = filter.phone_number;
        }
        if (filter.$expr) {
            conditions.$expr = filter.$expr;
        }
        if (filter.username) {
            conditions.username = filter.username;
        }
        if (filter.zalo_id) {
            conditions.zalo_id = filter.zalo_id;
        }
        return conditions;
    }
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<User[]> {
        const conditions = UserActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return UserModel.find(conditions, {
            password: 0,
            ...select_fields
        })
            .populate('teacher')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static getUsersWithTrialBooking(id: any): Promise<any[]> {
        const users = UserModel.aggregate([
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'id',
                    foreignField: 'student_id',
                    as: 'bookings'
                }
            },
            {
                $unwind: {
                    path: '$bookings',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'trial-booking',
                    localField: 'bookings.id', // Match with booking_id in trial-booking
                    foreignField: 'booking_id',
                    as: 'trials'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$trials' }, 1] }
                }
            },
            {
                $unwind: {
                    path: '$trials',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    'bookings.status': 1,
                    id: id
                }
            }
        ]).exec();
        
        return users;
    }

    public static findAllAndPaginatedBySupported(
        filter: any,
        sort: any = { created_time: -1 }
    ): Promise<any[]> {
        const conditions = UserActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return UserModel.aggregate([
            {
                $lookup: {
                    from: 'students',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$id', '$user_id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'admins',
                                let: {
                                    staff_id: '$staff_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$staff_id', '$id']
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
                        }
                    ],
                    as: 'student'
                }
            },
            {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
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

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<User[]> {
        const conditions = UserActions.buildFilterQuery(filter);
        return UserModel.find(conditions, {
            password: 0,
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<User | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return UserModel.findOne(filter, {
            password: 0,
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = UserActions.buildFilterQuery(filter);
        return UserModel.countDocuments(conditions).exec();
    }

    public static create(user: User): Promise<User> {
        const newModel = new UserModel({
            ...user,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('user_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: User
    ): Promise<any> {
        return UserModel.findOneAndUpdate(
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
        return UserModel.deleteOne({ _id });
    }

    public static verifyEmailForMultipleStudents(email: string) {
        return UserModel.updateMany(
            {
                email,
                is_verified_email: false,
                role: [RoleCode.STUDENT]
            },
            {
                $set: {
                    is_verified_email: true,
                    is_enable_receive_mail: true,
                    updated_time: new Date()
                }
            },
            {
                upsert: false
            }
        ).exec();
    }

    public static async checkUserValuable(id: number): Promise<boolean> {
        const totalPaidOrder = await OrderModel.find({
            user_id: id,
            status: 1,
            price: { $gt: 0 }
        });
        return totalPaidOrder.length > 0;
    }

    public static async updatePassword(id: number, new_pass: string) {
        const user = await UserModel.findOne({ id });
        if (user) {
            user.password = new_pass;
            await user?.save();
        }
    }

    public static findAllByRecoverLinkSkype(
        filter: any,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<User[]> {
        return UserModel.find(filter, {
            password: 0,
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static async getTrialAndPaidStudentsBySale(filter: any) {
        return UserModel.aggregate([
            {
                $match: {
                    role: RoleCode.STUDENT,
                    is_active: true,
                    'crm.sale_user_id': { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$student_id', '$$id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'ordered-packages',
                                localField: 'ordered_package',
                                foreignField: '_id',
                                as: 'trial-ordered-package'
                            }
                        },
                        {
                            $match: {
                                'calendar.start_time': {
                                    $gte: filter.min_start_time
                                },
                                'calendar.end_time': {
                                    $lte: filter.max_end_time
                                },
                                status: filter.status,
                                is_regular_booking: false,
                                'trial-ordered-package.type':
                                    EnumPackageOrderType.TRIAL
                            }
                        },
                        {
                            $unwind: '$trial-ordered-package'
                        },
                        { $sort: { created_time: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'booking'
                }
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$student_id', '$$id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'ordered-packages',
                                localField: 'ordered_package',
                                foreignField: '_id',
                                as: 'trial-ordered-package-all'
                            }
                        },
                        {
                            $match: {
                                status: filter.status,
                                is_regular_booking: false,
                                'trial-ordered-package-all.type':
                                    EnumPackageOrderType.TRIAL
                            }
                        },
                        {
                            $unwind: '$trial-ordered-package-all'
                        },
                        { $sort: { created_time: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'trial_booking'
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        student_id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$student_id']
                                        }
                                    }
                                ]
                            }
                        },
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
                        },
                        {
                            $match: {
                                activation_date: {
                                    $gte: filter.min_start_time,
                                    $lte: filter.max_end_time
                                },
                                type: {
                                    $in: [
                                        EnumPackageOrderType.STANDARD,
                                        EnumPackageOrderType.PREMIUM
                                    ]
                                },
                                original_number_class: {
                                    $gte: 25
                                },
                                'order.status': 1
                            }
                        },
                        { $sort: { created_time: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'paid_packages'
                }
            },
            {
                $project: {
                    _id: 0,
                    sale_id: '$crm.sale_user_id',
                    crm: '$crm',
                    is_trial_student: {
                        $cond: {
                            if: { $eq: [{ $size: '$booking' }, 0] },
                            then: 0,
                            else: 1
                        }
                    },
                    is_paid_student: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: [{ $size: '$trial_booking' }, 1] },
                                    { $eq: [{ $size: '$paid_packages' }, 1] }
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
                    _id: '$crm.sale_user_id',
                    sale: { $first: '$crm' },
                    trial_student_number: { $sum: '$is_trial_student' },
                    paid_student_number: { $sum: '$is_paid_student' }
                }
            },
            {
                $match: {
                    $or: [
                        { trial_student_number: { $gt: 0 } },
                        { paid_student_number: { $gt: 0 } }
                    ]
                }
            },
            { $sort: { 'sale.sale_user_id': 1 } },
            {
                $project: {
                    _id: 0,
                    sale_id: '$sale.sale_user_id',
                    sale_name: '$sale.sale_name',
                    trial_student_number: 1,
                    paid_student_number: 1
                }
            }
        ]).exec();
    }

    public static async getListTrialStudentBuyMainPackage(filter: any) {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return UserModel.aggregate([
            {
                $match: {
                    role: RoleCode.STUDENT,
                    is_active: true,
                    'crm.sale_user_id': { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        student_id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$student_id']
                                        }
                                    }
                                ]
                            }
                        },
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
                        },
                        {
                            $match: {
                                activation_date: {
                                    $gte: filter.min_start_time,
                                    $lte: filter.max_end_time
                                },
                                type: {
                                    $in: [
                                        EnumPackageOrderType.STANDARD,
                                        EnumPackageOrderType.PREMIUM
                                    ]
                                },
                                original_number_class: {
                                    $gte: 25
                                },
                                'order.status': 1
                            }
                        },
                        { $sort: { created_time: -1 } },
                        { $limit: 1 }
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
                $lookup: {
                    from: 'bookings',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$student_id', '$$id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'ordered-packages',
                                localField: 'ordered_package',
                                foreignField: '_id',
                                as: 'trial-ordered-package'
                            }
                        },
                        {
                            $match: {
                                status: filter.status,
                                is_regular_booking: false,
                                'trial-ordered-package.type':
                                    EnumPackageOrderType.TRIAL
                            }
                        },
                        {
                            $unwind: '$trial-ordered-package'
                        },
                        { $limit: 1 }
                    ],
                    as: 'booking'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$booking' }, 1] },
                    'crm.sale_user_id': filter.sale_id
                }
            },
            {
                $project: {
                    _id: 0,
                    student_id: '$id',
                    student: {
                        username: '$username',
                        full_name: '$full_name'
                    },
                    ordered_package: '$ordered_package'
                }
            },
            {
                $facet: {
                    data: [
                        {
                            $sort: {
                                'ordered_package.created_time': -1
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

    public static async getAllStudentLinkedWithZalo() {
        return UserModel.aggregate([
            {
                $match: {
                    role: RoleCode.STUDENT,
                    is_active: true,
                    zalo_id: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        student_id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$student_id']
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $project: {
                                id: 1,
                                type: 1,
                                user_id: 1,
                                order_id: 1,
                                number_class: 1,
                                day_of_use: 1,
                                original_number_class: 1,
                                paid_number_class: 1,
                                activation_date: 1,
                                expired_date: {
                                    $sum: [
                                        '$activation_date',
                                        {
                                            $multiply: [
                                                '$day_of_use',
                                                DAY_TO_MS
                                            ]
                                        }
                                    ]
                                },
                                created_time: 1
                            }
                        },
                        {
                            $match: {
                                $or: [
                                    {
                                        number_class: {
                                            $gt: 0
                                        }
                                    },
                                    {
                                        expired_date: {
                                            $gt: new Date().getTime()
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $limit: 1
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
                    _id: '$zalo_id',
                    student: { $first: '$$ROOT' }
                }
            },
            {
                $project: {
                    _id: 1,
                    id: '$student.id',
                    zalo_id: '$student.zalo_id',
                    full_name: '$student.full_name',
                    username: '$student.username'
                }
            }
        ]).exec();
    }

    public static async getAllStudentWidthBookingLastMonth(
        filter: any
    ): Promise<any[]> {
        const pageSize = filter?.page_size || 10;
        const pageNumber = filter?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const aggregateQuery: any = [
            {
                $match: {
                    role: RoleCode.STUDENT,
                    is_active: true
                }
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$id', '$student_id']
                                }
                            }
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
                            $match: {
                                status: {
                                    $in: [
                                        EnumBookingStatus.COMPLETED,
                                        EnumBookingStatus.STUDENT_ABSENT
                                    ]
                                },
                                'calendar.start_time': {
                                    $gt: filter?.start_time,
                                    $lt: filter?.end_time
                                },
                                'ordered_package.type': {
                                    $in: [
                                        EnumPackageOrderType.PREMIUM,
                                        EnumPackageOrderType.STANDARD
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                id: 1,
                                status: 1,
                                calendar: 1,
                                student_id: 1,
                                memo: 1,
                                'ordered_package.type': 1,
                                created_time: 1
                            }
                        }
                    ],
                    as: 'booking'
                }
            },
            {
                $match: {
                    'booking.0': { $exists: true }
                }
            },
            { $sort: { id: 1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ];
        return UserModel.aggregate(aggregateQuery);
    }
}
