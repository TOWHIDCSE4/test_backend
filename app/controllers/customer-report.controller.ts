import { SuccessResponse } from '../core/ApiResponse';
import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import OrderedPackageActions from '../actions/ordered-package';
import moment from 'moment';
import UserActions from '../actions/user';
import _, { isArray } from 'lodash';
import UnitActions from '../actions/unit';
import { EnumBookingStatus } from '../models/booking';
import BookingActions from '../actions/booking';
import { OrderedPackageModel } from '../models/ordered-package';
import { DAY_TO_MS } from '../const/date-time';
import { UserModel } from '../models/user';
import { EnumOrderStatus } from '../models/order';
import { BadRequestError, InternalError } from '../core/ApiError';
import Student, {
    CustomerSupportStudentModel
} from '../models/customer-support-student';
import AdminActions from '../actions/admin';
import DepartmentActions from '../actions/department';
import { CODE_DEPARTMENT } from '../const/department';
import StudentActions from '../actions/student';
import ReportReNewActions from '../actions/report-renew';
import ReportReNew, { ReportReNewModel } from '../models/report-renew';
import StudentExtensionRequestActions from '../actions/student-extension-request';
import { EnumStudentExtensionRequestStatus } from '../models/student-extension-request';
import { userInfo } from 'os';
import TeamActions from '../actions/team';
import { EnumRole } from '../models/department';
import { RoleCode } from '../const/role';
import { EnumPackageOrderType } from '../const/package';
const unwind = require('lodash-unwind')();
const logger = require('dy-logger');

export default class CustomerReport {
    public static async attendanceReport(req: ProtectedRequest, res: Response) {
        throw new InternalError(
            req.t('errors.common.feature_under_development')
        );
        const { page_size, page_number, user_id, course_id, package_id } =
            req.query;
        const skip =
            parseInt(page_size as string) *
            (parseInt(page_number as string) - 1);
        const limit = parseInt(page_size as string);
        let packages = await OrderedPackageActions.findAllToReportPagination(
            {}
        );
        await Promise.all(
            packages.map(async (p: any) => {
                p.user = await UserActions.findOne({
                    id: p.user_id
                });
                p.uniqueBookingByCourse = _.uniqBy(p.bookings, 'course_id');
            })
        );
        packages = await unwind(packages, 'uniqueBookingByCourse');
        await Promise.all(
            packages.map(async (p: any) => {
                p.course = p.uniqueBookingByCourse.course;
                const courseBookings = p.bookings.filter(
                    (b: any) => b.course_id === p.course.id
                );
                p.course.firstBooking = _.minBy(
                    courseBookings,
                    (b) => b.calendar.start_time
                );
                p.course.total_lesson = await UnitActions.count({
                    course_id: p.course.id
                });
                p.course.total_booking_created = courseBookings.filter(
                    (b: any) =>
                        b.status === EnumBookingStatus.COMPLETED ||
                        b.status === EnumBookingStatus.STUDENT_ABSENT
                ).length;
                p.course.total_booking_completed = courseBookings.filter(
                    (b: any) => b.status === EnumBookingStatus.COMPLETED
                ).length;
            })
        );
        let data_after_filter = packages;
        if (user_id) {
            data_after_filter = data_after_filter.filter(
                (p: any) => p.user.id === parseInt(user_id as string)
            );
        }
        if (package_id) {
            data_after_filter = data_after_filter.filter(
                (p: any) => p.id === parseInt(package_id as string)
            );
        }
        if (course_id) {
            data_after_filter = data_after_filter.filter(
                (p: any) => p.course.id === parseInt(course_id as string)
            );
        }
        const res_payload = {
            data: data_after_filter.slice(skip, skip + limit),
            filter: {
                users: _.uniqBy(packages, (d: any) => d.user.id).map(
                    (p) => p.user
                ),
                courses: _.uniqBy(packages, (d: any) => d.course.id).map(
                    (p) => p.course
                ),
                packages: _.uniqBy(packages, (d: any) => d.package_name).map(
                    (p) => ({ name: p.package_name, id: p.id })
                )
            },
            pagination: {
                total: data_after_filter.length
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async bookingReport(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, min_start_time, max_end_time } =
            req.query;
        const skip =
            parseInt(page_size as string) *
            (parseInt(page_number as string) - 1);
        const limit = parseInt(page_size as string);
        let data: any = [];

        const allBookings = await BookingActions.findAll({
            min_start_time: parseInt(min_start_time + ''),
            max_end_time: parseInt(max_end_time + '') + 86400000
        });
        await Promise.all(
            allBookings.map(async (booking: any) => {
                const tmp = { ...booking.toObject() };
                tmp.day_of_booking = moment(tmp.calendar.start_time).format(
                    'DD/MM/YYYY'
                );
                data.push(tmp);
            })
        );
        // data = _.groupBy(data, 'day_of_booking')
        data = _(data)
            .groupBy('day_of_booking')
            .map(function (items, day) {
                return {
                    day_of_booking: day,
                    bookings: items
                };
            })
            .value();
        //calculate numbers
        await Promise.all(
            data.map(async (day: any) => {
                day.booking_total = day.bookings.length;
                day.booking_completed = day.bookings.filter(
                    (booking: any) =>
                        booking.status === EnumBookingStatus.COMPLETED
                ).length;
                day.booking_absent_by_teacher = day.bookings.filter(
                    (booking: any) =>
                        booking.status === EnumBookingStatus.TEACHER_ABSENT
                ).length;
                day.booking_absent_by_student = day.bookings.filter(
                    (booking: any) =>
                        booking.status === EnumBookingStatus.STUDENT_ABSENT
                ).length;
                day.booking_cancelled = day.bookings.filter(
                    (booking: any) =>
                        booking.status === EnumBookingStatus.CANCEL_BY_ADMIN ||
                        booking.status ===
                            EnumBookingStatus.CANCEL_BY_STUDENT ||
                        booking.status === EnumBookingStatus.CANCEL_BY_TEACHER
                ).length;
            })
        );
        const res_payload = {
            data: data.slice(skip, skip + limit),
            pagination: {
                total: data.length
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getNewStudentInMonth(
        req: ProtectedRequest,
        res: Response
    ) {
        //học viên mới = mua 1 order có price !== 0 và status = PAID
        const { page_size, page_number, search, month } = req.query;

        const skip =
            parseInt(page_size as string) *
            (parseInt(page_number as string) - 1);
        const limit = parseInt(page_size as string);

        // const result = await StudentActions.getNewStudentByAdmin({
        //     page_size: parseInt(page_size as string),
        //     page_number: parseInt(page_number as string),
        //     q: search as string,
        //     month: month as string
        // });

        const result = await UserModel.aggregate([
            { $sort: { created_time: -1 } },
            {
                $lookup: {
                    from: 'orders',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$user_id', '$$id'] },
                                        {
                                            $eq: [
                                                '$status',
                                                EnumOrderStatus.PAID
                                            ]
                                        },
                                        { $ne: ['$price', 0] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'orders'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$orders' }, 1] }
                }
            },
            { $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } },
            {
                $redact: {
                    $cond: [
                        {
                            $eq: [
                                { $month: '$orders.updated_time' },
                                parseInt(month as string)
                            ]
                        },
                        '$$KEEP',
                        '$$PRUNE'
                    ]
                }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ]);
        const res_payload = {
            data: [],
            pagination: {
                total: 0
            }
        };

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getStudentBirthdays(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search, day, month, status } =
            req.query;

        const temp = await UserModel.aggregate([
            {
                $project: {
                    id: 1,
                    month: {
                        $month: {
                            $dateFromString: {
                                dateString: '$date_or_birth',
                                format: '%Y/%m/%d %H:%M:%S'
                            }
                        }
                    }
                }
            }
        ]);
        // const result = await StudentActions.getAllStudentByAdmin({
        //     page_size: parseInt(page_size as string),
        //     page_number: parseInt(page_number as string),
        //     q: search as string,
        //     day: day as string,
        //     month: month as string,
        //     status: status as string
        // });
        // const users = result[0].paginatedResults;
        // await Promise.all(
        //     users.map(async (user: any) => {
        //         user.packages = await OrderedPackageActions.findAll({
        //             user_id: user.id
        //         });
        //         user.student_detail = await StudentActions.findOne(
        //             { user_id: user.id },
        //             {
        //                 user_id: -1,
        //                 staff_id: -1,
        //                 email: -1,
        //                 phone_number: -1,
        //                 skype_account: -1
        //             }
        //         );
        //     })
        // );
        // const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: [],
            pagination: {
                total: 0
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getExpireSoonClass(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            search_user,
            number_lesson_left,
            min_start_time,
            max_end_time,
            staff_id,
            number_class_greater,
            exprire,
            type
        } = req.query;
        const skip =
            parseInt(page_size as string) *
            (parseInt(page_number as string) - 1);
        const limit = parseInt(page_size as string);
        let match = {
            original_number_class: {
                $gte: Number(number_class_greater)
            }
        } as any;

        if (number_lesson_left) {
            match['number_class'] = {
                $lte: parseInt(number_lesson_left as string)
            };
        }

        if (min_start_time && max_end_time) {
            match['expired_date'] = {
                $gte: parseInt(min_start_time as string),
                $lte: parseInt(max_end_time as string)
            };
        }
        if (exprire) {
            if (Number(exprire) === 1) {
                match['expired_date'] = {
                    $gte: moment().valueOf()
                };
            }
            if (Number(exprire) === 2) {
                match['expired_date'] = {
                    $lte: moment().valueOf()
                };
            }
        }

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
        if (filterStaff && filterStaff.length > 0) {
            if (staff_id) {
                if (
                    filterStaff.includes(Number(staff_id)) &&
                    Number(staff_id) != -1
                ) {
                    match['studentObj.staff_id'] = Number(staff_id);
                } else {
                    match['studentObj.staff_id'] = -2;
                }
            } else {
                match['studentObj.staff_id'] = { $in: filterStaff };
            }
        } else if (
            req.user.username == 'admin' ||
            req.user.department.isRole == EnumRole.Manager ||
            req.user.department.isRole == EnumRole.Deputy_manager
        ) {
            if (staff_id) {
                if (Number(staff_id) != -1) {
                    match['studentObj.staff_id'] = Number(staff_id);
                } else {
                    match['studentObj.staff_id'] = null;
                }
            }
        }
        const aggregate: any = [
            { $sort: { created_time: -1 } },
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
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'user_id',
                    foreignField: 'user_id',
                    as: 'studentObj'
                }
            },
            {
                $unwind: '$studentObj'
            },
            {
                $match: match
            },
            {
                $match: {
                    'student.full_name': {
                        $regex:
                            search_user && _.isString(search_user)
                                ? '.*' + _.escapeRegExp(search_user) + '.*'
                                : '',
                        $options: 'i'
                    }
                }
            }
        ];
        if (type) {
            if (isArray(type)) {
                aggregate.unshift({
                    $match: {
                        type: { $in: type.map((e) => Number(e)) }
                    }
                });
            } else {
                aggregate.unshift({
                    $match: {
                        type: Number(type)
                    }
                });
            }
        }
        aggregate.push({
            $facet: {
                result: [{ $skip: skip }, { $limit: limit }],
                total: [{ $count: 'count' }]
            }
        });

        const temp = await OrderedPackageModel.aggregate(aggregate);
        const res_payload = {
            data: temp[0].result,
            pagination: {
                total: temp[0]?.total[0]?.count || 0
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async exportExpireSoonClass(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            exprire,
            search_user,
            number_lesson_left,
            min_start_time,
            max_end_time,
            staff_id,
            number_class_greater,
            type
        } = req.query;

        let match = {
            original_number_class: {
                $gte: Number(number_class_greater)
            }
        } as any;

        if (number_lesson_left) {
            match['number_class'] = {
                $lte: parseInt(number_lesson_left as string)
            };
        }

        if (min_start_time && max_end_time) {
            match['expired_date'] = {
                $gte: parseInt(min_start_time as string),
                $lte: parseInt(max_end_time as string)
            };
        }
        if (exprire) {
            if (Number(exprire) === 1) {
                match['expired_date'] = {
                    $gte: moment().valueOf()
                };
            }
            if (Number(exprire) === 2) {
                match['expired_date'] = {
                    $lte: moment().valueOf()
                };
            }
        }

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
        if (filterStaff && filterStaff.length > 0) {
            if (staff_id) {
                if (
                    filterStaff.includes(Number(staff_id)) &&
                    Number(staff_id) != -1
                ) {
                    match['studentObj.staff_id'] = Number(staff_id);
                } else {
                    match['studentObj.staff_id'] = -2;
                }
            } else {
                match['studentObj.staff_id'] = { $in: filterStaff };
            }
        } else if (
            req.user.username == 'admin' ||
            req.user.department.isRole == EnumRole.Manager ||
            req.user.department.isRole == EnumRole.Deputy_manager
        ) {
            if (staff_id) {
                if (Number(staff_id) != -1) {
                    match['studentObj.staff_id'] = Number(staff_id);
                } else {
                    match['studentObj.staff_id'] = null;
                }
            }
        }

        const aggregate: any = [
            { $sort: { created_time: -1 } },
            {
                $project: {
                    id: 1,
                    type: 1,
                    package_name: 1,
                    user_id: 1,
                    number_class: 1,
                    day_of_use: 1,
                    original_number_class: 1,
                    paid_number_class: 1,
                    activation_date: 1,
                    expired_date: {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    created_time: 1
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $match: {
                    'student.full_name': {
                        $regex: search_user ? '.*' + search_user + '.*' : '',
                        $options: 'i'
                    }
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'user_id',
                    foreignField: 'user_id',
                    as: 'studentObj'
                }
            },
            {
                $unwind: '$studentObj'
            },
            {
                $match: match
            }
        ];
        if (type) {
            if (isArray(type)) {
                aggregate.unshift({
                    $match: {
                        type: { $in: type.map((e) => Number(e)) }
                    }
                });
            } else {
                aggregate.unshift({
                    $match: {
                        type: Number(type)
                    }
                });
            }
        }
        const temp = await OrderedPackageModel.aggregate(aggregate);
        const res_payload = {
            data: temp
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getReNew(req: ProtectedRequest, res: Response) {
        const { time } = req.query;
        if (!time) {
            throw new BadRequestError();
        }
        let start_time = moment(Number(time)).startOf('month').add(1, 'day');
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
        const filter: any = {
            date: start_time.valueOf()
        };
        if (filterStaff.length) {
            filter.staff_id = { $in: filterStaff };
        }
        const data = await ReportReNewActions.findAll(filter);
        const grouped = _.groupBy(data, (e) => e.staff_id);
        const resData = [];

        const teams = await TeamActions.findAll({
            filter: {
                department: csDepartment._id
            }
        });

        for (const key in grouped) {
            if (Object.prototype.hasOwnProperty.call(grouped, key)) {
                const element = grouped[key];
                const staff = {
                    staff_id: element[0].staff_id,
                    staff_name: element[0].staff_name
                };

                let totalRenew = element.reduce(
                    (total, e) => total + e.students_renew.length,
                    0
                );

                let totalExtend = element.reduce(
                    (total, e) => total + e.students_extend.length,
                    0
                );

                let totalExprire = element[0]?.students_exprire?.length || 0;

                let totalRevenueRenew = element.reduce(
                    (total, e) => total + e.total_revenue_renew,
                    0
                );
                let totalRevenueExtend = element.reduce(
                    (total, e) => total + e.total_revenue_extend,
                    0
                );
                let totalRevenue = totalRevenueRenew + totalRevenueExtend;
                let teamName = '';
                const isInATeam = teams.find(
                    (e) =>
                        e.leader?.id === staff.staff_id ||
                        e.members?.find((e2) => e2.id === staff.staff_id)
                );
                if (isInATeam) {
                    teamName = isInATeam.name;
                }

                const temp = {
                    ...staff,
                    team: teamName,
                    totalRenew,
                    totalExprire,
                    totalExtend,
                    totalRevenueExtend,
                    totalRevenueRenew,
                    totalRevenue,
                    child: element
                };
                resData.push(temp);
            }
        }
        resData.sort((a, b) => {
            if (a.team < b.team) {
                return 1;
            }
            if (a.team > b.team) {
                return -1;
            }
            return 0;
        });

        const res_payload = {
            data: resData
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async caculateReNew(time: number) {
        const startTime = moment(time).startOf('month').add(1, 'day');
        const endTime = moment(time).endOf('month').add(1, 'day');
        console.log('caculate renew for ', moment(time).format('MM/YYYY'));
        const csDepartment = await DepartmentActions.findOne({
            filter: {
                unsignedName: CODE_DEPARTMENT.CSKH
            }
        });
        if (!csDepartment) {
            throw new Error('Department not found');
        }
        const listCs = await AdminActions.findAll({
            'department.department': csDepartment._id
        });
        for (const iterator of listCs) {
            let report = await ReportReNewActions.findOne({
                date: startTime.valueOf(),
                staff_id: iterator.id
            });

            const listStudent = await StudentActions.findAll({
                staff_id: String(iterator.id)
            });
            const listStudentRenew: any = [];
            const listStudentExprire: any = [];
            const listStudentExtend: any = [];
            const minTotalBill = 2500000;
            await Promise.all(
                listStudent.map(async (e) => {
                    const student = await UserActions.findOne({
                        id: e.user_id
                    });
                    const hasOldPackage = await OrderedPackageActions.findOne({
                        user_id: e.user_id,
                        created_time: { $lt: startTime.toDate() },
                        original_number_class: { $gte: 25 }
                    });
                    // caculate revenue tháng
                    if (hasOldPackage) {
                        let revenueRenew = 0;
                        const listOrderedPackage: any = [];

                        const listNewPackage =
                            await OrderedPackageActions.findAll({
                                user_id: e.user_id,
                                activation_date: {
                                    $gte: startTime.valueOf(),
                                    $lt: endTime.valueOf()
                                },
                                original_number_class: { $gte: 25 }
                            });
                        const listOrder: any = [];
                        listNewPackage.forEach((iterator2) => {
                            if (iterator2.order.total_bill > minTotalBill) {
                                if (!listOrder.includes(iterator2.order_id)) {
                                    listOrder.push(iterator2.order_id);
                                    revenueRenew += iterator2.order.total_bill;
                                }

                                listOrderedPackage.push({
                                    id: iterator2.id,
                                    package_name: iterator2.package_name,
                                    order: iterator2.order
                                });
                            }
                        });
                        if (revenueRenew) {
                            const index = listStudentRenew.findIndex(
                                (s: any) => s.user_id === e.user_id
                            );
                            if (index === -1) {
                                listStudentRenew.push({
                                    user_id: e.user_id,
                                    student_name: student?.full_name,
                                    student_username: student?.username,
                                    revenue_renew: revenueRenew,
                                    list_ordered_package: listOrderedPackage
                                });
                            } else {
                                listStudentRenew[index].revenue_renew +=
                                    revenueRenew;
                                listStudentRenew[index].list_ordered_package =
                                    listStudentRenew[
                                        index
                                    ].list_ordered_package.concat(
                                        listOrderedPackage
                                    );
                            }
                        }
                    }

                    // caculate số gói hết hạn trong tháng
                    if (!report) {
                        const listOldPackage =
                            await OrderedPackageActions.findAll({
                                user_id: e.user_id,
                                created_time: { $lt: startTime.toDate() },
                                original_number_class: { $gte: 25 },
                                activation_date: { $exists: true }
                            });
                        const tempExprirePackage = [];
                        for (const iterator2 of listOldPackage) {
                            if (
                                iterator2.activation_date &&
                                moment(iterator2.activation_date).valueOf() <
                                    moment(time).valueOf() &&
                                iterator2.order.total_bill > minTotalBill
                            ) {
                                const expired_date = moment(
                                    iterator2.activation_date
                                ).add(iterator2.day_of_use, 'day');

                                if (
                                    expired_date.valueOf() >=
                                        startTime.valueOf() &&
                                    expired_date.valueOf() <= endTime.valueOf()
                                ) {
                                    const hasExtend =
                                        await StudentExtensionRequestActions.findOne(
                                            {
                                                ordered_package_id:
                                                    iterator2.id,
                                                status: EnumStudentExtensionRequestStatus.APPROVED
                                            }
                                        );
                                    if (!hasExtend) {
                                        tempExprirePackage.push({
                                            expired_date:
                                                expired_date.valueOf(),
                                            ordered_package_id: iterator2.id,
                                            order_id: iterator2.order_id,
                                            package_name: iterator2.package_name
                                        });
                                    }
                                }
                            }
                        }
                        if (tempExprirePackage.length) {
                            tempExprirePackage.sort(
                                (a, b) => b.expired_date - a.expired_date
                            );
                            listStudentExprire.push({
                                user_id: e.user_id,
                                student_name: student?.full_name,
                                student_username: student?.username,
                                package: tempExprirePackage
                            });
                        }
                    }

                    // caculate số gói extend trong tháng
                    const listExtensRequest =
                        await StudentExtensionRequestActions.findAll({
                            student_id: e.user_id,
                            created_time: {
                                $gte: startTime.toDate(),
                                $lt: endTime.toDate()
                            },
                            status: EnumStudentExtensionRequestStatus.APPROVED
                        });
                    if (listExtensRequest.length) {
                        listStudentExtend.push({
                            user_id: e.user_id,
                            student_name: student?.full_name,
                            student_username: student?.username,
                            revenue_extend:
                                Number(
                                    listExtensRequest.reduce(
                                        (total: number, e: any) =>
                                            total + e.price,
                                        0
                                    )
                                ) || 0,
                            list: listExtensRequest.map((iterator2: any) => ({
                                id: iterator2.id,
                                ordered_package_id:
                                    iterator2.ordered_package.id,
                                package_name:
                                    iterator2.ordered_package.package_name,
                                student_note: iterator2.student_note,
                                admin_note: iterator2.admin_note,
                                price: iterator2.price
                            }))
                        });
                    }
                })
            );

            const data = {
                date: startTime.valueOf(),
                staff_id: iterator.id,
                staff_name: iterator.fullname,
                students_renew: listStudentRenew || [],
                total_revenue_renew:
                    Number(
                        listStudentRenew.reduce(
                            (total: number, e: any) => total + e.revenue_renew,
                            0
                        )
                    ) || 0,
                students_extend: listStudentExtend || [],
                total_revenue_extend:
                    Number(
                        listStudentExtend.reduce(
                            (total: number, e: any) => total + e.revenue_extend,
                            0
                        )
                    ) || 0,
                students_exprire: report
                    ? report.students_exprire
                    : listStudentExprire || []
            };
            if (!report) {
                report = await ReportReNewActions.create(data as ReportReNew);
            } else {
                report = await ReportReNewActions.update(
                    report._id,
                    data as ReportReNew
                );
            }
        }
    }

    public static async caculateReNewByCronjob(
        req: ProtectedRequest,
        res: Response
    ) {
        await CustomerReport.caculateReNew(
            moment().subtract(1, 'day').valueOf()
        );
        return new SuccessResponse('success', '').send(res, req);
    }

    public static async caculateReNewByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const time = req.body.time;
        if (!time) {
            throw new BadRequestError();
        }
        await CustomerReport.caculateReNew(moment(time).valueOf());
        return new SuccessResponse('success', '').send(res, req);
    }

    public static async removeReportRenewInMonth(
        req: ProtectedRequest,
        res: Response
    ) {
        try {
            logger.info('removeReportRenewInMonth >>>');
            const startTime = moment().startOf('month').add(1, 'day');
            logger.info(
                `removeReportRenewInMonth, startTime.valueOf(): ${startTime.valueOf()}`
            );
            const csDepartment = await DepartmentActions.findOne({
                filter: {
                    unsignedName: CODE_DEPARTMENT.CSKH
                }
            });
            if (!csDepartment) {
                throw new Error('Department not found');
            }
            const listCs = await AdminActions.findAll({
                'department.department': csDepartment._id
            });
            for (const iterator of listCs) {
                logger.info(
                    `removeReportRenewInMonth, staff_id: ${iterator.id}`
                );
                await ReportReNewModel.deleteOne({
                    date: startTime.valueOf(),
                    staff_id: iterator.id
                });
            }

            logger.info('removeReportRenewInMonth <<<');
            return new SuccessResponse('success', '').send(res, req);
        } catch (error) {
            logger.error('removeReportRenewInMonth, Error: ', error);
            throw error;
        }
    }

    public static async getListExpiredStudentNotRenew(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            search_user,
            min_start_time,
            max_end_time,
            number_class
        } = req.query;
        const skip =
            parseInt(page_size as string) *
            (parseInt(page_number as string) - 1);
        const limit = parseInt(page_size as string);
        const match = {
            role: RoleCode.STUDENT,
            is_active: true
        } as any;

        if (min_start_time && max_end_time) {
            match['ordered_package.expired_date'] = {
                $gte: parseInt(min_start_time as string),
                $lte: parseInt(max_end_time as string)
            };
        }
        if (search_user) {
            match.$or = [
                {
                    full_name: {
                        $regex: search_user ? '.*' + search_user + '.*' : '',
                        $options: 'i'
                    }
                },
                {
                    username: {
                        $regex: search_user ? '.*' + search_user + '.*' : '',
                        $options: 'i'
                    }
                }
            ];
        }
        console.log(JSON.stringify(match));
        const aggregate: any = [
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$id']
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
                        },
                        {
                            $match: {
                                activation_date: {
                                    $gt: 0
                                },
                                original_number_class: {
                                    $gte: 25
                                }
                            }
                        },
                        {
                            $project: {
                                id: 1,
                                package_id: 1,
                                type: 1,
                                user_id: 1,
                                number_class: 1,
                                day_of_use: 1,
                                original_number_class: 1,
                                paid_number_class: 1,
                                activation_date: 1,
                                created_time: 1
                            }
                        },
                        {
                            $limit: 1
                        }
                    ],
                    as: 'ordered_package_check'
                }
            },
            {
                $match: {
                    $expr: {
                        $eq: [
                            {
                                $size: '$ordered_package_check'
                            },
                            1
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        id: '$id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: {
                                            $eq: ['$user_id', '$$id']
                                        }
                                    },
                                    {
                                        activation_date: {
                                            $gt: 0
                                        }
                                    }
                                ]
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
                                alerted: 1,
                                expired_date: {
                                    $sum: [
                                        '$activation_date',
                                        {
                                            $multiply: ['$day_of_use', 86400000]
                                        }
                                    ]
                                },
                                created_time: 1
                            }
                        },
                        {
                            $sort: { expired_date: -1 }
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
                            $match: {
                                status: EnumBookingStatus.CONFIRMED
                            }
                        },
                        { $sort: { 'calendar.start_time': -1 } },
                        { $limit: 1 }
                    ],
                    as: 'booking_upcoming'
                }
            },
            {
                $match: {
                    $expr: {
                        $eq: [
                            {
                                $size: '$booking_upcoming'
                            },
                            0
                        ]
                    }
                }
            }
        ];
        if (number_class) {
            const numberClass = parseInt(number_class as string);
            aggregate.push(
                {
                    $lookup: {
                        from: 'ordered-packages',
                        let: {
                            id: '$id'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $and: [
                                        {
                                            $expr: {
                                                $eq: ['$user_id', '$$id']
                                            }
                                        },
                                        {
                                            activation_date: {
                                                $gt: 0
                                            }
                                        },
                                        {
                                            number_class: {
                                                $gt: numberClass
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                $project: {
                                    id: 1,
                                    type: 1,
                                    user_id: 1
                                }
                            },
                            {
                                $limit: 1
                            }
                        ],
                        as: 'ordered_package_filter'
                    }
                },
                {
                    $match: {
                        $expr: {
                            $eq: [
                                {
                                    $size: '$ordered_package_filter'
                                },
                                0
                            ]
                        }
                    }
                }
            );
        }
        aggregate.push({
            $match: match
        });
        aggregate.push({
            $facet: {
                data: [
                    { $sort: { 'ordered_package.expired_date': 1 } },
                    { $skip: skip },
                    { $limit: limit }
                ],
                pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
            }
        });
        const res_payload = {
            data: null,
            pagination: null
        };
        const resultData = await UserModel.aggregate(aggregate);
        if (resultData && resultData.length > 0) {
            res_payload.data = resultData[0].data;
            res_payload.pagination = resultData[0].pagination;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}

async function caculateReNewMonth() {
    const month = 12;
    const time = moment()
        .set('month', month - 1)
        .startOf('month');
    await CustomerReport.caculateReNew(time.valueOf());
}
// caculateReNewMonth();
