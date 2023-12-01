import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import moment from 'moment';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import RegularCalendar from '../models/regular-calendar';
import RegularCalendarActions from '../actions/regular-calendar';
import UserActions from '../actions/user';
import CourseActions from '../actions/course';
import CounterActions from '../actions/counter';
import BookingActions from '../actions/booking';
import OrderedPackageActions from '../actions/ordered-package';
import StudentReservationRequestActions from '../actions/student-reservation-request';
import TemplateActions from '../actions/template';
import CourseController from './course.controller';
import BookingController from './booking.controller';
import Booking, { EnumBookingStatus } from '../models/booking';
import { EnumOrderStatus } from '../models/order';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';
import { EnumStudentReservationRequestStatus } from '../models/student-reservation-request';
import User from '../models/user';
import { DAY_TO_MS } from '../const/date-time';
import { EmailTemplate } from '../const/notification';
import { BackEndNotification } from '../const/notification';
import { EnumPackageOrderType, EnumAlertType } from '../const/package';
import { RoleCode } from '../const/role';
import {
    getTimestampInWeek,
    getStartOfTheWeek,
    isValidStartTimestamp
} from '../utils/datetime-utils';
import JobQueueServices from '../services/job-queue';
import * as natsClient from '../services/nats/nats-client';
import UnitActions from '../actions/unit';
import _ from 'lodash';
import AdminActions from '../actions/admin';
import LogActions from '../actions/log';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import OperationIssueActions from '../actions/operation-issue';
import { DepartmentModel } from '../models/department';
import { AdminModel } from '../models/admin';
import { CODE_DEPARTMENT } from '../const/department';
import { StudentModel } from '../models/student';
import { EnumRole } from '../models/department';
const pickUpData = [
    '_id',
    'id',
    'student_id',
    'teacher_id',
    'course_id',
    'ordered_package_id',
    'regular_start_time',
    'status',
    'cancel_reason',
    'admin_note'
];
export default class RegularCalendarController {
    /**
     * @description GET request from admin to get all created regular calendars
     * @queryParam student_id <number> - ID of the student
     * @queryParam teacher_id <number> - ID of the teacher
     * @queryParam course_id <number> - ID of the course
     * @queryParam ordered_package_id <number> - ID of the ordered package
     * @queryParam regular_start_time <number> - The regular time of the calendar
     * @queryParam status <number> - The status of the regular calendar
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @returns SuccessResponse with the regular calendar list or BadRequestError
     */
    public static async getAllRegularCalendars(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            student_id,
            teacher_id,
            course_id,
            ordered_package_id,
            regular_start_time,
            status,
            page_size,
            page_number,
            teacher_name,
            student_name,
            course_name,
            package_name
        } = req.query;
        const filter: any = {};
        if (student_id) filter.student_id = parseInt(student_id as string);
        if (teacher_id) filter.teacher_id = parseInt(teacher_id as string);
        if (course_id) filter.course_id = parseInt(course_id as string);
        if (ordered_package_id)
            filter.ordered_package_id = parseInt(ordered_package_id as string);
        if (teacher_name) filter.teacher_name = teacher_name as string;
        if (student_name) filter.student_name = student_name as string;
        if (course_name) filter.course_name = course_name as string;
        if (package_name) filter.package_name = package_name as string;
        if (regular_start_time) {
            filter.regular_start_time = parseInt(regular_start_time as string);
        }
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        if (page_size) filter.page_size = parseInt(page_size as string);
        if (page_number) filter.page_number = parseInt(page_number as string);
        const res_payload = {
            data: [],
            pagination: {
                total: 0
            }
        };
        const calendars: any = await RegularCalendarActions.findAllWithAggr(
            filter
        );
        res_payload.data = calendars[0] ? calendars[0].data : [];
        const count =
            calendars[0] && calendars[0].count[0]
                ? calendars[0].count[0].count
                : 0;
        res_payload.pagination.total = count;
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAllActiveRegularCalendarsForCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const filter = {
            status: [
                EnumRegularCalendarStatus.ACTIVE,
                EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING
            ],
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        const calendars: any =
            await RegularCalendarActions.getAllActiveRegularCalendarsForCronJobs(
                filter
            );
        const res_payload = {
            data: [],
            pagination: {
                total: 0
            }
        };
        res_payload.data = calendars[0] ? calendars[0].data : [];
        const count =
            calendars[0] && calendars[0].count[0]
                ? calendars[0].count[0].count
                : 0;
        res_payload.pagination.total = count;
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description GET request from users to get all created regular calendars
     *              related to themshelves
     * @queryParam student_id <number> - ID of the student (if requested by teacher)
     * @queryParam teacher_id <number> - ID of the teacher (if requested by student)
     * @queryParam course_id <number> - ID of the course
     * @queryParam regular_start_time <number> - The regular time of the calendar
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @returns SuccessResponse with the regular calendar list or BadRequestError
     */
    public static async getAllRegularCalendarsByUser(
        req: ProtectedRequest,
        res: Response
    ) {
        if (req.user.role.includes(RoleCode.STUDENT)) {
            req.query.student_id = req.user.id.toString();
        }
        if (req.user.role.includes(RoleCode.TEACHER)) {
            req.query.teacher_id = req.user.id.toString();
        }
        await RegularCalendarController.getAllRegularCalendars(req, res);
    }

    /**
     * @description POST request from admin to create a regular calendar
     * @bodyParam student_id <number> - ID of the student
     * @bodyParam teacher_id <number> - ID of the teacher
     * @bodyParam course_id <number> - ID of the course
     * @bodyParam ordered_package_id <number> - ID of the ordered package
     * @bodyParam regular_start_time <number> - The regular time of the calendar
     * @bodyParam admin_note <string> - Note of admin on the calendar
     * @returns SuccessResponse with ok message or BadRequestError
     */
    public static async createRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            student_id,
            teacher_id,
            course_id,
            ordered_package_id,
            regular_start_time,
            admin_note,
            unit_id
        } = req.body;
        if (!isValidStartTimestamp(regular_start_time)) {
            throw new BadRequestError(
                req.t('errors.regular_calendar.invalid_start_time')
            );
        }
        const checked_calendar = await RegularCalendarActions.findOne({
            $or: [
                {
                    teacher_id
                },
                {
                    student_id
                }
            ],
            regular_start_time,
            status: [
                EnumRegularCalendarStatus.ACTIVE,
                EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                EnumRegularCalendarStatus.EXPIRED
            ]
        });
        if (checked_calendar) {
            throw new BadRequestError(
                req.t(
                    'errors.regular_calendar.booked',
                    checked_calendar.student.full_name,
                    checked_calendar.teacher.full_name
                )
            );
        }
        const student = await UserActions.findOne({ id: student_id });
        if (!student || !student.role.includes(RoleCode.STUDENT)) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }
        if (
            !student.regular_times ||
            !student.regular_times.includes(regular_start_time)
        ) {
            throw new BadRequestError(req.t('errors.student.no_regular_time'));
        }
        const teacher = await UserActions.findOne({ id: teacher_id });
        if (!teacher || !teacher.role.includes(RoleCode.TEACHER)) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }
        if (
            !teacher.regular_times ||
            !teacher.regular_times.includes(regular_start_time)
        ) {
            throw new BadRequestError(req.t('errors.teacher.no_regular_time'));
        }
        const course = await CourseActions.findOne({
            id: course_id,
            is_active: true
        });
        if (!course) {
            throw new BadRequestError(req.t('errors.course.not_found'));
        }
        const availableCourses =
            await CourseController.getAllAvailableCoursesByStudent(
                req,
                student_id
            );
        if (!availableCourses.has(parseInt(course_id as string))) {
            throw new BadRequestError(req.t('errors.course.not_bought'));
        }
        const ordered_package = await OrderedPackageActions.findOne({
            id: ordered_package_id,
            user_id: student_id,
            type: EnumPackageOrderType.PREMIUM,
            number_class: { $gt: 0 }
        });
        if (!ordered_package || !ordered_package.activation_date) {
            throw new BadRequestError(req.t('errors.ordered_package.inactive'));
        }
        if (ordered_package.order.status != EnumOrderStatus.PAID) {
            throw new BadRequestError(req.t('errors.order.unavailable'));
        }
        if (ordered_package.paid_number_class) {
            /** Student just paid a part of the package */
            if (
                ordered_package.number_class +
                    ordered_package.paid_number_class <=
                ordered_package.original_number_class
            ) {
                throw new BadRequestError(req.t('errors.order.unavailable'));
            }
        }
        const current_moment = new Date().getTime();
        if (
            ordered_package.activation_date +
                ordered_package.day_of_use * DAY_TO_MS <
            current_moment
        ) {
            throw new BadRequestError(req.t('errors.ordered_package.expired'));
        }

        const check_reservation =
            await StudentReservationRequestActions.findOne({
                student_id,
                ordered_package_id,
                status: [
                    EnumStudentReservationRequestStatus.APPROVED,
                    EnumStudentReservationRequestStatus.PAID
                ],
                start_time: { $lt: current_moment },
                end_time: { $gt: current_moment }
            });

        if (check_reservation) {
            throw new BadRequestError(
                req.t('errors.regular_calendars.student_in_reservation')
            );
        }
        let unit = null;
        if (unit_id) {
            unit = await UnitActions.findOne({
                id: Number(unit_id),
                course_id: Number(course_id),
                is_active: true
            });
            if (!unit) {
                throw new BadRequestError(req.t('errors.unit.not_found'));
            }
        }

        const counter = await CounterActions.findOne();
        const id = counter.regular_calendar_id;
        const regular_calendar = {
            id,
            student_id,
            teacher_id,
            course_id,
            ordered_package_id,
            regular_start_time,
            admin_note,
            student,
            teacher,
            course,
            ordered_package,
            unit_id: unit_id ?? null,
            unit: unit ?? null
        };
        await RegularCalendarActions.create(
            regular_calendar as RegularCalendar
        );

        /** send email + noti */
        const start_time =
            getStartOfTheWeek(new Date().getTime()) + regular_start_time;
        const noti_payload = {
            teacher_name: teacher.full_name,
            student_name: student.full_name,
            course_name: course.name,
            student_info: student.intro ? student.intro : '',
            student_skype: student.skype_account ? student.skype_account : '',
            regular_start_time: start_time
        };
        const teacher_email_template = await TemplateActions.findOne({
            code: EmailTemplate.NEW_REGULAR_CALENDAR_FOR_TEACHER
        });
        if (teacher_email_template) {
            JobQueueServices.sendMailWithTemplate({
                to: teacher.email,
                subject: teacher_email_template.title,
                body: teacher_email_template.content,
                data: noti_payload
            });
        }
        const teacher_noti_template = await TemplateActions.findOne({
            code: BackEndNotification.TEACHER_HAVE_NEW_REGULAR_CALENDAR
        });
        if (teacher_noti_template) {
            await natsClient.publishEventWithTemplate({
                template: teacher_noti_template.content,
                data: noti_payload,
                receiver: teacher_id,
                template_obj_id: teacher_noti_template._id
            });
        }

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description PUT request from admin to edit a regular calendar
     * @urlParam regular_calendar_id <number> - ID of the regular calendar
     * @bodyParam teacher_id <number> - ID of the teacher
     * @bodyParam course_id <number> - ID of the course
     * @bodyParam ordered_package_id <number> - ID of the order
     * @bodyParam regular_start_time <number> - The regular time of the calendar
     * @bodyParam status <number> - New status of the calendar
     * @bodyParam cancel_reason <number> - Reason to cancel this regular calendar
     * @returns SuccessResponse with ok message or BadRequestError
     */
    public static async editRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const { regular_calendar_id } = req.params;
        const {
            teacher_id,
            course_id,
            ordered_package_id,
            status,
            cancel_reason,
            admin_note
        } = req.body;
        let regular_start_time;
        let new_teacher_id;
        let cancel_existing_bookings = false;
        let existing_booking_status: EnumBookingStatus;
        const diff: any = {};
        const regular_calendar = await RegularCalendarActions.findOne({
            id: parseInt(regular_calendar_id as string)
        });
        if (!regular_calendar)
            throw new BadRequestError(
                req.t('errors.regular_calendar.not_found')
            );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'RegularCalendarModel',
            regular_calendar,
            pickUpData
        );
        if (
            req.body.hasOwnProperty('regular_start_time') &&
            regular_start_time != regular_calendar.regular_start_time
        ) {
            if (!isValidStartTimestamp(req.body.regular_start_time)) {
                throw new BadRequestError(
                    req.t('errors.regular_calendar.invalid_start_time')
                );
            }
            regular_start_time = req.body.regular_start_time;
            diff.regular_start_time = regular_start_time;
            cancel_existing_bookings = true;
            const student = await UserActions.findOne({
                id: regular_calendar.student_id
            });
            if (!student)
                throw new BadRequestError(req.t('errors.user.not_found'));
            if (
                !student.regular_times ||
                !student.regular_times.includes(regular_start_time)
            ) {
                throw new BadRequestError(
                    req.t('errors.student.no_regular_time')
                );
            }
        } else {
            regular_start_time = regular_calendar.regular_start_time;
        }
        if (teacher_id && teacher_id != regular_calendar.teacher_id) {
            const teacher = await UserActions.findOne({
                id: parseInt(teacher_id as string)
            });
            if (!teacher || !teacher.role.includes(RoleCode.TEACHER)) {
                throw new BadRequestError(req.t('errors.teacher.not_found'));
            }
            if (
                !teacher.regular_times ||
                !teacher.regular_times.includes(regular_start_time)
            ) {
                throw new BadRequestError(
                    req.t('errors.teacher.no_regular_time')
                );
            }
            diff.teacher_id = parseInt(teacher_id as string);
            cancel_existing_bookings = true;
            new_teacher_id = diff.teacher_id;
            diff.teacher = teacher;
        } else {
            new_teacher_id = regular_calendar.teacher_id;
        }
        if (
            diff.hasOwnProperty('regular_start_time') ||
            diff.hasOwnProperty('teacher_id')
        ) {
            const checked_regular_calendar =
                await RegularCalendarActions.findOne({
                    teacher_id: new_teacher_id,
                    regular_start_time,
                    status: [
                        EnumRegularCalendarStatus.ACTIVE,
                        EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                        EnumRegularCalendarStatus.EXPIRED
                    ]
                });
            if (
                checked_regular_calendar &&
                checked_regular_calendar.id != regular_calendar.id
            ) {
                throw new BadRequestError(
                    req.t(
                        'errors.regular_calendar.booked',
                        checked_regular_calendar.student.full_name,
                        checked_regular_calendar.teacher.full_name
                    )
                );
            }
        }
        if (course_id && course_id != regular_calendar.course_id) {
            const course = await CourseActions.findOne({
                id: parseInt(course_id as string),
                is_active: true
            });
            if (!course) {
                throw new BadRequestError(req.t('errors.course.not_found'));
            }
            const availableCourses =
                await CourseController.getAllAvailableCoursesByStudent(
                    req,
                    regular_calendar.student_id
                );
            if (!availableCourses.has(parseInt(course_id as string))) {
                throw new BadRequestError(req.t('errors.course.not_bought'));
            }
            diff.course_id = parseInt(course_id as string);
            cancel_existing_bookings = true;
            diff.course = course;
        }

        diff.cancel_reason = cancel_reason;
        if (status && status != regular_calendar.status) {
            diff.status = status;
            switch (status) {
                case EnumRegularCalendarStatus.ADMIN_CANCEL: {
                    cancel_existing_bookings = true;
                    existing_booking_status = EnumBookingStatus.CANCEL_BY_ADMIN;
                    if (!diff.cancel_reason) {
                        diff.cancel_reason = req.t(
                            'admin.regular_calendar.admin_cancel'
                        );
                    }
                    break;
                }
                case EnumRegularCalendarStatus.TEACHER_CANCEL: {
                    cancel_existing_bookings = true;
                    existing_booking_status =
                        EnumBookingStatus.CANCEL_BY_TEACHER;
                    if (!diff.cancel_reason) {
                        if (!regular_calendar.cancel_reason) {
                            throw new BadRequestError(
                                req.t(
                                    'webapp.regular_calendar.cancel_no_reason'
                                )
                            );
                        }
                        diff.cancel_reason = regular_calendar.cancel_reason;
                    }
                    break;
                }
                default:
                    break;
            }
        } else {
            /**
             * We should only update ordered package when there is no
             * status change involved
             */
            if (
                ordered_package_id &&
                ordered_package_id != regular_calendar.ordered_package_id
            ) {
                const ordered_package = await OrderedPackageActions.findOne({
                    id: ordered_package_id,
                    user_id: regular_calendar.student_id,
                    type: EnumPackageOrderType.PREMIUM,
                    number_class: { $gt: 0 }
                });
                if (!ordered_package || !ordered_package.activation_date) {
                    throw new BadRequestError(
                        req.t('errors.order.unavailable')
                    );
                }
                if (ordered_package.order.status != EnumOrderStatus.PAID) {
                    throw new BadRequestError(
                        req.t('errors.order.unavailable')
                    );
                }
                if (ordered_package.paid_number_class) {
                    /** Student just paid a part of the package */
                    if (
                        ordered_package.number_class +
                            ordered_package.paid_number_class <=
                        ordered_package.original_number_class
                    ) {
                        throw new BadRequestError(
                            req.t('errors.order.unavailable')
                        );
                    }
                }
                const current_moment = new Date().getTime();
                if (
                    ordered_package.activation_date +
                        ordered_package.day_of_use * DAY_TO_MS <
                    current_moment
                ) {
                    throw new BadRequestError(
                        req.t('errors.order.unavailable')
                    );
                }

                const check_reservation =
                    await StudentReservationRequestActions.findOne({
                        student_id: regular_calendar.student_id,
                        ordered_package_id,
                        status: [
                            EnumStudentReservationRequestStatus.APPROVED,
                            EnumStudentReservationRequestStatus.PAID
                        ],
                        start_time: { $lt: current_moment },
                        end_time: { $gt: current_moment }
                    });

                if (check_reservation) {
                    throw new BadRequestError(
                        req.t('errors.regular_calendars.student_in_reservation')
                    );
                }

                diff.ordered_package_id = parseInt(
                    ordered_package_id as string
                );
                if (
                    regular_calendar.status == EnumRegularCalendarStatus.EXPIRED
                ) {
                    /** New ordered package, change the regular to active again */
                    diff.status = EnumRegularCalendarStatus.ACTIVE;
                }
                cancel_existing_bookings = true;
                diff.ordered_package = ordered_package;
            }
        }
        if (admin_note) diff.admin_note = admin_note;
        const new_data = await RegularCalendarActions.update(
            regular_calendar._id,
            diff as RegularCalendar
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'RegularCalendarModel',
            new_data,
            pickUpData
        );
        if (cancel_existing_bookings) {
            const booking_filter = {
                student_id: regular_calendar.student_id,
                teacher_id: regular_calendar.teacher_id,
                course_id: regular_calendar.course_id,
                ordered_package_id: regular_calendar.ordered_package_id,
                status: [EnumBookingStatus.CONFIRMED],
                min_start_time: new Date().getTime(),
                is_regular_booking: true
            };
            const booking_sort = { 'calendar.start_time': 1 };
            const existingBookings = await BookingActions.findAll(
                booking_filter,
                booking_sort
            );
            let reason = diff.cancel_reason;
            if (!reason) {
                reason = req.t('admin.regular_calendar.admin_cancel');
            }
            await Promise.all(
                existingBookings.map(async (booking: Booking) => {
                    const timestampInWeek = getTimestampInWeek(
                        booking.calendar.start_time
                    );
                    if (
                        timestampInWeek == regular_calendar.regular_start_time
                    ) {
                        const new_booking_req = {
                            user: req.user,
                            body: {
                                status: existing_booking_status,
                                reason
                            },
                            t: req.t
                        };
                        await BookingController.editBooking(
                            new_booking_req as ProtectedRequest,
                            booking.id
                        );
                    }
                })
            );
        }

        return new SuccessResponse(
            req.t('admin.regular_calendar.edit_success'),
            { ok: true }
        ).send(res, req);
    }

    /**
     * @description DEL request from admin to delete a regular calendar
     * @urlParam regular_calendar_id <number> - ID of the regular calendar
     * @returns SuccessResponse with ok message or BadRequestError
     */
    public static async deleteRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const { regular_calendar_id } = req.params;
        const regular_calendar = await RegularCalendarActions.findOne({
            id: parseInt(regular_calendar_id as string)
        });
        /**
         * @note Should we return success nonetheless? The result is the same.
         * Or do we want to notify to admins?
         */
        if (!regular_calendar)
            throw new BadRequestError(
                req.t('errors.regular_calendar.not_found')
            );
        await RegularCalendarActions.remove(regular_calendar._id);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    /**
     * @description GET request from admin to get full info of the regular calendar
     *              related to themshelves
     * @queryParam regular_calendar_id <number> - ID of the RegularCalendar
     * @returns SuccessResponse with the regular calendar full info or BadRequestError
     */
    public static async getRegularCalendarById(
        req: ProtectedRequest,
        res: Response
    ) {
        const { regular_calendar_id } = req.params;
        const regular_calendar = await RegularCalendarActions.findOne({
            id: parseInt(regular_calendar_id as string)
        });
        if (!regular_calendar)
            throw new BadRequestError(
                req.t('errors.regular_calendar.not_found')
            );
        return new SuccessResponse(
            req.t('common.success'),
            regular_calendar
        ).send(res, req);
    }

    public static async getLatestRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.query;
        const regular_calendar = await RegularCalendarActions.findOne({
            student_id: parseInt(student_id as string)
        });
        return new SuccessResponse(
            req.t('common.success'),
            regular_calendar
        ).send(res, req);
    }

    /**
     * @description PUT request from teacher to request cancel a regular
     *              calendar of themshelves
     * @urlParam regular_calendar_id <number> - ID of the regular calendar
     * @returns SuccessResponse with ok message
     */
    public static async requestCancelRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { regular_calendar_id } = req.params;
        const { cancel_reason } = req.body;

        if (!cancel_reason) {
            throw new BadRequestError(
                req.t('webapp.regular_calendar.cancel_no_reason')
            );
        }

        const regular_calendar = await RegularCalendarActions.findOne({
            id: parseInt(regular_calendar_id as string)
        });
        if (
            regular_calendar &&
            regular_calendar.teacher_id != id &&
            regular_calendar.status == EnumRegularCalendarStatus.ACTIVE
        ) {
            const diff = {
                status: EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                cancel_reason
            };
            await RegularCalendarActions.update(
                regular_calendar._id,
                diff as RegularCalendar
            );
        }
        return new SuccessResponse(
            req.t('common.success'),
            regular_calendar
        ).send(res, req);
    }

    /**
     * @description Get all of booked regular_times of an user (a regular time
     *              that has been matched with a teacher/student and set for a
     *              regular calendar)
     * @param user_id <number> - ID of an user
     * @returns An array of booked regular_times of that user
     */
    public static async getAllBookedRegularTimesOfUser(
        user: User
    ): Promise<number[]> {
        if (!user || !user.regular_times || user.regular_times.length <= 0) {
            return [];
        }
        let regular_calendars;
        if (user.role.includes(RoleCode.STUDENT)) {
            regular_calendars = await RegularCalendarActions.findAll({
                student_id: user.id,
                status: [
                    EnumRegularCalendarStatus.ACTIVE,
                    EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                    EnumRegularCalendarStatus.EXPIRED
                ]
            });
        } else if (user.role.includes(RoleCode.TEACHER)) {
            regular_calendars = await RegularCalendarActions.findAll({
                teacher_id: user.id,
                status: [
                    EnumRegularCalendarStatus.ACTIVE,
                    EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                    EnumRegularCalendarStatus.EXPIRED
                ]
            });
        } else {
            return [];
        }
        const booked_times = new Array<number>();
        for (const calendar of regular_calendars) {
            booked_times.push(calendar.regular_start_time);
        }
        return booked_times;
    }

    public static async getOverAbsentCourse(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter = {
            alerted: [
                {
                    alerted: {
                        $nin: [EnumAlertType.ATTENDANCE_BY_NOTIFICATION]
                    }
                },
                { alerted: { $nin: [EnumAlertType.ATTENDANCE_BY_EMAIL] } }
            ]
        };
        const courses_by_student =
            await RegularCalendarActions.findRegularCalendarWithCourseAndStudent(
                filter
            );
        await Promise.all(
            courses_by_student.map(async (item) => {
                const check_ordered_package =
                    await OrderedPackageActions.findOne({
                        id: item._id.ordered_package_id
                    });
                if (check_ordered_package) {
                    const expired_date = check_ordered_package.activation_date
                        ? check_ordered_package.activation_date +
                          check_ordered_package.day_of_use * DAY_TO_MS
                        : null;
                    if (
                        expired_date &&
                        expired_date > moment().valueOf() &&
                        check_ordered_package.number_class > 0
                    ) {
                        const filter = {
                            student_id: item._id.student_id,
                            course_id: item._id.course_id,
                            ordered_package_id: item._id.ordered_package_id,
                            status: EnumBookingStatus.STUDENT_ABSENT
                        };
                        const count_absent = await BookingActions.count(filter);
                        const total_lessons_by_course = await UnitActions.count(
                            { course_id: item._id.course_id }
                        );
                        if (
                            _.round(count_absent / total_lessons_by_course, 2) >
                            0.1
                        ) {
                            const course_info = await CourseActions.findOne({
                                id: item._id.course_id
                            });
                            const newAlert = [];
                            const notification_template =
                                await TemplateActions.findOne({
                                    code: BackEndNotification.ALERT_OVER_ABSENT_COURSE
                                });
                            if (notification_template) {
                                const student = await UserActions.findOne({
                                    id: item._id.student_id
                                });
                                newAlert.push(
                                    EnumAlertType.ATTENDANCE_BY_NOTIFICATION
                                );
                                if (student) {
                                    const payload = {
                                        course_name: course_info?.name,
                                        ordered_package_id: item?.id,
                                        total_absent: count_absent,
                                        total_lessons: total_lessons_by_course,
                                        student_name: student?.full_name,
                                        user_id: item._id?.student_id,
                                        alerted: newAlert
                                    };
                                    // await natsClient.publishEventWithTemplate({
                                    //     template: notification_template.content,
                                    //     data: payload,
                                    //     receiver: student.id,
                                    //     template_obj_id: notification_template._id
                                    // });
                                    await RegularCalendarActions.updateMany(
                                        {
                                            course_id: item._id.course_id,
                                            student_id: item._id.student_id,
                                            ordered_package_id:
                                                item._id.ordered_package_id
                                        },
                                        {
                                            alerted: newAlert
                                        } as RegularCalendar
                                    );
                                    // send to admin
                                    const adminOwner =
                                        await AdminActions.findOne({
                                            username: 'admin'
                                        });
                                    if (adminOwner) {
                                        natsClient.publishEventWithTemplate({
                                            template:
                                                notification_template.content,
                                            data: payload,
                                            receiver: adminOwner._id,
                                            template_obj_id:
                                                notification_template._id
                                        });
                                    }
                                }
                            }
                            const email_template =
                                await TemplateActions.findOne({
                                    code: EmailTemplate.ALERT_OVER_ABSENT_COURSE
                                });
                            if (email_template) {
                                const student = await UserActions.findOne({
                                    id: item._id?.student_id
                                });
                                newAlert.push(
                                    EnumAlertType.ATTENDANCE_BY_EMAIL
                                );
                                if (student) {
                                    const payload = {
                                        course_name: course_info?.name,
                                        ordered_package_id: item?.id,
                                        total_absent: count_absent,
                                        total_lessons: total_lessons_by_course,
                                        student_name: student?.full_name,
                                        user_id: item._id?.student_id,
                                        alerted: newAlert
                                    };
                                    if(student.is_verified_email === true && student.is_enable_receive_mail){
                                        JobQueueServices.sendMailWithTemplate({
                                            to: student.email,
                                            subject: email_template.title,
                                            body: email_template.content,
                                            data: payload
                                        });
                                    }
                                    await RegularCalendarActions.updateMany(
                                        {
                                            course_id: item._id.course_id,
                                            student_id: item._id.student_id,
                                            ordered_package_id:
                                                item._id.ordered_package_id
                                        },
                                        {
                                            alerted: newAlert
                                        } as RegularCalendar
                                    );
                                }
                            }
                        }
                    }
                }
            })
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async updateStatusRegularCalendarFunc(
        req: ProtectedRequest,
        id: number,
        auto_schedule: any
    ) {
        const regular = await RegularCalendarActions.findOne({
            id
        });
        if (!regular) {
            throw new BadRequestError(
                req.t('errors.regular_calendar.not_found')
            );
        }
        if (!auto_schedule.booking_id && regular?.auto_schedule?.booking_id) {
            auto_schedule.booking_id = regular.auto_schedule.booking_id;
        }
        if (!regular.auto_schedule_history) {
            regular.auto_schedule_history = [];
        }
        const time = moment().subtract(10, 'minute');
        if (
            typeof regular.auto_schedule.message !== 'undefined' &&
            regular.auto_schedule.message != auto_schedule.message &&
            moment(regular.auto_schedule?.time).valueOf() > time.valueOf()
        ) {
            auto_schedule.message =
                regular.auto_schedule.message + '\n' + auto_schedule.message;
            regular.auto_schedule_history.pop();
        }

        regular.auto_schedule = auto_schedule;
        if (regular.auto_schedule_history.length === 6) {
            regular.auto_schedule_history.shift();
        }
        regular.auto_schedule_history.push(auto_schedule);

        regular.markModified('auto_schedule_history');
        await regular.save();

        return regular;
    }

    public static async updateStatusRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id, auto_schedule } = req.body;
        const regular_calendar =
            await RegularCalendarController.updateStatusRegularCalendarFunc(
                req,
                id,
                auto_schedule
            );
        return new SuccessResponse(
            req.t('common.success'),
            regular_calendar
        ).send(res, req);
    }

    public static async updateCourseRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id, courseId, course_id } = req.body;
        const regular = await RegularCalendarActions.findOne({
            id
        });
        if (!regular) {
            throw new BadRequestError(
                req.t('errors.regular_calendar.not_found')
            );
        }
        regular.course_id = courseId;
        regular.course = course_id;
        await regular.save();
        return new SuccessResponse(req.t('common.success'), regular).send(
            res,
            req
        );
    }
    public static async inactiveRegularCalendarDailyFunc() {
        let listRegularCalendar = await RegularCalendarActions.findAll({
            status: [
                EnumRegularCalendarStatus.ACTIVE,
                EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING
            ]
        });
        if (listRegularCalendar) {
            const listRegularCalendarExprire = listRegularCalendar.filter(
                (e) =>
                    e?.ordered_package?.activation_date &&
                    moment(e.ordered_package.activation_date)
                        .add(e.ordered_package.day_of_use, 'day')
                        .valueOf() < moment().valueOf() &&
                    e?.ordered_package?.number_class > 0
            );
            await Promise.all(
                listRegularCalendarExprire.map(async (e) => {
                    const exitsBooking = await BookingActions.findOne({
                        ordered_package_id: e.ordered_package_id,
                        status: [
                            EnumBookingStatus.PENDING,
                            EnumBookingStatus.CONFIRMED,
                            EnumBookingStatus.TEACHER_CONFIRMED,
                            EnumBookingStatus.TEACHING
                        ]
                    });
                    if (!exitsBooking) {
                        e.status = EnumRegularCalendarStatus.EXPIRED;
                        await e.save();
                        const dataPayload: any = {
                            student_id: e.student_id,
                            student_name: `${e.student?.full_name} - ${e.student?.username}`,
                            teacher_name: `${e.teacher?.full_name} - ${e.teacher?.username}`,
                            status: 'EXPIRED',
                            schedule_id: e.id,
                            schedule_time: e.regular_start_time
                        };
                        await RegularCalendarController.notifyUpdateStatusRegularCalendar(
                            dataPayload
                        );
                    }
                })
            );

            const listRegularCalendarDone = listRegularCalendar.filter(
                (e) => e?.ordered_package?.number_class <= 0
            );
            await Promise.all(
                listRegularCalendarDone.map(async (e) => {
                    const exitsBooking = await BookingActions.findOne({
                        ordered_package_id: e.ordered_package_id,
                        status: [
                            EnumBookingStatus.PENDING,
                            EnumBookingStatus.CONFIRMED,
                            EnumBookingStatus.TEACHER_CONFIRMED,
                            EnumBookingStatus.TEACHING
                        ]
                    });
                    if (!exitsBooking) {
                        e.finish_at = new Date();
                        e.status = EnumRegularCalendarStatus.FINISHED;
                        await e.save();
                        const dataPayload: any = {
                            student_id: e.student_id,
                            student_name: `${e.student?.full_name} - ${e.student?.username}`,
                            teacher_name: `${e.teacher?.full_name} - ${e.teacher?.username}`,
                            status: 'FINISHED',
                            schedule_id: e.id,
                            schedule_time: e.regular_start_time
                        };
                        await RegularCalendarController.notifyUpdateStatusRegularCalendar(
                            dataPayload
                        );
                    }
                })
            );
        }
        let listRegularCalendarExprire = await RegularCalendarActions.findAll({
            status: [EnumRegularCalendarStatus.EXPIRED]
        });
        if (listRegularCalendarExprire) {
            const listRegularExprire = listRegularCalendarExprire.filter(
                (e) =>
                    e?.ordered_package?.activation_date &&
                    moment(e.ordered_package.activation_date)
                        .add(e.ordered_package.day_of_use, 'day')
                        .valueOf() > moment().valueOf() &&
                    e?.ordered_package?.number_class > 0
            );
            await Promise.all(
                listRegularExprire.map(async (e) => {
                    e.status = EnumRegularCalendarStatus.ACTIVE;
                    await e.save();
                })
            );
            const listRegularCalendarDone = listRegularCalendarExprire.filter(
                (e) => e?.ordered_package?.number_class <= 0
            );
            await Promise.all(
                listRegularCalendarDone.map(async (e) => {
                    const exitsBooking = await BookingActions.findOne({
                        ordered_package_id: e.ordered_package_id,
                        status: [
                            EnumBookingStatus.PENDING,
                            EnumBookingStatus.CONFIRMED,
                            EnumBookingStatus.TEACHER_CONFIRMED,
                            EnumBookingStatus.TEACHING
                        ]
                    });
                    if (!exitsBooking) {
                        e.finish_at = new Date();
                        e.status = EnumRegularCalendarStatus.FINISHED;
                        await e.save();
                        const dataPayload: any = {
                            student_id: e.student_id,
                            student_name: `${e.student?.full_name} - ${e.student?.username}`,
                            teacher_name: `${e.teacher?.full_name} - ${e.teacher?.username}`,
                            status: 'FINISHED',
                            schedule_id: e.id,
                            schedule_time: e.regular_start_time
                        };
                        await RegularCalendarController.notifyUpdateStatusRegularCalendar(
                            dataPayload
                        );
                    }
                })
            );
        }
    }

    public static async inactiveRegularCalendar(
        req: ProtectedRequest,
        res: Response
    ) {
        await RegularCalendarController.inactiveRegularCalendarDailyFunc();
        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }

    public static async notifyUpdateStatusRegularCalendar(dataPayload: any) {
        const notiCsAdminTemplate = await TemplateActions.findOne({
            code: BackEndNotification.UPDATE_STATUS_SCHEDULE
        });
        if (notiCsAdminTemplate) {
            // Thông báo cho admin
            const adminOwner = await AdminActions.findOne({
                username: 'admin'
            });
            if (adminOwner) {
                natsClient.publishEventWithTemplate({
                    template: notiCsAdminTemplate.content,
                    data: dataPayload,
                    receiver: adminOwner._id,
                    template_obj_id: notiCsAdminTemplate._id
                });
            }

            // thông báo cho cs
            const operationIssue = await OperationIssueActions.create({
                booking_id: null,
                issue_description:
                    'System Update status schedule: ' + dataPayload?.status,
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
                        template: notiCsAdminTemplate.content,
                        data: dataPayload,
                        receiver: managerCskh._id,
                        template_obj_id: notiCsAdminTemplate._id,
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
                            template: notiCsAdminTemplate.content,
                            data: dataPayload,
                            receiver: element._id,
                            template_obj_id: notiCsAdminTemplate._id,
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
                            template: notiCsAdminTemplate.content,
                            data: dataPayload,
                            receiver: element._id,
                            template_obj_id: notiCsAdminTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
                // thông báo cho nhân viên quản lý
                const student = await StudentModel.findOne({
                    user_id: dataPayload.student_id
                }).populate('staff');
                const checkExits = listLeader.find(
                    (e: any) => e.id === student?.staff?.id
                );
                if (student && student?.staff && !checkExits) {
                    natsClient.publishEventWithTemplate({
                        template: notiCsAdminTemplate.content,
                        data: dataPayload,
                        receiver: student.staff._id,
                        template_obj_id: notiCsAdminTemplate._id,
                        operation_issue_id: operationIssueId
                    });
                }
            }
        }
    }
}
