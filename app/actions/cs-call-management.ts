import { DAY_TO_MS } from '../const';
import mongoose from 'mongoose';
import CSCallManagement, {
    CallType,
    CSCallManagementModel,
    EnumRegularCare,
    REGULAR_TEST_DISPLAY_ORDER,
    REPORT_UPLOAD_STATUS
} from '../models/cs-call-management';
import { ProtectedRequest } from 'app-request';
import DepartmentActions from './department';
import { CODE_DEPARTMENT } from '../const/department';
import { EnumRole } from '../models/department';
import TeamActions from './team';
import { AdminModel } from '../models/admin';
import { ObjectId } from 'mongodb';
import { BookingModel, EnumBookingStatus } from '../models/booking';
import moment from 'moment';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    student_user_id?: number;
    ordered_package_id?: number;
    call_type?: string;
    status?: number[] | any;
    search?: string;
    lesson_index_in_course?: any;
    reporter_id?: number;
    input_level?: number;
    periodic_report_id?: number;
    fromDate?: number;
    toDate?: number;
    deadline?: any;
    user_data?: any;
    condition_staff?: boolean;
    staff_id?: any;
    'student.staff_id'?: any;
};

export default class CSCallManagementActions {
    public static async buildFilterQuery(
        filter: FilterQuery
    ): Promise<FilterQuery> {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.student_user_id) {
            conditions.student_user_id = Number(filter.student_user_id);
        }
        if (filter.ordered_package_id) {
            conditions.ordered_package_id = Number(filter.ordered_package_id);
        }
        if (filter.call_type) {
            conditions.call_type = filter.call_type;
        }
        if (filter.lesson_index_in_course) {
            conditions.lesson_index_in_course = Number(
                filter.lesson_index_in_course
            );
        }
        if (filter.status || filter.status == 0) {
            if (Array.isArray(filter.status)) {
                conditions.status = { $in: filter.status };
            } else {
                conditions.status = Number(filter.status);
            }
        }
        if (filter.reporter_id) {
            conditions.reporter_id = filter.reporter_id;
        }
        if (filter.input_level || filter.input_level == 0) {
            conditions.input_level = filter.input_level;
        }
        if (filter.condition_staff) {
            const csDepartment = await DepartmentActions.findOne({
                filter: {
                    unsignedName: CODE_DEPARTMENT.CSKH
                }
            });
            if (!csDepartment) {
                throw new Error('Department not found');
            }
            let filterStaff = [];
            if (
                filter.user_data.username !== 'admin' &&
                filter.user_data.department.isRole !== EnumRole.Manager &&
                filter.user_data.department.isRole !== EnumRole.Deputy_manager
            ) {
                filterStaff.push(filter.user_data.id);
                const team = await TeamActions.findOne({
                    filter: {
                        $or: [
                            {
                                leader: filter.user_data._id
                            },
                            { members: filter.user_data._id }
                        ],
                        department: csDepartment._id
                    }
                });
                if (team) {
                    if (team?.leader?.id === filter.user_data.id) {
                        team.members.forEach((element) => {
                            filterStaff.push(element.id);
                        });
                    }
                }
            }

            if (filterStaff && filterStaff.length > 0) {
                if (filter.staff_id) {
                    if (
                        filterStaff.includes(Number(filter.staff_id)) &&
                        Number(filter.staff_id) != -1
                    ) {
                        conditions['student.staff_id'] = Number(
                            filter.staff_id
                        );
                    } else {
                        conditions['student.staff_id'] = -2;
                    }
                } else {
                    conditions['student.staff_id'] = { $in: filterStaff };
                }
            } else if (
                filter.user_data.username == 'admin' ||
                filter.user_data.department.isRole == EnumRole.Manager ||
                filter.user_data.department.isRole == EnumRole.Deputy_manager
            ) {
                if (filter.staff_id) {
                    if (Number(filter.staff_id) != -1) {
                        conditions['student.staff_id'] = Number(
                            filter.staff_id
                        );
                    } else {
                        conditions['student.staff_id'] = null;
                    }
                }
            }
        }
        if (filter.fromDate && filter.toDate) {
            conditions.deadline = {
                $gte: Number(filter.fromDate),
                $lt: Number(filter.toDate)
            };
        }
        return conditions;
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<CSCallManagement[]> {
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        console.log(conditions);
        return CSCallManagementModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<CSCallManagement[]> {
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return CSCallManagementModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .populate('ordered_package')
            .exec();
    }

    public static async findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<CSCallManagement | null> {
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.countDocuments(conditions).exec();
    }

    public static create(subject: CSCallManagement): Promise<CSCallManagement> {
        const newModel = new CSCallManagementModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<any> {
        return CSCallManagementModel.findOneAndUpdate(
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
        return CSCallManagementModel.deleteOne({ _id });
    }

    public static async getGreetingCallByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        filter.call_type = CallType.GREETING;
        filter.condition_staff = true;
        filter.user_data = req.user;
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
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
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        ordered_package_id: '$ordered_package_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
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
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'locations',
                                            localField: 'location_id',
                                            foreignField: 'id',
                                            as: 'location'
                                        }
                                    },
                                    {
                                        $unwind: {
                                            path: '$location',
                                            preserveNullAndEmptyArrays: true
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1,
                                            'location.name': 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
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
                                package: 1,
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
                        }
                    ],
                    as: 'orderedPackages'
                }
            },
            {
                $unwind: '$orderedPackages'
            },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $sort: { _id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async getUpcomingCallByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        filter.call_type = CallType.UPCOMING_TEST;
        filter.condition_staff = true;
        filter.user_data = req.user;
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
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
                            $project: {
                                'unit.name': 1,
                                'course.id': 1,
                                'course.name': 1,
                                'calendar.start_time': 1,
                                'calendar.end_time': 1,
                                'teacher.full_name': 1,
                                'teacher.username': 1,
                                'ordered_package.package_name': 1,
                                id: 1,
                                regular_calendar: {
                                    regular_start_time: 1,
                                    teacher_id: 1,
                                    status: 1,
                                    teacher_regular: {
                                        username: 1,
                                        full_name: 1
                                    }
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
                    data: [
                        { $sort: { _id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async getCheckingCallByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        filter.call_type = CallType.CHECKING;
        filter.condition_staff = true;
        filter.user_data = req.user;
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
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
                                id: 1,
                                calendar: 1,
                                course: {
                                    name: 1
                                },
                                teacher: {
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
                $unwind: '$booking'
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
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
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
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'locations',
                                            localField: 'location_id',
                                            foreignField: 'id',
                                            as: 'location'
                                        }
                                    },
                                    {
                                        $unwind: {
                                            path: '$location',
                                            preserveNullAndEmptyArrays: true
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1,
                                            'location.name': 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
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
                                package: 1,
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
                        }
                    ],
                    as: 'orderedPackages'
                }
            },
            { $unwind: '$orderedPackages' },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $sort: { _id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async getTestReportsByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        filter.call_type = CallType.TEST_REPORTS;
        filter.condition_staff = true;
        filter.user_data = req.user;
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
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
                                id: 1,
                                calendar: 1,
                                course: {
                                    name: 1
                                },
                                teacher: {
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
                $unwind: '$booking'
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
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
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
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'locations',
                                            localField: 'location_id',
                                            foreignField: 'id',
                                            as: 'location'
                                        }
                                    },
                                    {
                                        $unwind: {
                                            path: '$location',
                                            preserveNullAndEmptyArrays: true
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1,
                                            'location.name': 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
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
                                package: 1,
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
                        }
                    ],
                    as: 'orderedPackages'
                }
            },
            { $unwind: '$orderedPackages' },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $sort: { _id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async getRegularTestByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions: any = {
            status: EnumBookingStatus.CONFIRMED,
            'calendar.start_time': {
                $gte: moment().startOf('day').valueOf(),
                $lte: moment().endOf('day').valueOf()
            },
            'unit.display_order': {
                $in: REGULAR_TEST_DISPLAY_ORDER
            }
        };
        const csDepartment = await DepartmentActions.findOne({
            filter: {
                unsignedName: CODE_DEPARTMENT.CSKH
            }
        });
        if (!csDepartment) {
            throw new Error('Department not found');
        }
        let filterStaff = [];
        if (
            req.user.username !== 'admin' &&
            req.user.department.isRole !== EnumRole.Manager &&
            req.user.department.isRole !== EnumRole.Deputy_manager
        ) {
            filterStaff.push(req.user.id);
            const team = await TeamActions.findOne({
                filter: {
                    $or: [
                        {
                            leader: req.user._id
                        },
                        { members: req.user._id }
                    ],
                    department: csDepartment._id
                }
            });
            if (team) {
                if (team?.leader?.id === req.user.id) {
                    team.members.forEach((element) => {
                        filterStaff.push(element.id);
                    });
                }
            }
        }
        if (filter.student_user_id) {
            conditions['student.user_id'] = Number(filter.student_user_id);
        }
        if (filter.lesson_index_in_course) {
            conditions['unit.display_order'] =
                Number(filter.lesson_index_in_course) - 1;
        }
        if (filterStaff && filterStaff.length > 0) {
            if (filter.staff_id) {
                if (
                    filterStaff.includes(Number(filter.staff_id)) &&
                    Number(filter.staff_id) != -1
                ) {
                    conditions['student.staff_id'] = Number(filter.staff_id);
                } else {
                    conditions['student.staff_id'] = -2;
                }
            } else {
                conditions['student.staff_id'] = { $in: filterStaff };
            }
        } else if (
            req.user.username == 'admin' ||
            req.user.department.isRole == EnumRole.Manager ||
            req.user.department.isRole == EnumRole.Deputy_manager
        ) {
            if (filter.staff_id) {
                if (Number(filter.staff_id) != -1) {
                    conditions['student.staff_id'] = Number(filter.staff_id);
                } else {
                    conditions['student.staff_id'] = null;
                }
            }
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
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_id: '$student_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_id', '$user_id']
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
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'user_id',
                                foreignField: 'id',
                                as: 'user'
                            }
                        },
                        {
                            $unwind: '$user'
                        }
                    ],
                    as: 'student'
                }
            },
            {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
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
                    from: 'ordered-packages',
                    let: {
                        ordered_package_id: '$ordered_package_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
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
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'locations',
                                            localField: 'location_id',
                                            foreignField: 'id',
                                            as: 'location'
                                        }
                                    },
                                    {
                                        $unwind: {
                                            path: '$location',
                                            preserveNullAndEmptyArrays: true
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1,
                                            'location.name': 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
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
                                package: 1,
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
                        }
                    ],
                    as: 'orderedPackages'
                }
            },
            { $unwind: '$orderedPackages' },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $sort: { _id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static async getDataDashboardActiveForm(
        departmentId: string
    ): Promise<any[]> {
        const aggregateQuery: any = [
            {
                $match: {
                    'department.department': new ObjectId(departmentId)
                }
            },
            {
                $project: {
                    id: 1,
                    username: 1,
                    is_active: 1,
                    fullname: 1,
                    email: 1,
                    phoneNumber: 1
                }
            },
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
                                    $eq: ['$$id', '$staff_id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'cs_call_management',
                                let: {
                                    user_id: '$user_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    '$$user_id',
                                                    '$student_user_id'
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 1,
                                            status: 1,
                                            call_type: 1
                                        }
                                    }
                                ],
                                as: 'cs_list_info'
                            }
                        },
                        {
                            $unwind: {
                                path: '$cs_list_info',
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],
                    as: 'student'
                }
            }
        ];
        return AdminModel.aggregate(aggregateQuery);
    }

    public static async getDataDashboardNoOne(): Promise<any[]> {
        return CSCallManagementModel.aggregate([
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
                                }
                            }
                        }
                    ],
                    as: 'student'
                }
            },
            {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
            },
            { $match: { 'student.staff_id': null } },
            {
                $project: {
                    cs_list_info: {
                        _id: '$_id',
                        call_type: '$call_type',
                        status: '$status'
                    },
                    _id: 0,
                    staff: '$student.staff',
                    staff_id: '$student.staff_id',
                    user_id: '$student.user_id'
                }
            }
        ]).exec();
    }

    public static async getPeriodicReportsByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        console.log(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions: any = {
            call_type: CallType.PERIODIC_REPORTS
        };
        const csDepartment = await DepartmentActions.findOne({
            filter: {
                unsignedName: CODE_DEPARTMENT.CSKH
            }
        });
        if (!csDepartment) {
            throw new Error('Department CSKH not found');
        }

        const htDepartment = await DepartmentActions.findOne({
            filter: {
                unsignedName: CODE_DEPARTMENT.HOC_THUAT
            }
        });
        if (!htDepartment) {
            throw new Error('Department HT not found');
        }

        const filterStaff = [];
        const filterReporter = [];
        if (
            req.user.department.isRole === EnumRole.Leader ||
            req.user.department.isRole === EnumRole.Staff
        ) {
            if (req.user.department.id == htDepartment.id) {
                if (filter.staff_id) {
                    if (Number(filter.staff_id) != -1) {
                        conditions['student.staff_id'] = Number(
                            filter.staff_id
                        );
                    } else {
                        conditions['student.staff_id'] = null;
                    }
                }
                if (filter.reporter_id) {
                    if (Number(filter.reporter_id) != -1) {
                        conditions.reporter_id = Number(filter.reporter_id);
                    } else {
                        conditions.reporter_id = -2;
                    }
                } else {
                    conditions.reporter_id = { $gt: 0 };
                }
                // filterReporter.push(req.user.id);
                // const team = await TeamActions.findOne({
                //     filter: {
                //         $or: [
                //             {
                //                 leader: req.user._id
                //             },
                //             { members: req.user._id }
                //         ],
                //         department: htDepartment._id
                //     }
                // });
                // if (team) {
                //     if (team?.leader?.id === req.user.id) {
                //         team.members.forEach((element) => {
                //             filterReporter.push(element.id);
                //         });
                //     }
                // }
                // if (filterReporter && filterReporter.length > 0) {
                //     if (filter.reporter_id) {
                //         if (
                //             filterReporter.includes(
                //                 Number(filter.reporter_id)
                //             ) &&
                //             Number(filter.reporter_id) != -1
                //         ) {
                //             conditions.reporter_id = Number(filter.reporter_id);
                //         } else {
                //             conditions.reporter_id = -2;
                //         }
                //     } else {
                //         conditions.reporter_id = { $in: filterReporter };
                //     }
                // }
            } else if (req.user.department.id == csDepartment.id) {
                if (filter.reporter_id) {
                    if (Number(filter.reporter_id) != -1) {
                        conditions.reporter_id = Number(filter.reporter_id);
                    } else {
                        conditions.reporter_id = null;
                    }
                }
                filterStaff.push(req.user.id);
                const team = await TeamActions.findOne({
                    filter: {
                        $or: [
                            {
                                leader: req.user._id
                            },
                            { members: req.user._id }
                        ],
                        department: csDepartment._id
                    }
                });
                if (team) {
                    if (team?.leader?.id === req.user.id) {
                        team.members.forEach((element) => {
                            filterStaff.push(element.id);
                        });
                    }
                }
                if (filterStaff && filterStaff.length > 0) {
                    if (filter.staff_id) {
                        if (
                            filterStaff.includes(Number(filter.staff_id)) &&
                            Number(filter.staff_id) != -1
                        ) {
                            conditions['student.staff_id'] = Number(
                                filter.staff_id
                            );
                        } else {
                            conditions['student.staff_id'] = -2;
                        }
                    } else {
                        conditions['student.staff_id'] = { $in: filterStaff };
                    }
                }
            }
        } else {
            if (filter.staff_id) {
                if (Number(filter.staff_id) != -1) {
                    conditions['student.staff_id'] = Number(filter.staff_id);
                } else {
                    conditions['student.staff_id'] = null;
                }
            }
            if (filter.reporter_id) {
                if (Number(filter.reporter_id) != -1) {
                    conditions.reporter_id = Number(filter.reporter_id);
                } else {
                    conditions.reporter_id = null;
                }
            }
        }
        if (filter.status) {
            conditions.status = Number(filter.status);
        }
        if (filter.priority) {
            conditions.priority = Number(filter.priority);
        }
        if (filter.periodic_type) {
            conditions.periodic_type = Number(filter.periodic_type);
        }
        if (filter.student_user_id) {
            conditions.student_user_id = Number(filter.student_user_id);
        }
        if (filter.report_upload_status) {
            if (
                Number(filter.report_upload_status) ===
                REPORT_UPLOAD_STATUS.NOT_DONE
            ) {
                conditions['learning_report.id'] = { $exists: false };
            } else if (
                Number(filter.report_upload_status) ===
                REPORT_UPLOAD_STATUS.UPLOADER
            ) {
                conditions['learning_report.id'] = { $exists: true };
            }
        }
        if (filter.lesson_index_in_course) {
            conditions.lesson_index_in_course = Number(
                filter.lesson_index_in_course
            );
        }
        if (filter.fromDate && filter.toDate) {
            conditions.deadline = {
                $gte: Number(filter.fromDate),
                $lt: Number(filter.toDate)
            };
        }
        let sorter: any = { _id: 1 };
        if (filter.sort) {
            if (filter.sort === 'asc') {
                sorter = { deadline: 1 };
            } else if (filter.sort === 'desc') {
                sorter = { deadline: -1 };
            }
        }
        if (filter.sync_data) {
            conditions.$or = [
                {
                    periodic_sync_data: false
                },
                { periodic_sync_data: { $exists: false } }
            ];
        }
        if (filter.createTime) {
            const timeCreate = new Date(Number(filter.createTime));
            const dateCreate = timeCreate.getDate();
            const monthCreate = timeCreate.getMonth() + 1;
            const yearCreate = timeCreate.getFullYear();
            const dateEnd = `${yearCreate}-${monthCreate}-${dateCreate}T17:00:00.000Z`;
            const dateYesterDayCreate = new Date(timeCreate.setDate(timeCreate.getDate() - 1)).getDate();
            const monthYesterDayCreate = timeCreate.getMonth() + 1;
            const yearYesterDayCreate = timeCreate.getFullYear();
            const dateStart = `${yearYesterDayCreate}-${monthYesterDayCreate}-${dateYesterDayCreate}T17:00:00.000Z`;
            conditions.created_time = {
                $gte: new Date(dateStart),
                $lt: new Date(dateEnd)
            };
        }
        const aggregateQuery: any = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
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
                                id: 1,
                                calendar: 1,
                                course: {
                                    name: 1
                                },
                                teacher: {
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
                $unwind: '$booking'
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
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
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
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'locations',
                                            localField: 'location_id',
                                            foreignField: 'id',
                                            as: 'location'
                                        }
                                    },
                                    {
                                        $unwind: {
                                            path: '$location',
                                            preserveNullAndEmptyArrays: true
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1,
                                            'location.name': 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
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
                                package: 1,
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
                        }
                    ],
                    as: 'orderedPackages'
                }
            },
            { $unwind: '$orderedPackages' },
            {
                $lookup: {
                    from: 'regular-calendar',
                    let: {
                        studentId: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$studentId', '$student_id']
                                }
                            }
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
                                id: 1,
                                student_id: 1,
                                teacher_id: 1,
                                regular_start_time: 1,
                                teacher_full_name: '$teacher.full_name',
                                teacher_username: '$teacher.username'
                            }
                        }
                    ],
                    as: 'regular_calendar'
                }
            },
            {
                $lookup: {
                    from: 'admins',
                    let: {
                        reporter_id: '$reporter_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$reporter_id', '$id']
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
                    as: 'reporter'
                }
            },
            {
                $unwind: {
                    path: '$reporter',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'learning-assessment-reports',
                    let: {
                        report_id: '$periodic_report_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$report_id', '$id']
                                }
                            }
                        },
                        {
                            $project: {
                                id: 1,
                                status: 1,
                                type: 1,
                                student_id: 1,
                                time_create: 1,
                                start_time: 1,
                                end_time: 1
                            }
                        }
                    ],
                    as: 'learning_report'
                }
            },
            {
                $unwind: {
                    path: '$learning_report',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $sort: sorter },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ];
        return CSCallManagementModel.aggregate(aggregateQuery).exec();
    }

    public static async getAllObservationByFilter(
        req: ProtectedRequest,
        filter: any
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        filter.call_type = CallType.OBSERVATION;
        filter.condition_staff = true;
        filter.user_data = req.user;
        const conditions = await CSCallManagementActions.buildFilterQuery(
            filter
        );
        return CSCallManagementModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$student_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
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
                                id: 1,
                                calendar: 1,
                                course: {
                                    name: 1
                                },
                                teacher: {
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
                $unwind: '$booking'
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
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
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
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: 'locations',
                                            localField: 'location_id',
                                            foreignField: 'id',
                                            as: 'location'
                                        }
                                    },
                                    {
                                        $unwind: {
                                            path: '$location',
                                            preserveNullAndEmptyArrays: true
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1,
                                            'location.name': 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
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
                                package: 1,
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
                        }
                    ],
                    as: 'orderedPackages'
                }
            },
            { $unwind: '$orderedPackages' },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $sort: { _id: 1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }
}
