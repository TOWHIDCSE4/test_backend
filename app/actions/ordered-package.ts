import mongoose from 'mongoose';
import { EnumOrderStatus } from '../models/order';
import OrderedPackage, { OrderedPackageModel } from '../models/ordered-package';

import { DAY_TO_MS } from '../const/date-time';
import { EnumPackageOrderType } from '../const/package';
import _, { escapeRegExp, isBuffer } from 'lodash';
import UserActions from './user';
import CounterActions from './counter';
import { forceParseInt } from '../utils/parser-util';
import { EnumBookingStatus } from '../models/booking';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    id?: number;
    order_id?: number;
    admin_note?: string;
    user_id?: number | any;
    package_id?: number | any;
    search?: string;
    $or?: Array<any>;
    $and?: Array<any>;
    type?: number[] | any;
    number_class?: number | any;
    gte_number_class?: number | any;
    original_number_class?: number | any;
    activation_date?: number | any;
    is_expired?: boolean;
    expired_date_after?: number | any;
    will_expire?: any;
    alerted?: any;
    created_time?: any;
    $expr?: any;
    ispeak_order_id?: number;
    location_id?: number | any;
    location_ids?: number[];
    'package.learning_frequency_type'?: any;
};

export default class OrderedPackageActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: any = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.order_id) {
            conditions.order_id = filter.order_id;
        }
        if (filter.user_id) {
            conditions.user_id = filter.user_id;
        }
        if (filter.package_id) {
            conditions.package_id = filter.package_id;
        }
        if (filter.admin_note) {
            conditions.admin_note = filter.admin_note;
        }
        if (filter.search) {
            const searchRegexStr = escapeRegExp(filter.search);
            const name_search = {
                $regex: searchRegexStr,
                $options: 'i'
            };
            conditions.$or = [{ package_name: name_search }];
        }
        if (filter.type) {
            if (Array.isArray(filter.type)) {
                conditions.type = {
                    $in: filter.type.map((item) => forceParseInt(item))
                };
            } else {
                conditions.type = forceParseInt(filter.type);
            }
        }
        if (filter.number_class) {
            conditions.number_class = filter.number_class;
        }
        if (filter.gte_number_class) {
            conditions.number_class = { $gte: filter.gte_number_class };
        }
        if (filter.original_number_class) {
            conditions.original_number_class = filter.original_number_class;
        }
        if (filter.activation_date) {
            conditions.activation_date = filter.activation_date;
        }
        if (filter.alerted && _.isArray(filter.alerted)) {
            conditions.$or = conditions.$or
                ? conditions.$or?.concat(filter.alerted)
                : filter.alerted;
        }
        if (filter.created_time) {
            conditions.created_time = filter.created_time;
        }
        if (filter.$and) {
            conditions.$and = filter.$and;
        }
        if (filter.$expr) {
            conditions.$expr = filter.$expr;
        }
        if (filter.ispeak_order_id) {
            conditions.ispeak_order_id = filter.ispeak_order_id;
        }
        if (filter['package.learning_frequency_type']) {
            conditions['package.learning_frequency_type'] =
                filter['package.learning_frequency_type'];
        }
        if (filter['$or']) {
            conditions.$or = filter['$or'];
        }

        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = { __v: 0 },
        sort: any = { created_time: -1 }
    ): Promise<OrderedPackage[]> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const after_project_stage_filter: any = {};
        if (filter.hasOwnProperty('is_expired')) {
            if (filter.is_expired) {
                after_project_stage_filter.expired_date = {
                    $lt: new Date().getTime()
                };
            } else {
                after_project_stage_filter.expired_date = {
                    $gte: new Date().getTime()
                };
            }
            if (filter.expired_date_after) {
                after_project_stage_filter.expired_date = {
                    $gte: filter.expired_date_after
                };
            }
        }

        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const aggregate = [
            { $match: conditions },
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
                $project: {
                    id: 1,
                    package_id: 1,
                    package_name: 1,
                    type: 1,
                    user_id: 1,
                    order_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    order: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    created_time: 1,
                    is_show_history: 1
                }
            },
            { $match: after_project_stage_filter },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'package_id',
                    foreignField: 'id',
                    as: 'package'
                }
            },
            {
                $unwind: '$package'
            },
            {
                $project: {
                    ...select_fields
                }
            }
        ];
        const conditions2: any = {};
        if (filter.location_id && Number(filter.location_id) !== -1) {
            conditions2['package.location_id'] = filter.location_id;
        }
        if (filter.location_ids && filter.location_ids.length > 0) {
            conditions2['package.location_id'] = { $in: filter.location_ids };
        }
        if (Object.keys(conditions2).length !== 0) {
            aggregate.push({ $match: conditions2 });
        }
        return OrderedPackageModel.aggregate(aggregate).exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = { __v: 0 },
        sort: any = { created_time: -1 }
    ): Promise<OrderedPackage[]> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const after_project_stage_filter: any = {};
        if (filter.hasOwnProperty('is_expired')) {
            if (filter.is_expired) {
                after_project_stage_filter.expired_date = {
                    $lt: new Date().getTime()
                };
            } else {
                after_project_stage_filter.expired_date = {
                    $gte: new Date().getTime()
                };
            }
        }

        if (filter.will_expire) {
            after_project_stage_filter.expired_date = filter.will_expire;
        }

        return OrderedPackageModel.aggregate([
            { $match: conditions },
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
                $project: {
                    id: 1,
                    package_id: 1,
                    package_name: 1,
                    type: 1,
                    user_id: 1,
                    order_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    order: 1,
                    alerted: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    created_time: 1
                }
            },
            { $match: after_project_stage_filter },
            { $sort: sort },
            {
                $project: {
                    ...select_fields
                }
            }
        ]).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort: any = { created_time: -1 }
    ): Promise<OrderedPackage | null> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        return OrderedPackageModel.findOne(
            conditions,
            {
                ...select_fields
            },
            sort
        )
            .populate('order')
            .exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const after_project_stage_filter: any = {};
        if (filter.hasOwnProperty('is_expired')) {
            if (filter.is_expired) {
                after_project_stage_filter.expired_date = {
                    $lt: new Date().getTime()
                };
            } else {
                after_project_stage_filter.expired_date = {
                    $gte: new Date().getTime()
                };
            }
        }

        let count_result = new Array<any>();
        count_result = await OrderedPackageModel.aggregate([
            { $match: conditions },
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
                $project: {
                    activation_date: 1,
                    number_class: 1,
                    day_of_use: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    }
                }
            },
            { $match: after_project_stage_filter },
            { $count: 'count' }
        ]).exec();
        let result = 0;
        if (
            count_result.length > 0 &&
            count_result[0].hasOwnProperty('count')
        ) {
            result = count_result[0].count;
        }
        return result;
    }

    public static create(subject: OrderedPackage): Promise<OrderedPackage> {
        const newModel = new OrderedPackageModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('ordered_package_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: OrderedPackage
    ): Promise<any> {
        return OrderedPackageModel.findOneAndUpdate(
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
        return OrderedPackageModel.deleteOne({ _id });
    }

    public static cancelAllPackagesInAnOrder(order_id: number) {
        return OrderedPackageModel.updateMany(
            {
                order_id
            },
            {
                $unset: {
                    activation_date: ''
                }
            }
        ).exec();
    }

    public static findAllToReportPagination(
        filter: FilterQuery,
        select_fields: any = { __v: 0 },
        sort: any = { created_time: -1 }
    ): Promise<OrderedPackage[]> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        return OrderedPackageModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'bookings',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$ordered_package_id', '$$id']
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
                        }
                    ],
                    as: 'bookings'
                }
            },
            {
                $match: {
                    $expr: { $gt: [{ $size: '$bookings' }, 0] }
                }
            },
            {
                $project: {
                    id: 1,
                    package_id: 1,
                    package_name: 1,
                    type: 1,
                    user_id: 1,
                    order_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    order: 1,
                    bookings: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    created_time: 1
                }
            }
            // { $sort: sort },
            // {
            //     $project: {
            //         ...select_fields
            //     }
            // },
        ]).exec();
    }

    public static async getOrderedStudentList(
        filter: FilterQuery
    ): Promise<number[]> {
        /** Only find PREMIUM and STANDARD packages here */
        filter.type = [
            EnumPackageOrderType.PREMIUM,
            EnumPackageOrderType.STANDARD
        ];
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const after_project_stage_filter: any = {};
        if (filter.will_expire) {
            after_project_stage_filter.expired_date = filter.will_expire;
        }
        const result = await OrderedPackageModel.aggregate([
            { $match: conditions },
            {
                $project: {
                    activation_date: 1,
                    number_class: 1,
                    day_of_use: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    user_id: 1
                }
            },
            { $match: after_project_stage_filter },
            {
                $group: {
                    _id: '$user_id'
                }
            }
        ]).exec();
        const student_list = result.map((x: any) => x._id);
        return Promise.resolve(student_list);
    }

    public static async findAllRenewStudents(
        filter: FilterQuery
    ): Promise<number[]> {
        /** Only find PREMIUM and STANDARD packages here */
        filter.type = [
            EnumPackageOrderType.PREMIUM,
            EnumPackageOrderType.STANDARD
        ];
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const query_result = await OrderedPackageModel.aggregate([
            { $match: conditions },
            {
                $group: {
                    _id: '$order_id',
                    order: { $first: '$order' }
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    let: {
                        order_id: '$_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: { $eq: ['$id', '$$order_id'] }
                                    },
                                    {
                                        $expr: {
                                            $eq: [
                                                '$status',
                                                EnumOrderStatus.PAID
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            {
                $group: {
                    _id: '$order.user_id',
                    order_count: { $sum: 1 }
                }
            },
            {
                $match: {
                    order_count: { $gt: 1 }
                }
            }
        ]).exec();
        const student_list = query_result.map((x: any) => x._id);
        return Promise.resolve(student_list);
    }

    public static async getStudentsFromOrderType(
        student_filter: any,
        ordered_package_filter: FilterQuery,
        excluding_filter: FilterQuery
    ) {
        const ordered_package_conditions =
            OrderedPackageActions.buildFilterQuery(ordered_package_filter);
        const other_packages_conditions =
            OrderedPackageActions.buildFilterQuery(excluding_filter);
        let excluding_conditions: any = {
            other_packages: { $size: 0 }
        };
        if (
            Array.isArray(ordered_package_filter.type) &&
            ordered_package_filter.type.includes(EnumPackageOrderType.PREMIUM)
        ) {
            excluding_conditions = {
                $or: [excluding_conditions, { max_learnt_class: { $gt: 0 } }]
            };
        }
        const user_filter = UserActions.buildFilterQuery(student_filter);
        // const user_conditions = Object.fromEntries(
        //     /** We need to add a prefix 'student.' to all the fields */
        //     Object.entries(user_filter).map(([key, value]) => {
        //         if (key == '$or') {
        //             if (Array.isArray(value)) {
        //                 const new_value = value.map((element: any) => {
        //                     return Object.fromEntries(
        //                         Object.entries(element).map(([key, value]) => {
        //                             return [`student.${key}`, value];
        //                         })
        //                     );
        //                 });
        //                 return [key, new_value];
        //             }
        //             return [key, value];
        //         } else {
        //             return [`student.${key}`, value];
        //         }
        //     })
        // );
        const pageSize = student_filter.page_size || 20;
        const pageNumber = student_filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const sort = { 'student.created_time': -1 };
        const aggregate = [
            {
                $match: {
                    ...ordered_package_conditions,
                    number_class: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: '$user_id',
                    max_learnt_class: {
                        $max: {
                            $subtract: [
                                '$original_number_class',
                                '$number_class'
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        user_id: '$_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                ...other_packages_conditions,
                                activation_date: { $lte: new Date().getTime() },
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$user_id']
                                        }
                                    },
                                    { $expr: { $gt: ['$number_class', 0] } },
                                    {
                                        $expr: {
                                            $lt: [
                                                '$number_class',
                                                '$original_number_class'
                                            ]
                                        }
                                    },
                                    {
                                        $expr: {
                                            $lte: [
                                                '$activation_date',
                                                new Date().getTime()
                                            ]
                                        }
                                    },
                                    {
                                        $expr: {
                                            $gte: [
                                                {
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
                                                new Date().getTime()
                                            ]
                                        }
                                    }
                                ]
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: 'other_packages'
                }
            },
            {
                $match: excluding_conditions
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'id',
                    as: 'user_info'
                }
            },
            { $unwind: '$user_info' },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    _id: 0,
                    gender: '$user_info.gender',
                    is_active: '$user_info.is_active',
                    is_verified_phone: '$user_info.is_verified_phone',
                    is_verified_email: '$user_info.is_verified_email',
                    regular_times: '$user_info.regular_times',
                    login_counter: '$user_info.login_counter',
                    id: '$user_info.id',
                    email: '$user_info.email',
                    username: '$user_info.username',
                    phone_number: '$user_info.phone_number',
                    first_name: '$user_info.first_name',
                    last_name: '$user_info.last_name',
                    full_name: '$user_info.full_name',
                    date_of_birth: '$user_info.date_of_birth',
                    address: '$user_info.address',
                    created_time: '$user_info.created_time',
                    updated_time: '$user_info.updated_time',
                    role: '$user_info.role',
                    student: {
                        student_level_id: 1,
                        staff_id: 1,
                        staff: 1
                    }
                }
            },
            { $match: user_filter },
            {
                $lookup: {
                    from: 'admins',
                    let: { staff: '$student.staff' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$staff'] } } },
                        {
                            $project: {
                                id: 1,
                                fullname: 1
                            }
                        }
                    ],
                    as: 'student.staff'
                }
            },
            {
                $unwind: {
                    path: '$student.staff',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $facet: {
                    data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ];
        return OrderedPackageModel.aggregate(aggregate).exec();
    }

    public static async countStudents(filter: FilterQuery): Promise<number> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        let count_result = new Array<any>();
        count_result = await OrderedPackageModel.aggregate([
            {
                $match: conditions
            },
            {
                $project: {
                    activation_date: 1,
                    number_class: 1,
                    day_of_use: 1,
                    user_id: 1,
                    package_id: 1,
                    package_name: 1
                }
            },
            {
                $group: {
                    _id: '$user_id',
                    count_package: {
                        $sum: 1
                    },
                    order_package_oid: {
                        $last: '$_id'
                    }
                }
            },
            { $count: 'count' }
        ]).exec();
        let result = 0;
        if (
            count_result.length > 0 &&
            count_result[0].hasOwnProperty('count')
        ) {
            result = count_result[0].count;
        }
        return result;
    }

    public static findAllNeedGreetingCall(
        filter: FilterQuery,
        select_fields: any = { __v: 0 },
        sort: any = { created_time: -1 }
    ): Promise<OrderedPackage[]> {
        return OrderedPackageModel.aggregate([
            { $match: filter },
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
                $project: {
                    id: 1,
                    package_id: 1,
                    type: 1,
                    user_id: 1,
                    order_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    order: 1
                }
            },
            { $sort: sort },
            {
                $project: {
                    ...select_fields
                }
            }
        ]).exec();
    }

    public static findAllAndPackageByCheckLearningFrequencyType(
        filter: FilterQuery,
        select_fields: any = { __v: 0 },
        sort: any = { created_time: -1 }
    ): Promise<OrderedPackage[]> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const after_project_stage_filter: any = {};
        if (filter.hasOwnProperty('is_expired')) {
            if (filter.is_expired) {
                after_project_stage_filter.expired_date = {
                    $lt: new Date().getTime()
                };
            } else {
                after_project_stage_filter.expired_date = {
                    $gte: new Date().getTime()
                };
            }
        }

        if (filter.will_expire) {
            after_project_stage_filter.expired_date = filter.will_expire;
        }

        return OrderedPackageModel.aggregate([
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
                $lookup: {
                    from: 'packages',
                    localField: 'package_id',
                    foreignField: 'id',
                    as: 'package'
                }
            },
            {
                $unwind: '$package'
            },
            { $match: conditions },
            {
                $project: {
                    _id: 1,
                    id: 1,
                    package_id: 1,
                    package_name: 1,
                    type: 1,
                    user_id: 1,
                    order_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    order: 1,
                    package: 1,
                    alerted: 1,
                    history: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    created_time: 1
                }
            },
            { $match: after_project_stage_filter },
            { $sort: sort },
            {
                $project: {
                    ...select_fields
                }
            }
        ]).exec();
    }

    public static findAllCheckRemineCreateBookingSTA(
        filter: FilterQuery,
        timeCheck?: any,
        select_fields: any = { __v: 0 },
        sort: any = { created_time: -1 }
    ): Promise<any[]> {
        const conditions = OrderedPackageActions.buildFilterQuery(filter);
        const after_project_stage_filter: any = {};
        if (filter.hasOwnProperty('is_expired')) {
            if (filter.is_expired) {
                after_project_stage_filter.expired_date = {
                    $lt: new Date().getTime()
                };
            } else {
                after_project_stage_filter.expired_date = {
                    $gte: new Date().getTime()
                };
            }
        }
        return OrderedPackageModel.aggregate([
            {
                $lookup: {
                    from: 'bookings',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$ordered_package_id', '$$id']
                                }
                            }
                        },
                        {
                            $match: {
                                'calendar.start_time': { $lt: timeCheck }
                            }
                        },
                        { $sort: { 'calendar.start_time': -1 } },
                        { $limit: 1 }
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
                $lookup: {
                    from: 'packages',
                    localField: 'package_id',
                    foreignField: 'id',
                    as: 'package'
                }
            },
            {
                $unwind: '$package'
            },
            {
                $match: conditions
            },
            {
                $project: {
                    id: 1,
                    package_id: 1,
                    package_name: 1,
                    type: 1,
                    user_id: 1,
                    order_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    package: 1,
                    booking: {
                        id: '$booking.id',
                        start_time: '$booking.calendar.start_time',
                        status: '$booking.status',
                        teacher_id: '$booking.teacher_id'
                    },
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    created_time: 1
                }
            },
            { $match: after_project_stage_filter },
            { $sort: sort },
            {
                $project: {
                    ...select_fields
                }
            }
        ]).exec();
    }
}
