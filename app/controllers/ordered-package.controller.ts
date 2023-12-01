import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import config from 'config';
import _, { isInteger, isString } from 'lodash';
import moment from 'moment';
import { SuccessResponse } from './../core/ApiResponse';
import AdminActions from '../actions/admin';
import BookingActions from '../actions/booking';
import OrderedPackageActions from '../actions/ordered-package';
import CounterActions from '../actions/counter';
import RegularCalendarActions from '../actions/regular-calendar';
import TemplateActions from '../actions/template';
import UserActions from '../actions/user';
import Order from '../models/order';
import OrderedPackage, { EnumDisplay } from '../models/ordered-package';
import Package, { EnumFrequencyType } from '../models/package';
import User from '../models/user';
import { DAY_TO_MS } from '../const/date-time';
import { EmailTemplate } from '../const/notification';
import { BackEndNotification, ZaloOANotification } from '../const/notification';
import {
    NUMBER_CLASS_LEFT_TO_NOTIFY_USER,
    PIVOT_DAYS_ORDERED_PACKAGE_WILL_EXPIRE,
    VARIABLE_CONDITION_NUMBER_CLASS_OF_PACKAGE_MAIN
} from '../const/order';
import { EnumAlertType, EnumPackageOrderType } from '../const/package';
import JobQueueServices from '../services/job-queue';
import * as natsClient from '../services/nats/nats-client';
import { LOCATION_ID_ASIAN } from '../const';
import { LOCATION_ID_VIETNAM } from '../const';
import CsCallManagementController from './cs-call-management.controller';
import Booking, { EnumBookingStatus } from '../models/booking';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import OperationIssueActions from '../actions/operation-issue';
import { DepartmentModel, EnumRole } from '../models/department';
import { CODE_DEPARTMENT } from '../const/department';
import { AdminModel } from '../models/admin';
import { StudentModel } from '../models/student';

const logger = require('dy-logger');

const WEBAPP_URL = config.get('server.webapp_url');

export default class OrderedPackageController {
    /*
     * Summary: Admin getting all ordered-packages
     * Request type: GET
     */
    public static async getOrderedPackagesOfAnUser(
        req: ProtectedRequest,
        res: Response,
        user_id: number
    ) {
        const {
            page_size,
            page_number,
            order_id,
            type,
            activated,
            expired,
            expired_x_days_ago,
            finished,
            search,
            teacher_location_id,
            gte_number_class
        } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            order_id: order_id ? parseInt(order_id as string) : 0,
            user_id,
            search: search ? (search as string) : null
        };
        if (type) {
            if (Array.isArray(type)) {
                filter.type = type;
            } else {
                filter.type = [parseInt(type as string)];
            }
        }
        if (activated === 'true') {
            filter.activation_date = { $lte: new Date().getTime() };
        } else if (activated === 'false') {
            filter.activation_date = { $gt: new Date().getTime() };
        }
        if (expired === 'true') {
            filter.is_expired = true;
        } else if (expired === 'false') {
            filter.is_expired = false;
        }
        if (isString(expired_x_days_ago)) {
            // cho phep admin gia han goi da het han truoc do x days.
            filter.expired_date_after = moment()
                .subtract(parseInt(expired_x_days_ago), 'days')
                .valueOf();
        }
        if (finished === 'true') {
            filter.number_class = 0;
        } else if (finished === 'false') {
            filter.number_class = { $gt: 0 };
        }
        if (teacher_location_id) {
            const temp = Number(teacher_location_id);
            // lọc gói học theo giáo viên. giáo viên việt thì có thể dạy gói học vn và châu á
            if (temp === LOCATION_ID_VIETNAM) {
                filter.location_ids = [LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN];
            } else {
                filter.location_id = temp;
            }
        }
        if (isInteger(gte_number_class)) {
            filter.gte_number_class = gte_number_class;
        } else if (isString(gte_number_class)) {
            filter.gte_number_class = parseInt(gte_number_class);
        }

        const packages = await OrderedPackageActions.findAllAndPaginated(
            filter
        );
        const count = await OrderedPackageActions.count(filter);
        const res_payload = {
            data: packages,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllOrderedPackagesByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        await OrderedPackageController.getOrderedPackagesOfAnUser(
            req,
            res,
            req.user.id
        );
    }

    public static async getAllOrderedPackagesOfAnUserByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id } = req.params;
        await OrderedPackageController.getOrderedPackagesOfAnUser(
            req,
            res,
            parseInt(user_id as string)
        );
    }

    public static async getCountActiveOrderedPackagesWithTypeOfAStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        let user_id = 0;
        if (req.user && req.user.isAdmin) {
            if (req.params.user_id) {
                user_id = parseInt(req.params.user_id as string);
            }
            if (!user_id) {
                user_id = 0;
            }
        } else if (req.user) {
            user_id = req.user.id;
        }
        const filter_premium = {
            user_id,
            type: EnumPackageOrderType.PREMIUM,
            number_class: { $gt: 0 },
            is_expired: false
        };
        const filter_standard = {
            user_id,
            type: EnumPackageOrderType.STANDARD,
            number_class: { $gt: 0 },
            is_expired: false
        };
        const count_premium = await OrderedPackageActions.count(filter_premium);
        const count_standard = await OrderedPackageActions.count(
            filter_standard
        );
        const res_payload = {
            count: {
                count_premium,
                count_standard
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /**
     * @description Get detail of 1 ordered package
     * @urlParam ordered_package_id <number> - ID of the ordered package
     * @returns SuccessResponse of the ordered package or an empty response
     */
    public static async getDetailOrderedPackage(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_package_id } = req.params;
        const filter: any = {
            id: parseInt(ordered_package_id as string)
        };
        if (req.user) {
            filter.user_id = req.user.id;
        }
        const pack = await OrderedPackageActions.findOne(filter);
        if (pack) {
            return new SuccessResponse(req.t('common.success'), pack).send(
                res,
                req
            );
        } else {
            return new SuccessResponse(req.t('common.success'), {}).send(
                res,
                req
            );
        }
    }

    public static async getOrderedPackageById(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_package_id } = req.params;
        const filter: any = {
            id: parseInt(ordered_package_id as string)
        };
        const pack = await OrderedPackageActions.findOne(filter);
        if (pack) {
            return new SuccessResponse(req.t('common.success'), pack).send(
                res,
                req
            );
        } else {
            return new SuccessResponse(req.t('common.success'), {}).send(
                res,
                req
            );
        }
    }

    public static async getAllActiveOrderedPackagesOfStudent(
        user_id: number
    ): Promise<Set<number>> {
        const filter = {
            user_id,
            number_class: { $gt: 0 },
            is_expired: false
        };
        const packages = await OrderedPackageActions.findAll(filter, {
            package_id: 1
        });
        const package_id_list = new Set<number>();
        for (const pack of packages) {
            package_id_list.add(pack.package_id);
        }
        return package_id_list;
    }

    public static async getActiveOrderedPackagesOfStudentByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        req.query.activated = 'true';
        req.query.expired = req.query.expired ?? 'false';
        req.query.finished = req.query.finished ?? 'false';
        await OrderedPackageController.getOrderedPackagesOfAnUser(
            req,
            res,
            parseInt(student_id as string)
        );
    }

    public static async getActiveOrderedPackagesOfStudentByThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        req.query.activated = 'true';
        req.query.expired = 'false';
        req.query.finished = 'false';
        await OrderedPackageController.getOrderedPackagesOfAnUser(
            req,
            res,
            req.user.id
        );
    }

    /*
     * Summary: Create an ordered package when users create an order
     */
    public static async createOrderedPackage(
        req: ProtectedRequest,
        order: Order,
        pack: Package,
        activation_date?: number,
        paid_number_class?: number
    ) {
        const counter = await CounterActions.findOne();
        const id = counter.ordered_package_id;
        const new_ordered_package = {
            id,
            package_id: pack.id,
            package_name: pack.name,
            type: pack.type,
            user_id: order.user_id,
            order_id: order.id,
            number_class: pack.number_class,
            paid_number_class,
            day_of_use: pack.day_of_use,
            original_number_class: pack.number_class,
            activation_date,
            order,
            ispeak_order_id: req.body?.ispeak_order_id
        };

        if (pack.type == EnumPackageOrderType.TRIAL) {
            const { number_class } = req.body;
            new_ordered_package.number_class =
                number_class || pack.number_class;
            new_ordered_package.original_number_class =
                number_class || pack.number_class;
        }
        await OrderedPackageActions.create(
            new_ordered_package as OrderedPackage
        );
        if (
            pack.number_class >= 20 &&
            activation_date &&
            activation_date <= new Date().getTime()
        ) {
            // Notify
            const user = await UserActions.findOne({ id: order.user_id });
            if (user) {
                const dataPayload = {
                    student_name: user.full_name,
                    student_username: user.username,
                    student_id: user.id,
                    package_name: pack.name,
                    activation_date:
                        moment(activation_date).format('DD/MM/YYYY'),
                    exprire_date: moment(activation_date)
                        .add(pack.day_of_use, 'day')
                        .format('DD/MM/YYYY'),
                    number_class: pack.number_class
                };

                await natsClient.publishEventZalo(
                    user,
                    ZaloOANotification.ACTIVE_PACKAGE,
                    dataPayload
                );
            }
        }

        return new_ordered_package;
    }

    /*
     * Summary: Admin edit an ordered package activation date
     */
    public static async editOrderedPackage(
        req: ProtectedRequest,
        pack: OrderedPackage,
        activation_date?: number,
        paid_number_class?: number
    ) {
        if (activation_date == undefined && paid_number_class == undefined) {
            return true;
        }
        if (activation_date) {
            const ordered_package_check = await OrderedPackageActions.findOne({
                id: pack.id
            });
            const current_moment = new Date().getTime();
            if (
                ordered_package_check &&
                !ordered_package_check.activation_date &&
                pack.type != EnumPackageOrderType.TRIAL &&
                activation_date <= new Date().getTime()
            ) {
                CsCallManagementController.createGreetingCall(
                    ordered_package_check.user_id,
                    ordered_package_check.id,
                    activation_date
                );
            }
        }
        const diff = {
            activation_date: activation_date
                ? activation_date
                : pack.activation_date,
            paid_number_class:
                paid_number_class || paid_number_class == 0
                    ? paid_number_class
                    : pack.paid_number_class
        };
        await OrderedPackageActions.update(pack._id, {
            ...diff
        } as OrderedPackage);
        if (
            pack.number_class >= 20 &&
            activation_date &&
            activation_date <= new Date().getTime()
        ) {
            // Notify
            const user = await UserActions.findOne({ id: pack.user_id });
            if (user) {
                const dataPayload = {
                    student_name: user.full_name,
                    student_username: user.username,
                    student_id: user.id,
                    package_name: pack.package_name,
                    activation_date:
                        moment(activation_date).format('DD/MM/YYYY'),
                    exprire_date: moment(activation_date)
                        .add(pack.day_of_use, 'day')
                        .format('DD/MM/YYYY'),
                    number_class: pack.number_class
                };

                await natsClient.publishEventZalo(
                    user,
                    ZaloOANotification.ACTIVE_PACKAGE,
                    dataPayload
                );
            }
        }
        return true;
    }

    /**
     * @description Decrease or increase number_class of a ordered package,
     *              the number of new bookings in a ordered-package that
     *              student can create
     * @param pack The ordered package that we want to increase or decrease
     * @param learn true if we want to decrease, false if we want to increase
     */
    public static async learnALessonInOrderedPackage(
        booking: Booking,
        pack: OrderedPackage,
        student: User,
        learn: boolean,
        flagNotify: boolean
    ) {
        if (!pack.activation_date) return;
        let number_class = pack.number_class;
        const history = pack.history || [];

        if (learn) {
            if (number_class <= 0) return;
            number_class--;
            history.push({
                time: new Date(),
                booking_id: booking.id,
                booking_status: booking.status,
                old_number_class: number_class + 1,
                new_number_class: number_class
            });

            if (
                flagNotify &&
                number_class == NUMBER_CLASS_LEFT_TO_NOTIFY_USER &&
                pack.original_number_class >=
                    VARIABLE_CONDITION_NUMBER_CLASS_OF_PACKAGE_MAIN
            ) {
                const total_class = pack.paid_number_class
                    ? pack.paid_number_class
                    : pack.original_number_class;
                const payload = {
                    student_name: student.full_name,
                    package_name: pack.package_name,
                    original_number_class: total_class,
                    booked_class_number: total_class - number_class,
                    number_class_left: number_class,
                    repack_link: `${WEBAPP_URL}/student/upgrade`
                };

                const notification_template = await TemplateActions.findOne({
                    code: BackEndNotification.STUDENT_ORDER_NEARLY_OUT_OF_CLASS
                });
                if (notification_template) {
                    await natsClient.publishEventWithTemplate({
                        template: notification_template.content,
                        data: payload,
                        receiver: student.id,
                        template_obj_id: notification_template._id
                    });
                }

                const email_template = await TemplateActions.findOne({
                    code: EmailTemplate.STUDENT_ORDER_NEARLY_OUT_OF_CLASS
                });
                if (email_template && student.is_verified_email === true && student.is_enable_receive_mail) {
                    JobQueueServices.sendMailWithTemplate({
                        to: student.email,
                        subject: email_template.title,
                        body: email_template.content,
                        data: payload
                    });
                }
            }
        } else {
            number_class++;
            history.push({
                time: new Date(),
                booking_id: booking.id,
                booking_status: booking.status,
                old_number_class: number_class - 1,
                new_number_class: number_class
            });
        }
        await OrderedPackageActions.update(pack._id, {
            number_class,
            history
        } as OrderedPackage);
    }

    /**
     * @description Decrease or increase day_of_use of a ordered package,
     *              the number of days in a ordered-package, since
     *              activation_date that student can still use the package
     * @param pack The ordered package that we want to increase or decrease
     * @param number_of_days: Number of days that we want to increase/decrease
     * @param extend true if we want to increase, false if we want to decrease
     */
    public static async extendAnOrderedPackage(
        pack: OrderedPackage,
        number_of_days: number,
        extend: boolean
    ) {
        let day_of_use = pack.day_of_use;
        if (extend) {
            const time_active = pack?.activation_date ?? 0;
            const expired_time_current =
                time_active + pack?.day_of_use * DAY_TO_MS;
            const current_time = new Date().getTime();
            if (expired_time_current < current_time) {
                // TH time hết hạn < time hiện tại: việc gia hạn được tính từ time hiện tại.
                const new_expired_moment = moment()
                    .add(number_of_days, 'days')
                    .valueOf();
                day_of_use = Math.round(
                    (new_expired_moment - time_active) / DAY_TO_MS
                );
            } else {
                // TH time hết hạn >= time hiện tại: Việc gia hạn được tính từ ngày hết hạn của gói học.
                day_of_use = pack?.day_of_use + number_of_days;
            }
        } else {
            day_of_use -= number_of_days;
            if (day_of_use < 0) {
                day_of_use = 0;
            }
        }
        if (pack.number_class > 0 && pack.activation_date) {
            /**
             * day_of_use has changed, update the expired regular calendar
             * or expire the active regular calendar
             */
            const current_moment = new Date().getTime();
            await RegularCalendarActions.expireRegularCalendar(
                pack.user_id,
                pack.id,
                pack.activation_date + day_of_use * DAY_TO_MS < current_moment
            );
        }
        await OrderedPackageActions.update(pack._id, {
            day_of_use
        } as OrderedPackage);
    }

    public static async getOrderedPackagesWillExpire(
        req: ProtectedRequest,
        res: Response
    ) {
        const endTimeFilter = moment()
            .add(PIVOT_DAYS_ORDERED_PACKAGE_WILL_EXPIRE, 'days')
            .valueOf();
        const startTimeFilter = moment()
            .add(PIVOT_DAYS_ORDERED_PACKAGE_WILL_EXPIRE, 'days')
            .subtract(2, 'hour')
            .valueOf();
        const filter = {
            activation_date: {
                $lte: moment().valueOf()
            },
            will_expire: {
                $lte: endTimeFilter,
                $gt: startTimeFilter
            },
            number_class: { $gt: 0 },
            original_number_class: { $gte: 25 },
            alerted: [
                {
                    alerted: {
                        $nin: [EnumAlertType.WILL_EXPIRED_BY_NOTIFICATION]
                    }
                },
                { alerted: { $nin: [EnumAlertType.WILL_EXPIRED_BY_EMAIL] } }
            ]
        };
        const orderedPackages = await OrderedPackageActions.findAll(filter);
        await Promise.all(
            orderedPackages.map(async (item) => {
                const newAlert = item?.alerted ? item.alerted : [];
                const notification_template = await TemplateActions.findOne({
                    code: BackEndNotification.ALERT_ORDERED_PACKAGE_WILL_EXPIRE
                });
                if (notification_template) {
                    const student = await UserActions.findOne({
                        id: item?.user_id
                    });
                    if (
                        student &&
                        !item?.alerted?.includes(
                            EnumAlertType.WILL_EXPIRED_BY_NOTIFICATION
                        )
                    ) {
                        newAlert.push(
                            EnumAlertType.WILL_EXPIRED_BY_NOTIFICATION
                        );
                        const payload = {
                            package_name: item?.package_name,
                            ordered_package_id: item?.id,
                            expired_time: item?.expired_date,
                            student_name: student?.full_name,
                            user_id: item?.user_id,
                            alerted: newAlert,
                            number_class: item?.number_class
                        };
                        await natsClient.publishEventWithTemplate({
                            template: notification_template.content,
                            data: payload,
                            receiver: student.id,
                            template_obj_id: notification_template._id
                        });
                        await OrderedPackageActions.update({ _id: item._id }, {
                            alerted: newAlert
                        } as OrderedPackage);
                        // send to admin
                        const adminOwner = await AdminActions.findOne({
                            username: 'admin'
                        });
                        if (adminOwner) {
                            natsClient.publishEventWithTemplate({
                                template: notification_template.content,
                                data: payload,
                                receiver: adminOwner._id,
                                template_obj_id: notification_template._id
                            });
                        }

                        // send to CS
                        const operationIssue =
                            await OperationIssueActions.create({
                                booking_id: null,
                                issue_description:
                                    'Ordered packages will expire',
                                resolved_staff_id: null
                            } as any);
                        const operationIssueId = operationIssue?._id;

                        const cskhDepartment = await DepartmentModel.findOne({
                            unsignedName: CODE_DEPARTMENT.CSKH
                        });
                        if (cskhDepartment) {
                            const managerCskh = await AdminModel.findOne({
                                department: {
                                    department: cskhDepartment._id,
                                    isRole: EnumRole.Manager
                                }
                            });
                            if (managerCskh) {
                                natsClient.publishEventWithTemplate({
                                    template: notification_template.content,
                                    data: payload,
                                    receiver: managerCskh._id,
                                    template_obj_id: notification_template._id,
                                    operation_issue_id: operationIssueId
                                });
                            }
                            const listDeputy = await AdminModel.find({
                                'department.department': cskhDepartment._id,
                                'department.isRole': EnumRole.Deputy_manager
                            });

                            if (listDeputy.length) {
                                listDeputy.forEach((element) => {
                                    natsClient.publishEventWithTemplate({
                                        template: notification_template.content,
                                        data: payload,
                                        receiver: element._id,
                                        template_obj_id:
                                            notification_template._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                            const listLeader = await AdminModel.find({
                                'department.department': cskhDepartment._id,
                                'department.isRole': EnumRole.Leader
                            });

                            if (listLeader.length) {
                                listLeader.forEach((element: any) => {
                                    natsClient.publishEventWithTemplate({
                                        template: notification_template.content,
                                        data: payload,
                                        receiver: element._id,
                                        template_obj_id:
                                            notification_template._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                            // thông báo cho nhân viên quản lý
                            const studentUser = await StudentModel.findOne({
                                user_id: student.id
                            }).populate('staff');
                            const checkExits = listLeader.find(
                                (e) => e.id === studentUser?.staff?.id
                            );
                            if (
                                studentUser &&
                                studentUser?.staff &&
                                !checkExits
                            ) {
                                natsClient.publishEventWithTemplate({
                                    template: notification_template.content,
                                    data: payload,
                                    receiver: studentUser.staff._id,
                                    template_obj_id: notification_template._id,
                                    operation_issue_id: operationIssueId
                                });
                            }
                        }
                    }
                }
                const email_template = await TemplateActions.findOne({
                    code: EmailTemplate.ALERT_ORDERED_PACKAGE_WILL_EXPIRE
                });
                if (email_template) {
                    const student = await UserActions.findOne({
                        id: item?.user_id
                    });
                    if (
                        student &&
                        !item?.alerted?.includes(
                            EnumAlertType.WILL_EXPIRED_BY_EMAIL
                        )
                    ) {
                        const payload = {
                            package_name: item?.package_name,
                            ordered_package_id: item?.id,
                            expired_time: item?.expired_date,
                            student_name: student?.full_name,
                            user_id: item?.user_id,
                            number_class: item?.number_class
                        };
                        if(student.is_verified_email === true && student.is_enable_receive_mail){
                            JobQueueServices.sendMailWithTemplate({
                                to: student.email,
                                subject: email_template.title,
                                body: email_template.content,
                                data: payload
                            });
                        }
                        newAlert.push(EnumAlertType.WILL_EXPIRED_BY_EMAIL);
                        await OrderedPackageActions.update({ _id: item._id }, {
                            alerted: newAlert
                        } as OrderedPackage);
                    }
                }
            })
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getExpiredStudentList(
        start_time: number | null,
        end_time: number | null
    ): Promise<number[]> {
        if (!start_time && !end_time) {
            return Promise.resolve([]);
        }
        const will_expire: any = {};
        const finish_package_filter: any = {};
        if (start_time) {
            will_expire['$gte'] = start_time;
            finish_package_filter.min_start_time = start_time;
        }
        if (end_time) {
            will_expire['$lt'] = end_time;
            finish_package_filter.max_end_time = end_time;
        }
        const expired_package_filter = {
            activation_date: { $ne: null },
            will_expire
        };
        const expired_list = await OrderedPackageActions.getOrderedStudentList(
            expired_package_filter
        );

        /** Just an additional filter to lessen the query to bookings */
        finish_package_filter.student_id = { $nin: expired_list };
        const finish_list = await BookingActions.getFinishStudentsOrPackages(
            finish_package_filter,
            true
        );
        const expired_student_list = _.union(expired_list, finish_list);
        return Promise.resolve(expired_student_list);
    }

    public static async getRenewStudentList(
        start_time: number,
        end_time: number
    ) {
        const filter = {
            created_time: {
                $gte: new Date(start_time),
                $lt: new Date(end_time)
            }
        };
        const renew_list = await OrderedPackageActions.findAllRenewStudents(
            filter
        );
        return Promise.resolve(renew_list);
    }

    public static async notiActivePackage(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start push zalo active package by cron job >>>>>>>>>>>>>`);
        const startTimeFilter = moment().startOf('day').valueOf();
        const endTimeFilter = moment().endOf('day').valueOf();
        const filter = {
            activation_date: {
                $gte: startTimeFilter,
                $lt: endTimeFilter
            },

            number_class: { $gt: 20 }
        };
        const orderedPackages = await OrderedPackageActions.findAll(filter);
        await Promise.all(
            orderedPackages.map(async (item) => {
                // Notify
                logger.info(`data order package id:  ${item.id}`);
                const user = await UserActions.findOne({ id: item.user_id });
                if (user) {
                    const dataPayload = {
                        student_name: user.full_name,
                        student_username: user.username,
                        student_id: user.id,
                        package_name: item.package_name,
                        activation_date: moment(item.activation_date).format(
                            'DD/MM/YYYY'
                        ),
                        exprire_date: moment(item.activation_date)
                            .add(item.day_of_use, 'day')
                            .format('DD/MM/YYYY'),
                        number_class: item.number_class
                    };
                    logger.info(
                        `push zalo data:  ${JSON.stringify(dataPayload)}`
                    );
                    await natsClient.publishEventZalo(
                        user,
                        ZaloOANotification.ACTIVE_PACKAGE,
                        dataPayload
                    );
                    logger.info(`push zalo active package success`);
                }
            })
        );
        logger.info(
            `end push zalo active package by cron job <<<<<<<<<<<<<<<<`
        );
        return new SuccessResponse('Success', '').send(res, req);
    }

    public static async editOrderedPackageByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_package_id } = req.params;
        const { flag_show_history } = req.body;
        logger.info(`edit order package by admin - id:  ${ordered_package_id}`);
        const orderedPackage = await OrderedPackageActions.findOne({
            id: parseInt(ordered_package_id as string)
        });
        if (!orderedPackage)
            throw new BadRequestError(
                req.t('errors.ordered_package.not_found')
            );
        let arrDisplayChangeHistory =
            orderedPackage.display_change_history ?? [];
        arrDisplayChangeHistory.push({
            status:
                flag_show_history && flag_show_history == true
                    ? EnumDisplay.PUBLISH
                    : EnumDisplay.PRIVATE,
            staff_name: req.user.full_name,
            staff_username: req.user.username,
            staff_id: req.user.id,
            created_time: new Date()
        });
        await OrderedPackageActions.update(orderedPackage._id, {
            is_show_history: flag_show_history,
            display_change_history: arrDisplayChangeHistory
        } as OrderedPackage);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    public static async deleteOrderedPackageByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _id } = req.body;
        if (!_id) {
            throw new BadRequestError('');
        }
        const orderPackage = await OrderedPackageActions.findOne({ _id });
        if (!orderPackage) {
            throw new NotFoundError('ordered package not found');
        }
        const checkHasBooking: any = await BookingActions.findOne({
            ordered_package_id: orderPackage.id
        });

        if (checkHasBooking && checkHasBooking.length > 0) {
            throw new BadRequestError(
                'Ordered package has a booking: ' + checkHasBooking.id
            );
        }
        const regulars = await RegularCalendarActions.findAll({
            ordered_package_id: orderPackage.id
        });
        await Promise.all(
            regulars.map(async (e) => {
                await RegularCalendarActions.remove(e._id);
            })
        );
        await OrderedPackageActions.remove(_id);
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    public static async stopOrderedPackage(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _id } = req.body.data;
        if (!_id) {
            throw new BadRequestError('');
        }
        const orderPackage = await OrderedPackageActions.findOne({ _id });
        if (!orderPackage) {
            throw new NotFoundError('ordered package not found');
        }
        const countBookingUpcoming = await BookingActions.count({
            ordered_package_id: orderPackage.id,
            status: [
                EnumBookingStatus.CONFIRMED,
                EnumBookingStatus.TEACHING,
                EnumBookingStatus.TEACHER_CONFIRMED
            ]
        });
        if (countBookingUpcoming && countBookingUpcoming > 0) {
            throw new NotFoundError(
                'Ordered package đang có booking có một trong các trạng thái (Upcoming, Teaching, Teacher Confirm). Không thể dừng.'
            );
        }

        const countBookingCompleted = await BookingActions.count({
            ordered_package_id: orderPackage.id,
            status: [
                EnumBookingStatus.COMPLETED,
                EnumBookingStatus.STUDENT_ABSENT
            ]
        });
        await OrderedPackageActions.update(_id, {
            number_class: 0,
            paid_number_class: countBookingCompleted || 0,
            original_number_class: countBookingCompleted || 0
        } as OrderedPackage);
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    public static async checkSubtractLessonOfDailyPackage(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(
            `start check subtract lesson of daily package by cron job >>>>>>>>>>>>>`
        );
        const startTimeFilter = moment().startOf('day').valueOf();
        const endTimeFilter = moment().endOf('day').valueOf();
        const filter = {
            number_class: { $gt: 0 },
            is_expired: false,
            activation_date: { $lt: endTimeFilter },
            'package.learning_frequency_type': EnumFrequencyType.DAILY
        };
        const orderedPackages =
            await OrderedPackageActions.findAllAndPackageByCheckLearningFrequencyType(
                filter
            );
        let total = 0;
        if (orderedPackages) {
            total = orderedPackages.length;
            logger.info(
                `total ordered package check subtract lesson:  ${total}`
            );
        }
        await Promise.all(
            orderedPackages.map(async (item) => {
                logger.info(`data order package id:  ${item.id}`);
                const checkBookingDaily = await BookingActions.findOne({
                    ordered_package_id: item.id,
                    student_id: item.user_id,
                    'calendar.start_time': {
                        $gt: startTimeFilter,
                        $lt: endTimeFilter
                    },
                    status: {
                        $in: [
                            EnumBookingStatus.COMPLETED,
                            EnumBookingStatus.PENDING,
                            EnumBookingStatus.CONFIRMED,
                            EnumBookingStatus.TEACHER_CONFIRMED,
                            EnumBookingStatus.TEACHING,
                            EnumBookingStatus.STUDENT_ABSENT
                        ]
                    }
                });
                if (!checkBookingDaily) {
                    logger.info(`subtract lesson of package id:  ${item.id}`);
                    const history = item.history || [];
                    history.push({
                        time: new Date(),
                        source: 'cron-job',
                        old_number_class: item.number_class,
                        new_number_class: item.number_class - 1
                    });
                    const diff: any = {
                        number_class: item.number_class - 1,
                        history
                    };
                    await OrderedPackageActions.update(item._id, diff);
                }
            })
        );
        logger.info(
            `end check subtract lesson of daily package by cron job <<<<<<<<<<<<<<<<`
        );
        return new SuccessResponse('Success', total).send(res, req);
    }
}
