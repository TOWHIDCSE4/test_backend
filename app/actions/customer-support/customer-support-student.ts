import mongoose from 'mongoose';
import { RoleCode } from '../../const/role';
import _, { escapeRegExp } from 'lodash';
import { DAY_TO_MS } from '../../const/date-time';
import Student, {
    CustomerSupportStudentModel
} from '../../models/customer-support-student';
import User, { UserModel } from '../../models/user';
import Admin, { AdminModel } from '../../models/admin';
import { OrderedPackageModel } from '../../models/ordered-package';

import { EnumScheduledMemoType } from '../../models/scheduled-memo';
import { EnumRecommendStatus } from '../../models/report';

import { ObjectId } from 'mongodb';
import {
    EnumRegularCalendarStatus,
    RegularCalendarModel
} from '../../models/regular-calendar';

type FilterQueryStudent = {
    _id?: mongoose.Types.ObjectId;
    status?: string;
    page_size?: number;
    page_number?: number;
    q?: string;
    staff?: string;
    user_id?: number;
};
const defaultUserInfo = {
    id: 1,
    email: 1,
    username: 1,
    phone_number: 1,
    full_name: 1,
    skype_account: 1,
    zalo_id: 1,
    date_of_birth: 1,
    intro: 1,
    is_active: 1,
    regular_times: 1,
    created_time: 1,
    updated_time: 1,
    teacher: 1,
    staff: 1,
    is_verified_email: 1,
    is_enable_receive_mail: 1
};

export default class CustomerSupportManagementActions {
    static buildQueryStudent(query: any): any {
        const q: any = {};
        if (query.name) {
            const searchRegexStr = escapeRegExp(query.name);
            q.full_name = { $regex: searchRegexStr, $options: 'i' };
        }
        if (query.search && query.search !== '') {
            query.search = query.search.trim();
            if (!query.orderedPackageType && !query.search.includes('@')) {
                q.$text = {
                    $search: query.search,
                    $caseSensitive: false
                };
            } else {
                q.$or = [
                    {
                        email: query.search
                    },
                    {
                        username: query.search
                    },
                    {
                        phone_number: query.search
                    },
                    {
                        full_name: query.search
                    },
                    {
                        skype_account: query.search
                    }
                ];
            }
        }
        if (query.status) {
            q.is_active = query.status === 'active';
        }
        if (query.user_id) {
            q.user_id = query.user_id;
        }
        if (query.verified_email === true || query.verified_email === 'true') {
            q.is_verified_email = true;
        }
        if (query.verified_email === false || query.verified_email === 'false') {
            q.is_verified_email = false;
        }
        if (query.notification_email === true || query.notification_email === 'true') {
            q.is_enable_receive_mail = true;
        }
        if (query.notification_email === false || query.notification_email === 'false') {
            q.is_enable_receive_mail = { $ne: true };
        }
        return q;
    }

    public static async getAllStudent(queryStudent: any): Promise<any[]> {
        const pageSize = queryStudent?.page_size || 10;
        const pageNumber = queryStudent?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditionsStudent = this.buildQueryStudent(queryStudent);
        const sort = { created_time: -1 };
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const firstDayInWeeek = new Date(
            currentDate.setDate(currentDate.getDate() - currentDate.getDay())
        ).getTime();
        const lastDayInWeeek = new Date(
            currentDate.setDate(
                currentDate.getDate() - currentDate.getDay() + 7
            )
        ).getTime();
        const firstDayInMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        );
        conditionsStudent.role = RoleCode.STUDENT;
        const lookupStudent = {
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
                    $match: queryStudent.staff_id
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
        };
        const lookupRegularTimeInfo = {
            from: 'regular-calendar',
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
                        from: 'users',
                        localField: 'teacher_id',
                        foreignField: 'id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'bookings',
                        let: {
                            course_id: '$course_id',
                            teacher_id: '$teacher_id',
                            student_id: '$student_id'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $and: [
                                        {
                                            $expr: {
                                                $eq: [
                                                    '$$course_id',
                                                    '$course_id'
                                                ]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    '$$teacher_id',
                                                    '$teacher_id'
                                                ]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    '$$student_id',
                                                    '$student_id'
                                                ]
                                            }
                                        }
                                    ],
                                    'calendar.start_time': {
                                        $gte: firstDayInWeeek
                                    },
                                    'calendar.end_time': {
                                        $lte: lastDayInWeeek
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'units',
                                    let: {
                                        unit_id: '$unit_id'
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$$unit_id', '$id']
                                                }
                                            }
                                        }
                                    ],
                                    as: 'unit'
                                }
                            },
                            {
                                $unwind: {
                                    path: '$unit',
                                    preserveNullAndEmptyArrays: true
                                }
                            }
                        ],
                        as: 'bookingsInWeek'
                    }
                },
                {
                    $project: {
                        id: 1,
                        course_id: 1,
                        package_id: 1,
                        communicate_tool: 1,
                        regular_start_time: 1,
                        teacher_id: 1,
                        student_id: 1,
                        status: 1,
                        course: { id: 1, name: 1, _id: 1 },
                        bookingsInWeek: {
                            memo: 1,
                            status: 1,
                            admin_unit_lock: 1,
                            is_regular_booking: 1,
                            best_memo: 1,
                            is_late: 1,
                            id: 1,
                            course_id: 1,
                            ordered_package_id: 1,
                            teacher_id: 1,
                            calendar: 1,
                            calendar_id: 1,
                            unit_id: 1,
                            unit: {
                                id: 1,
                                name: 1,
                                student_document: 1,
                                teacher_document: 1,
                                note: 1,
                                preview: 1,
                                is_active: 1,
                                audio: 1,
                                homework: 1,
                                workbook: 1
                            },
                            student_id: 1,
                            student_note: 1,
                            teacher_note: 1,
                            admin_note: 1
                        },
                        teacher: {
                            id: 1,
                            email: 1,
                            username: 1,
                            phone_number: 1,
                            first_name: 1,
                            last_name: 1,
                            full_name: 1,
                            gender: 1,
                            skype_account: 1,
                            country: 1
                        }
                    }
                }
            ],
            as: 'regular_calendar'
        };
        const lookupOrderPackage = {
            from: 'ordered-packages',
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
                                    $multiply: ['$day_of_use', DAY_TO_MS]
                                }
                            ]
                        },
                        created_time: 1
                    }
                }
            ],
            as: 'orderedPackages'
        };
        const lookupCS = {
            from: 'customer_support_student',
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
                }
            ],
            as: 'cs_info'
        };
        const lookupReport = {
            from: 'reports',
            let: {
                id: '$id'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ['$$id', '$report_user_id']
                        }
                    }
                },
                {
                    $project: {
                        created_time: 1,
                        id: 1,
                        recommend_content: 1,
                        recommend_section: 1,
                        recommend_status: 1,
                        report_solution: 1,
                        report_teacher_feedback: 1,
                        report_user_id: 1,
                        resolve_user_id: 1,
                        type: 1,
                        count: 1
                    }
                },
                {
                    $group: {
                        _id: '$recommend_section',
                        count: { $sum: 1 },
                        list: { $push: '$$ROOT' }
                    }
                },
                { $sort: { count: -1 } }
            ],
            as: 'reports'
        };
        const lookupLearningReport = {
            from: 'scheduled-memos',
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
                        from: 'courses',
                        localField: 'course',
                        foreignField: '_id',
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
                        from: 'users',
                        localField: 'teacher_id',
                        foreignField: 'id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        attendance: 1,
                        attitude: 1,
                        completed_class: 1,
                        course: {
                            name: 1
                        },
                        teacher: {
                            full_name: 1
                        },
                        exam_result: 1,
                        homework: 1,
                        id: 1,
                        month: 1,
                        registered_class: 1,
                        segments: 1,
                        student_id: 1,
                        teacher_commented: 1,
                        teacher_id: 1,
                        teacher_note: 1,
                        type: 1,
                        year: 1,
                        created_time: 1
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        list: { $push: '$$ROOT' }
                    }
                },
                { $sort: { count: -1 } }
            ],
            as: 'scheduled_memos'
        };
        const lookupCSMStudent = {
            from: 'customer_support_student',
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
                    $match: queryStudent.checking_call
                        ? {
                              'supporter.checking_call': Number(
                                  queryStudent.checking_call
                              )
                          }
                        : {}
                },
                {
                    $match: queryStudent.greeting_call
                        ? {
                              'supporter.greeting_call': Number(
                                  queryStudent.greeting_call
                              )
                          }
                        : {}
                },
                {
                    $match: queryStudent.scheduled
                        ? {
                              'supporter.scheduled': Number(
                                  queryStudent.scheduled
                              )
                          }
                        : {}
                },
                {
                    $match: queryStudent.type
                        ? {
                              'customer_care.date': {
                                  $gte: firstDayInMonth.getTime()
                              },
                              'customer_care.type': Number(queryStudent.type)
                          }
                        : {}
                },
                {
                    $match: queryStudent.customer_type
                        ? {
                              'customer_care.date': {
                                  $gte: firstDayInMonth.getTime()
                              },
                              'customer_care.customer_type': Number(
                                  queryStudent.customer_type
                              )
                          }
                        : {}
                },
                { $project: { _id: 1 } }
            ],
            as: 'customer_support_student'
        };
        const facetData: any = [
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: lookupOrderPackage
            },
            {
                $lookup: lookupReport
            },
            {
                $lookup: lookupLearningReport
            },
            {
                $lookup: lookupCS
            },
            {
                $unwind: {
                    path: '$cs_info',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        // Nếu không query student theo staffid thì sẽ để vào facet sau khi đã limit dữ liệu
        if (!queryStudent.staff_id) {
            facetData.splice(facetData.length - 2, 0, {
                $lookup: lookupStudent
            });
            facetData.splice(facetData.length - 2, 0, {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: true }
            });
        }

        // Nếu không query student theo auto_scheduled thì sẽ để vào facet sau khi đã limit dữ liệu
        if (queryStudent.auto_scheduled !== '1') {
            facetData.splice(facetData.length - 1, 0, {
                $lookup: lookupRegularTimeInfo
            });
        }
        console.log(conditionsStudent);
        let aggregateQuery: any = [
            { $match: conditionsStudent },
            {
                $project: {
                    ...defaultUserInfo
                }
            },
            {
                $facet: {
                    data: facetData,
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ];

        // nếu không search thì sẽ sort user theo ngày tạo
        if (!queryStudent.search) {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $sort: sort
            });
        }

        // Nếu query student học viên có gói học là premeum,... thì filter từ ordered package
        if (queryStudent.orderedPackageType) {
            const aggregatePackage = [
                {
                    $match: {
                        type: Number(queryStudent.orderedPackageType),
                        activation_date: { $lte: Date.now() },
                        $and: [
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
                                        Date.now()
                                    ]
                                }
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$user_id'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'id',
                        as: 'user'
                    }
                },
                {
                    $unwind: {
                        path: '$user',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $addFields: {
                        _id: '$user._id',
                        id: '$user.id',
                        email: '$user.email',
                        username: '$user.username',
                        phone_number: '$user.phone_number',
                        full_name: '$user.full_name',
                        skype_account: '$user.skype_account',
                        is_active: '$user.is_active',
                        is_verified_email: '$user.is_verified_email',
                        is_enable_receive_mail: '$user.is_enable_receive_mail',
                        regular_times: '$user.regular_times',
                        created_time: '$user.created_time',
                        updated_time: '$user.updated_time',
                        teacher: '$user.teacher',
                        staff: '$user.staff',
                        role: '$user.role'
                    }
                }
            ];
            aggregateQuery = aggregatePackage.concat(aggregateQuery);
        }

        // Nếu query student theo staff_id thì sẽ để vào aggregateQuery để filter dữ liệu trước khi limit trong $facet
        if (queryStudent.staff_id) {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $lookup: lookupStudent
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
            });
        }

        const checkQueryCSM =
            queryStudent.checking_call ||
            queryStudent.greeting_call ||
            queryStudent.scheduled ||
            queryStudent.type ||
            queryStudent.customer_type;
        // nếu checkQueryCSM tồn tại thì thêm query vào bảng customer_support_student để filter dữ liệu trước khi limit trong $facet
        if (checkQueryCSM) {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $lookup: lookupCSMStudent
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $unwind: {
                    path: '$customer_support_student',
                    preserveNullAndEmptyArrays: false
                }
            });
        }

        // Nếu có filter theo trạng thái auto_scheduled thì thêm query để filter dữ liệu trước khi limit trong $facet
        if (queryStudent.auto_scheduled === '1') {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $lookup: lookupRegularTimeInfo
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $project: {
                    _id: 1,
                    is_active: 1,
                    regular_times: 1,
                    id: 1,
                    email: 1,
                    username: 1,
                    phone_number: 1,
                    first_name: 1,
                    last_name: 1,
                    full_name: 1,
                    date_of_birth: 1,
                    skype_account: 1,
                    created_time: 1,
                    updated_time: 1,
                    student: 1,
                    regular_calendar: 1,
                    is_verified_email: 1,
                    is_enable_receive_mail: 1,
                    size_regular_calendar: {
                        $size: { $ifNull: ['$regular_calendar', []] }
                    },
                    size_regular_time: {
                        $size: { $ifNull: ['$regular_times', []] }
                    },
                    compareTime: {
                        $gte: [
                            {
                                $size: { $ifNull: ['$regular_calendar', []] }
                            },
                            {
                                $size: { $ifNull: ['$regular_times', []] }
                            }
                        ]
                    }
                }
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $match: {
                    size_regular_calendar: { $gt: 0 },
                    size_regular_time: { $gt: 0 },
                    compareTime: true
                }
            });
        }
        if (queryStudent.orderedPackageType) {
            return OrderedPackageModel.aggregate(aggregateQuery);
        }
        return UserModel.aggregate(aggregateQuery);
    }

    public static async getAllRegularCalendar(filter: any): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        const conditions: any = {
            status: {
                $in: [
                    EnumRegularCalendarStatus.ACTIVE,
                    EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING
                ]
            }
        };
        if (filter.teacher_id) {
            conditions.teacher_id = Number(filter.teacher_id);
        }
        if (filter.student_id) {
            conditions.student_id = Number(filter.student_id);
        }
        if (filter.messageSchedule) {
            conditions['auto_schedule.message'] = {
                $regex: filter.messageSchedule,
                $options: 'i'
            };
        }
        if (filter.regular_start_time) {
            conditions.regular_start_time = filter.regular_start_time;
        }
        if (filter.fromDate && filter.toDate) {
            const fromDateSunday = 0; // sunday 00:00:01
            const endDateSunday = 86340000; // sunday 23:59:00
            const endSatureDay = 604740000; // sat 23:59:00
            //ngày chủ nhật
            if (
                Number(filter.fromDate) === fromDateSunday &&
                Number(filter.toDate) === endDateSunday
            ) {
                conditions.regular_start_time = {
                    $lt: Number(endDateSunday)
                };
            }

            //các ngày khác
            if (
                Number(filter.fromDate) !== fromDateSunday &&
                Number(filter.toDate) !== endDateSunday
            ) {
                conditions.regular_start_time = {
                    $gte: Number(filter.fromDate),
                    $lt: Number(filter.toDate)
                };
            }

            // // x -> cn
            if (
                Number(filter.fromDate) !== fromDateSunday &&
                Number(filter.toDate) === endDateSunday
            ) {
                conditions.$or = [
                    {
                        regular_start_time: {
                            $gte: Number(filter.fromDate),
                            $lt: Number(endSatureDay)
                        }
                    },
                    {
                        regular_start_time: {
                            $lt: Number(endDateSunday)
                        }
                    }
                ];
            }
            // cn -> x
            if (
                Number(filter.fromDate) === fromDateSunday &&
                Number(filter.toDate) !== endDateSunday
            ) {
                conditions.$or = [
                    {
                        regular_start_time: {
                            $lt: Number(endDateSunday)
                        }
                    },
                    {
                        regular_start_time: {
                            $lt: Number(filter.toDate)
                        }
                    }
                ];
            }
        }
        const faceData = [
            { $sort: { regular_start_time: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'teacher',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            {
                $unwind: '$teacher'
            },

            {
                $lookup: {
                    from: 'courses',
                    localField: 'course',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $unwind: '$course'
            },
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
            }
        ];
        const aggregate = [];
        // nếu filter theo staff thì cho vào aggregate để không bị limit dữ liệu(faceDate)
        if (filter.staff_id) {
            conditions['student.staff_id'] = Number(filter.staff_id);
            faceData.push({
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            } as any);
        } else {
            // không filter theo staff thì cho vào faceData sau khi đã limit dữ liệu
            faceData.push({
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            } as any);
        }
        faceData.push({
            $unwind: '$student'
        } as any);

        // nếu filter theo staus thì cho vào aggregate để không bị limit dữ liệu(faceDate)
        if (filter.status) {
            conditions['auto_schedule.success'] =
                filter.status === '1' ? true : false;
            aggregate.unshift({
                $lookup: {
                    from: 'bookings',
                    let: {
                        booking_id: '$auto_schedule.booking_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$booking_id', '$id']
                                }
                            }
                        }
                    ],
                    as: 'booking'
                }
            } as any);
        } else {
            // không filter theo status thì cho vào faceData sau khi đã limit dữ liệu
            faceData.push({
                $lookup: {
                    from: 'bookings',
                    let: {
                        booking_id: '$auto_schedule.booking_id'
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
                                from: 'users',
                                let: {
                                    teacher_id: '$teacher_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$teacher_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            full_name: 1,
                                            username: 1
                                        }
                                    }
                                ],
                                as: 'teacher'
                            }
                        }
                    ],
                    as: 'booking'
                }
            } as any);
        }

        // select các field
        faceData.push({
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
                },
                student: {
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
        } as any);
        aggregate.unshift({ $match: conditions } as any);

        if (filter.staff_id) {
            aggregate.push({ $unwind: '$student' });
            aggregate.unshift({
                $lookup: {
                    from: 'students',
                    localField: 'student_id',
                    foreignField: 'user_id',
                    as: 'student'
                }
            } as any);
        }

        aggregate.push({
            $facet: {
                data: faceData,
                pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
            }
        });

        aggregate.push({ $unwind: '$pagination' });
        return RegularCalendarModel.aggregate(aggregate);
    }

    public static async exportExcel(queryStudent: any): Promise<any[]> {
        const pageSize = queryStudent?.page_size || 10;
        const pageNumber = queryStudent?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditionsStudent = this.buildQueryStudent(queryStudent);
        const sort = { created_time: -1 };
        const currentDate = new Date();
        const firstDayInWeeek = new Date(
            currentDate.setDate(currentDate.getDate() - currentDate.getDay())
        ).getTime();
        const lastDayInWeeek = new Date(
            currentDate.setDate(
                currentDate.getDate() - currentDate.getDay() + 7
            )
        ).getTime();
        const firstDayInMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        );
        conditionsStudent.role = RoleCode.STUDENT;
        const lookupStudent = {
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
                    $match: queryStudent.staff_id
                },
                {
                    $lookup: {
                        from: 'student-levels',
                        let: {
                            student_level_id: '$student_level_id'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$$student_level_id', '$id']
                                    }
                                }
                            }
                        ],
                        as: 'student_levels'
                    }
                },
                {
                    $unwind: {
                        path: '$student_levels',
                        preserveNullAndEmptyArrays: true
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
                    $project: {
                        'student_levels.name': 1,
                        'staff.username': 1,
                        'staff.fullname': 1
                    }
                }
            ],
            as: 'student'
        };
        const lookupRegularTimeInfo = {
            from: 'regular-calendar',
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
                        from: 'users',
                        localField: 'teacher_id',
                        foreignField: 'id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: 'bookings',
                        let: {
                            course_id: '$course_id',
                            teacher_id: '$teacher_id',
                            student_id: '$student_id'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $and: [
                                        {
                                            $expr: {
                                                $eq: [
                                                    '$$course_id',
                                                    '$course_id'
                                                ]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    '$$teacher_id',
                                                    '$teacher_id'
                                                ]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    '$$student_id',
                                                    '$student_id'
                                                ]
                                            }
                                        }
                                    ],
                                    'calendar.start_time': {
                                        $gte: firstDayInWeeek
                                    },
                                    'calendar.end_time': {
                                        $lte: lastDayInWeeek
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'units',
                                    let: {
                                        unit_id: '$unit_id'
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$$unit_id', '$id']
                                                }
                                            }
                                        }
                                    ],
                                    as: 'unit'
                                }
                            },
                            {
                                $unwind: {
                                    path: '$unit',
                                    preserveNullAndEmptyArrays: true
                                }
                            }
                        ],
                        as: 'bookingsInWeek'
                    }
                },
                {
                    $project: {
                        id: 1,
                        course_id: 1,
                        package_id: 1,
                        communicate_tool: 1,
                        regular_start_time: 1,
                        teacher_id: 1,
                        student_id: 1,
                        status: 1,
                        course: { id: 1, name: 1, _id: 1 },
                        bookingsInWeek: {
                            memo: 1,
                            status: 1,
                            admin_unit_lock: 1,
                            is_regular_booking: 1,
                            best_memo: 1,
                            is_late: 1,
                            id: 1,
                            course_id: 1,
                            ordered_package_id: 1,
                            teacher_id: 1,
                            calendar: 1,
                            calendar_id: 1,
                            unit_id: 1,
                            unit: {
                                id: 1,
                                name: 1,
                                student_document: 1,
                                teacher_document: 1,
                                note: 1,
                                preview: 1,
                                is_active: 1,
                                audio: 1,
                                homework: 1,
                                workbook: 1
                            },
                            student_id: 1,
                            student_note: 1,
                            teacher_note: 1,
                            admin_note: 1
                        },
                        teacher: {
                            id: 1,
                            email: 1,
                            username: 1,
                            phone_number: 1,
                            first_name: 1,
                            last_name: 1,
                            full_name: 1,
                            gender: 1,
                            skype_account: 1,
                            country: 1
                        }
                    }
                }
            ],
            as: 'regular_calendar'
        };
        const lookupOrderPackage = {
            from: 'ordered-packages',
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
                    $project: {
                        package_name: 1,
                        type: 1,
                        number_class: 1,
                        activation_date: 1,
                        original_number_class: 1,
                        expired_date: {
                            $sum: [
                                '$activation_date',
                                {
                                    $multiply: ['$day_of_use', DAY_TO_MS]
                                }
                            ]
                        }
                    }
                }
            ],
            as: 'orderedPackages'
        };
        const lookupCS = {
            from: 'customer_support_student',
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
                    $project: {
                        customer_care: 1
                    }
                }
            ],
            as: 'cs_info'
        };
        const lookupCSMStudent = {
            from: 'customer_support_student',
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
                    $match: queryStudent.checking_call
                        ? {
                              'supporter.checking_call': Number(
                                  queryStudent.checking_call
                              )
                          }
                        : {}
                },
                {
                    $match: queryStudent.greeting_call
                        ? {
                              'supporter.greeting_call': Number(
                                  queryStudent.greeting_call
                              )
                          }
                        : {}
                },
                {
                    $match: queryStudent.scheduled
                        ? {
                              'supporter.scheduled': Number(
                                  queryStudent.scheduled
                              )
                          }
                        : {}
                },
                {
                    $match: queryStudent.type
                        ? {
                              'customer_care.date': {
                                  $gte: firstDayInMonth.getTime()
                              },
                              'customer_care.type': Number(queryStudent.type)
                          }
                        : {}
                },
                {
                    $match: queryStudent.customer_type
                        ? {
                              'customer_care.date': {
                                  $gte: firstDayInMonth.getTime()
                              },
                              'customer_care.customer_type': Number(
                                  queryStudent.customer_type
                              )
                          }
                        : {}
                },
                { $project: { _id: 1 } }
            ],
            as: 'customer_support_student'
        };
        const facetData: any = [
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: lookupOrderPackage
            },
            {
                $lookup: lookupCS
            },
            {
                $unwind: {
                    path: '$cs_info',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        // Nếu không query student theo staffid thì sẽ để vào facet sau khi đã limit dữ liệu
        if (!queryStudent.staff_id) {
            facetData.splice(facetData.length - 1, 0, {
                $lookup: lookupStudent
            });
            facetData.splice(facetData.length - 1, 0, {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: true }
            });
        }

        let aggregateQuery: any = [
            { $match: conditionsStudent },
            {
                $project: {
                    ...defaultUserInfo
                }
            },
            { $sort: sort },
            {
                $facet: {
                    data: facetData,
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ];

        // Nếu query student học viên có gói học là premeum,... thì filter từ ordered package
        if (queryStudent.orderedPackageType) {
            const aggregatePackage = [
                {
                    $match: {
                        type: Number(queryStudent.orderedPackageType),
                        activation_date: { $lte: Date.now() },
                        $and: [
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
                                        Date.now()
                                    ]
                                }
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$user_id'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: 'id',
                        as: 'user'
                    }
                },
                {
                    $unwind: {
                        path: '$user',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $addFields: {
                        _id: '$user._id',
                        id: '$user.id',
                        email: '$user.email',
                        username: '$user.username',
                        phone_number: '$user.phone_number',
                        full_name: '$user.full_name',
                        skype_account: '$user.skype_account',
                        zalo_id: '$user.zalo_id',
                        is_active: '$user.is_active',
                        regular_times: '$user.regular_times',
                        created_time: '$user.created_time',
                        updated_time: '$user.updated_time',
                        teacher: '$user.teacher',
                        staff: '$user.staff',
                        role: '$user.role'
                    }
                }
            ];
            aggregateQuery = aggregatePackage.concat(aggregateQuery);
        }

        // Nếu query student theo staff_id thì sẽ để vào aggregateQuery để filter dữ liệu trước khi limit trong $facet
        if (queryStudent.staff_id) {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $lookup: lookupStudent
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
            });
        }

        const checkQueryCSM =
            queryStudent.checking_call ||
            queryStudent.greeting_call ||
            queryStudent.scheduled ||
            queryStudent.type ||
            queryStudent.customer_type;
        // nếu checkQueryCSM tồn tại thì thêm query vào bảng customer_support_student để filter dữ liệu trước khi limit trong $facet
        if (checkQueryCSM) {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $lookup: lookupCSMStudent
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $unwind: {
                    path: '$customer_support_student',
                    preserveNullAndEmptyArrays: false
                }
            });
        }

        // Nếu có filter theo trạng thái auto_scheduled thì thêm query để filter dữ liệu trước khi limit trong $facet
        if (queryStudent.auto_scheduled === '1') {
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $lookup: lookupRegularTimeInfo
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $project: {
                    _id: 1,
                    is_active: 1,
                    regular_times: 1,
                    id: 1,
                    email: 1,
                    username: 1,
                    phone_number: 1,
                    first_name: 1,
                    last_name: 1,
                    full_name: 1,
                    date_of_birth: 1,
                    skype_account: 1,
                    zalo_id: 1,
                    created_time: 1,
                    updated_time: 1,
                    student: 1,
                    regular_calendar: 1,
                    size_regular_calendar: {
                        $size: { $ifNull: ['$regular_calendar', []] }
                    },
                    size_regular_time: {
                        $size: { $ifNull: ['$regular_times', []] }
                    },
                    compareTime: {
                        $gte: [
                            {
                                $size: { $ifNull: ['$regular_calendar', []] }
                            },
                            {
                                $size: { $ifNull: ['$regular_times', []] }
                            }
                        ]
                    }
                }
            });
            aggregateQuery.splice(aggregateQuery.length - 2, 0, {
                $match: {
                    size_regular_calendar: { $gt: 0 },
                    size_regular_time: { $gt: 0 },
                    compareTime: true
                }
            });
        }
        if (queryStudent.orderedPackageType) {
            return OrderedPackageModel.aggregate(aggregateQuery);
        }
        return UserModel.aggregate(aggregateQuery);
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
                    from: 'customer_support_student',
                    localField: 'id',
                    foreignField: 'supporter.staff_id',
                    as: 'cs_list_info'
                }
            }
        ];
        return AdminModel.aggregate(aggregateQuery);
    }

    public static async getDataDashboardCS(
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
                    from: 'customer_support_student',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$id', '$supporter.staff_id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'scheduled-memos',
                                let: {
                                    user_id: '$user_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    '$$user_id',
                                                    '$student_id'
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $match: {
                                            type: EnumScheduledMemoType.COURSE
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            teacher_note: 1,
                                            created_time: 1
                                        }
                                    }
                                ],

                                as: 'scheduled_memos'
                            }
                        },
                        {
                            $lookup: {
                                from: 'reports',
                                let: {
                                    user_id: '$user_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    '$$user_id',
                                                    '$report_user_id'
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $match: {
                                            level: { $exists: true }
                                        }
                                    },
                                    {
                                        $project: {
                                            type: 1,
                                            id: 1,
                                            created_time: 1,
                                            level: 1
                                        }
                                    }
                                ],

                                as: 'reports'
                            }
                        }
                    ],
                    as: 'cs_list_info'
                }
            }
        ];
        return AdminModel.aggregate(aggregateQuery);
    }

    public static async getDataDashboardCS2(
        departmentId: string
    ): Promise<any[]> {
        const aggregateQuery: any = [
            {
                $match: {
                    activation_date: { $lte: Date.now() },
                    $and: [
                        { $expr: { $gt: ['$number_class', 0] } },
                        {
                            $expr: {
                                $lt: ['$number_class', '$original_number_class']
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
                                    Date.now()
                                ]
                            }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: '$user_id'
                }
            },
            {
                $lookup: {
                    from: 'customer_support_student',
                    // localField: "_id",
                    // foreignField: "user_id",
                    let: { id: '$_id' },
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
                                from: 'scheduled-memos',
                                let: {
                                    user_id: '$user_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    '$$user_id',
                                                    '$student_id'
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $match: {
                                            type: EnumScheduledMemoType.COURSE
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            teacher_note: 1,
                                            created_time: 1
                                        }
                                    }
                                ],

                                as: 'scheduled_memos'
                            }
                        },
                        {
                            $lookup: {
                                from: 'reports',
                                let: {
                                    user_id: '$user_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: [
                                                    '$$user_id',
                                                    '$report_user_id'
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $match: {
                                            level: { $exists: true }
                                        }
                                    },
                                    {
                                        $project: {
                                            type: 1,
                                            id: 1,
                                            created_time: 1,
                                            level: 1
                                        }
                                    }
                                ],

                                as: 'reports'
                            }
                        }
                    ],
                    as: 'csm'
                }
            },
            {
                $unwind: {
                    path: '$csm',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: '$csm.supporter.staff_id',
                    cs_list_info: { $push: '$$ROOT.csm' }
                }
            },
            {
                $lookup: {
                    from: 'admins',
                    localField: '_id',
                    foreignField: 'id',
                    as: 'admin'
                }
            },
            {
                $unwind: {
                    path: '$admin',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $addFields: {
                    _id: '$admin._id',
                    id: '$admin.id',
                    email: '$admin.email',
                    is_active: '$admin.is_active',
                    username: '$admin.username',
                    fullname: '$admin.fullname',
                    phoneNumber: '$admin.phoneNumber',
                    admin: ''
                }
            }
        ];
        return OrderedPackageModel.aggregate(aggregateQuery);
    }
    public static findOne(
        filter: FilterQueryStudent,
        select_fields?: any
    ): Promise<Student | null> {
        const conditions =
            CustomerSupportManagementActions.buildQueryStudent(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve(null);
        return CustomerSupportStudentModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static findAll(
        filter: FilterQueryStudent,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<Student[]> {
        const conditions =
            CustomerSupportManagementActions.buildQueryStudent(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return CustomerSupportStudentModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static create(subject: any): Promise<Student> {
        const newModel = new CustomerSupportStudentModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(user_id: number, diff: any): Promise<any> {
        return CustomerSupportStudentModel.findOneAndUpdate(
            { user_id: user_id },
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
        return CustomerSupportStudentModel.deleteOne({ _id });
    }
}
