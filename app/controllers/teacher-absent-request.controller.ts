import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import BookingController from './booking.controller';
import CalendarActions from '../actions/calendar';
import CounterActions from '../actions/counter';
import TeacherActions from '../actions/teacher';
import TeacherAbsentRequestActions from '../actions/teacher-absent-request';
import TeacherAbsentRequest, {
    EnumTeacherAbsentRequestStatus
} from '../models/teacher-absent-request';
import { MINUTE_TO_MS } from '../const/date-time';
import { RoleCode } from '../const/role';
import moment from 'moment';
import BookingActions from '../actions/booking';
import { BookingModel, EnumBookingStatus } from '../models/booking';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import TemplateActions from '../actions/template';
import { BackEndNotification, ZaloOANotification } from '../const/notification';
import { DepartmentModel } from '../models/department';
import { CODE_DEPARTMENT } from '../const/department';
import { AdminModel } from '../models/admin';
import { EnumRole } from '../models/department';
import { TeacherModel } from '../models/teacher';
import * as natsClient from '../services/nats/nats-client';
import AdminActions from '../actions/admin';
import RegularCalendarActions from '../actions/regular-calendar';
import { getTimestampInWeek } from '../utils/datetime-utils';
import { StudentModel } from '../models/student';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';
import { EnumPackageOrderType } from '../const/package';
import OperationIssueActions from '../actions/operation-issue';

const logger = require('dy-logger');

const pickUpData = [
    '_id',
    'id',
    'teacher_id',
    'start_time',
    'end_time',
    'status',
    'teacher_note',
    'admin_note'
];

export default class TeacherAbsentRequestController {
    /**
     * @description GET request from admin to search for absent requests
     * @queryParam teacher_id <number> - ID of the teacher
     * @queryParam status <number|number[]> - status of the requests
     * @queryParam start_time <number> - min start_time of the requests
     * @queryParam end_time <number> - max end_time of the requests
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getAllAbsentRequestsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            teacher_id,
            status,
            start_time,
            end_time,
            search,
            staff_id,
            date
        } = req.query;

        const filter: any = {
            teacher_id,
            status: parseInt(status as string),
            start_time: start_time
                ? { $gte: parseInt(start_time as string) }
                : null,
            end_time: end_time ? { $lte: parseInt(end_time as string) } : null,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search,
            staff_id: parseInt(staff_id as string),
            date: parseInt(date as string)
        };

        const temp: any = await TeacherAbsentRequestActions.findEachPage(
            filter
        );

        const data = temp.length > 0 ? temp[0]?.data || [] : [];

        const total = temp.length > 0 ? temp[0]?.total[0]?.count || 0 : 0;

        const res_payload = {
            data,
            pagination: {
                total
            }
        };

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /**
     * @description GET request from teachers to search for their absent requests
     * @queryParam status <number|number[]> - status of the requests
     * @queryParam start_time <number> - min start_time of the requests
     * @queryParam end_time <number> - max end_time of the requests
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getAbsentRequestsByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, status, start_time, end_time } =
            req.query;
        const filter: any = {
            teacher_id: req.user.id,
            status,
            start_time: start_time
                ? { $gte: parseInt(start_time as string) }
                : null,
            end_time: end_time ? { $lte: parseInt(end_time as string) } : null,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        const absent_requests =
            await TeacherAbsentRequestActions.findAllAndPaginated(
                filter,
                {},
                { id: -1 }
            );
        const count = await TeacherAbsentRequestActions.count(filter);
        const res_payload = {
            data: absent_requests,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
    public static async checkIsFirst3Booking(
        regular_matched: any,
        start_time: number
    ) {
        if (regular_matched) {
            const listFirst3Booking = await BookingModel.aggregate([
                {
                    $match: {
                        student_id: regular_matched.student_id
                    }
                },
                {
                    $lookup: {
                        from: 'ordered-packages',
                        localField: 'ordered_package',
                        foreignField: '_id',
                        as: 'ordered-packages'
                    }
                },
                {
                    $match: {
                        'ordered-packages.type': {
                            $ne: EnumPackageOrderType.TRIAL
                        }
                    }
                },
                {
                    $limit: 3
                }
            ]);

            return {
                id: regular_matched.id,
                timestamp: start_time,
                regular_start_time: regular_matched.regular_start_time,
                student_id: regular_matched.student
                    ? regular_matched.student.id
                    : null,
                student_name: regular_matched.student
                    ? regular_matched.student.full_name
                    : null,
                ordered_package_name: regular_matched.ordered_package
                    ? regular_matched.ordered_package.package_name
                    : null,
                is_first_3_booking: listFirst3Booking.length < 3
            };
        }
        return null;
    }

    /**
     * @description POST request from teachers to request absent times in
     *              a period.
     * @bodyParam start_time <number> - Start of the period
     * @bodyParam end_time <number> - End of the period
     * @bodyParam teacher_note <string> - Teacher's note/description on
     *            this request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async createAbsentRequestByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.user.id;
        const { start_time, end_time, teacher_note } = req.body;
        if (!req.user.role.includes(RoleCode.TEACHER)) {
            throw new BadRequestError(
                req.t('errors.authentication.permission_denied')
            );
        }
        const teacher = await TeacherActions.findOne({ user_id: teacher_id });
        if (!teacher) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }
        if (start_time + 30 * MINUTE_TO_MS > end_time) {
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.invalid_time')
            );
        }
        const current_moment = new Date().getTime();
        if (end_time < current_moment) {
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.invalid_time')
            );
        }
        const check_request_filter = {
            teacher_id,
            start_time: { $lt: end_time },
            end_time: { $gt: start_time },
            status: [
                EnumTeacherAbsentRequestStatus.PENDING,
                EnumTeacherAbsentRequestStatus.APPROVED
            ]
        };
        const check_request = await TeacherAbsentRequestActions.findOne(
            check_request_filter
        );
        if (check_request) {
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.already_requested')
            );
        }

        const counter = await CounterActions.findOne();
        const id = counter.teacher_absent_request_id;
        const request = {
            id,
            teacher_id,
            status: EnumTeacherAbsentRequestStatus.APPROVED,
            start_time,
            end_time,
            teacher,
            teacher_note,
            list_regular_absent: [] as any
        };
        // const booking = await BookingActions.findOne({
        //     teacher_id,
        //     'calendar.start_time': { $gte: start_time },
        //     'calendar.end_time': { $lte: end_time }
        // });

        // if (
        //     booking &&
        //     ![
        //         EnumBookingStatus.STUDENT_ABSENT,
        //         EnumBookingStatus.CANCEL_BY_ADMIN,
        //         EnumBookingStatus.CANCEL_BY_STUDENT,
        //         EnumBookingStatus.CANCEL_BY_TEACHER,
        //         EnumBookingStatus.TEACHER_ABSENT,
        //         EnumBookingStatus.CHANGE_TIME
        //     ].includes(booking.status)
        // ) {
        //     await BookingController.onBookingStatusChange(
        //         req,
        //         booking,
        //         EnumBookingStatus.CANCEL_BY_TEACHER
        //     );
        //     booking.status = EnumBookingStatus.CANCEL_BY_TEACHER;
        //     await booking.save();
        //     const dataPayload = {
        //         student_name: booking.student.full_name,
        //         student_username: booking.student.username,
        //         student_id: booking.student.id,
        //         teacher_name: booking.teacher.full_name,
        //         start_time: moment(booking.calendar.start_time).format(
        //             'HH:mm DD/MM/YYYY'
        //         )
        //     };
        //     natsClient.publishEventZalo(
        //         booking.student,
        //         ZaloOANotification.TEACHER_REQUEST_ABSENT,
        //         dataPayload
        //     );
        // }
        // if (!booking) {
        //     const regular_matched = await RegularCalendarActions.findOne({
        //         regular_start_time: getTimestampInWeek(start_time),
        //         teacher_id,
        //         status: EnumRegularCalendarStatus.ACTIVE
        //     });
        //     if (regular_matched) {
        //         await TeacherAbsentRequestController.pushNotify(
        //             regular_matched,
        //             start_time
        //         );
        //         const reguarAbsent =
        //             await TeacherAbsentRequestController.checkIsFirst3Booking(
        //                 regular_matched,
        //                 start_time
        //             );
        //         if (reguarAbsent) {
        //             request.list_regular_absent.push(reguarAbsent);
        //         }
        //     }
        // }

        /**
         * Update the bookings and calendars in this period after the
         * request has been approved. No need for await here, just return
         * the success message to admin while server continues on
         * updating bookings and calendars
         */
        request.list_regular_absent =
            await TeacherAbsentRequestController.actionApproveAbsentRequestOfTeacher(
                req,
                request
            );

        await TeacherAbsentRequestActions.create(
            request as TeacherAbsentRequest
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description PUT request from teachers to edit the absent requests
     * @bodyParam start_time <number> - Start of the period
     * @bodyParam end_time <number> - End of the period
     * @bodyParam teacher_note <string> - Teacher's note/description on
     *            this request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async editAbsentRequestByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.user.id;
        const request_id = parseInt(req.params.request_id);
        let { start_time, end_time, teacher_note } = req.body;
        if (!(start_time || end_time || teacher_note)) {
            return new SuccessResponse(req.t('common.success'), {
                ok: true
            }).send(res, req);
        }
        const filter: any = {
            id: request_id,
            teacher_id,
            status: [EnumTeacherAbsentRequestStatus.PENDING]
        };
        const request = await TeacherAbsentRequestActions.findOne(filter);
        if (!request)
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.no_pending')
            );
        if (!start_time) start_time = request.start_time;
        if (!end_time) end_time = request.end_time;
        if (!teacher_note) teacher_note = request.teacher_note;
        if (start_time + 30 * MINUTE_TO_MS > end_time) {
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.invalid_time')
            );
        }
        const check_request_filter = {
            id: { $ne: request_id },
            teacher_id,
            start_time: { $lt: end_time },
            end_time: { $gt: start_time },
            status: [
                EnumTeacherAbsentRequestStatus.PENDING,
                EnumTeacherAbsentRequestStatus.APPROVED
            ]
        };
        const check_request = await TeacherAbsentRequestActions.findOne(
            check_request_filter
        );
        if (check_request) {
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.already_requested')
            );
        }
        const diff = {
            start_time,
            end_time,
            teacher_note
        };
        await TeacherAbsentRequestActions.update(request._id, {
            ...diff
        } as TeacherAbsentRequest);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
    public static async pushNotify(regular_matched: any, start_time: number) {
        if (regular_matched) {
            const notiTemplate = await TemplateActions.findOne({
                code: BackEndNotification.TEACHER_ABSENT_REGULAR_CALENDAR
            });
            const data = {
                teacher_name: `${regular_matched.teacher.full_name} - ${regular_matched.teacher.username}`,
                student_name: `${regular_matched.student.full_name} - ${regular_matched.student.username}`,
                start_time: start_time
            };
            if (notiTemplate) {
                // thông báo cho admin, giáo viên, hv
                natsClient.publishEventWithTemplate({
                    template: notiTemplate.content,
                    data,
                    receiver: regular_matched.teacher_id,
                    template_obj_id: notiTemplate._id
                });
                natsClient.publishEventWithTemplate({
                    template: notiTemplate.content,
                    data,
                    receiver: regular_matched.student_id,
                    template_obj_id: notiTemplate._id
                });
                const adminOwner = await AdminActions.findOne({
                    username: 'admin'
                });
                if (adminOwner) {
                    natsClient.publishEventWithTemplate({
                        template: notiTemplate.content,
                        data,
                        receiver: adminOwner._id,
                        template_obj_id: notiTemplate._id
                    });
                }
                // thông báo cho học thuật
                const hocThuatDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.HOC_THUAT
                });
                if (hocThuatDepartment) {
                    const operationIssue = await OperationIssueActions.create({
                        booking_id: null,
                        issue_description: 'Teacher absent regular calendar',
                        resolved_staff_id: null
                    } as any);
                    const operationIssueId = operationIssue?._id;

                    const managerHocThuat = await AdminModel.findOne({
                        department: {
                            department: hocThuatDepartment._id,
                            isRole: EnumRole.Manager
                        }
                    });
                    if (managerHocThuat) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data,
                            receiver: managerHocThuat._id,
                            template_obj_id: notiTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                    const listDeputyHT = await AdminModel.find({
                        'department.department': hocThuatDepartment._id,
                        'department.isRole': EnumRole.Deputy_manager
                    });

                    if (listDeputyHT.length) {
                        listDeputyHT.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplate.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                    const teacher = (await TeacherModel.findOne({
                        user_id: regular_matched.teacher_id
                    }).populate('staff')) as any;
                    if (teacher && teacher?.staff) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data,
                            receiver: teacher.staff._id,
                            template_obj_id: notiTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                }

                // thông báo cho cs
                const operationIssue = await OperationIssueActions.create({
                    booking_id: null,
                    issue_description: 'Teacher absent regular calendar',
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
                            template: notiTemplate.content,
                            data,
                            receiver: managerCskh._id,
                            template_obj_id: notiTemplate._id,
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
                                template: notiTemplate.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                    const listLeader = await AdminModel.find({
                        'department.department': cskhDepartment._id,
                        'department.isRole': EnumRole.Leader
                    });

                    if (listLeader.length) {
                        listLeader.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplate.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                    const student = await StudentModel.findOne({
                        user_id: regular_matched.student_id
                    }).populate('staff');
                    const checkExits = listLeader.find(
                        (e) => e.id === student?.staff?.id
                    );
                    if (student && student?.staff && !checkExits) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data,
                            receiver: student.staff._id,
                            template_obj_id: notiTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                }

                // thông báo cho all nhân viên phòng TNG
                const tngDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.TNG
                });
                if (tngDepartment) {
                    const allStaffTNG = await AdminModel.find({
                        'department.department': tngDepartment._id
                    });
                    if (allStaffTNG.length) {
                        allStaffTNG.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplate.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                }
            }

            // const dataPayload = {
            //     student_name: regular_matched.student.full_name,
            //     student_username: regular_matched.student.username,
            //     student_id: regular_matched.student.id,
            //     teacher_name: regular_matched.teacher.full_name,
            //     start_time: moment(start_time).format('HH:mm DD/MM/YYYY')
            // };
            // natsClient.publishEventZalo(
            //     regular_matched.student,
            //     ZaloOANotification.TEACHER_REQUEST_ABSENT,
            //     dataPayload
            // );
        }
    }

    /**
     * @description: PUT request from admin to approve or reject an absent request
     * @urlParam request_id <number> - ID of the request
     * @bodyParam status <number> - new status of the request
     * @bodyParam admin_note <string> - Admin's note on the request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async changeRequestStatusByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { status, admin_note } = req.body;
        const request_id = parseInt(req.params.request_id);
        const request = await TeacherAbsentRequestActions.findOne({
            id: request_id
        });
        if (!request)
            throw new BadRequestError(
                req.t('errors.teacher_absent_request.not_found')
            );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TeacherAbsentRequestModel',
            request,
            pickUpData
        );
        switch (status) {
            case EnumTeacherAbsentRequestStatus.REJECT_BY_ADMIN:
            case EnumTeacherAbsentRequestStatus.APPROVED:
                if (
                    EnumTeacherAbsentRequestStatus.PENDING != request.status &&
                    status != request.status
                ) {
                    throw new BadRequestError(
                        req.t(
                            'errors.teacher_absent_request.update_invalid_status'
                        )
                    );
                }

                break;
            case EnumTeacherAbsentRequestStatus.WITHDRAWN_BY_TEACHER:
                if (
                    EnumTeacherAbsentRequestStatus.APPROVED != request.status &&
                    status != request.status
                ) {
                    throw new BadRequestError(
                        req.t(
                            'errors.teacher_absent_request.update_invalid_status'
                        )
                    );
                }
                break;
            default:
                throw new BadRequestError(
                    req.t('errors.teacher_absent_request.update_invalid_status')
                );
                break;
        }

        const diff = {
            status,
            admin_note
        };
        const new_data = await TeacherAbsentRequestActions.update(
            request._id,
            diff as TeacherAbsentRequest
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'TeacherAbsentRequestModel',
            new_data,
            pickUpData
        );
        if (
            EnumTeacherAbsentRequestStatus.APPROVED == status &&
            status != request.status
        ) {
            const teacherData = await TeacherActions.findOne({
                user_id: request.teacher_id
            });
            if (teacherData) {
                request.teacher = teacherData;
            }

            await TeacherAbsentRequestController.actionApproveAbsentRequestOfTeacher(
                req,
                request
            );
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: DEL request from teachers to delete their own absent
     *               request if the request is still in pending
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteAbsentRequestByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.user.id;
        const request_id = parseInt(req.params.request_id);
        const filter: any = {
            id: request_id,
            teacher_id
        };
        const request = await TeacherAbsentRequestActions.findOne(filter);
        if (request) {
            if (EnumTeacherAbsentRequestStatus.PENDING != request.status) {
                throw new BadRequestError(
                    req.t('errors.teacher_absent_request.delete_invalid_status')
                );
            }
            await TeacherAbsentRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: DEL request from admin to delete a absent request
     * @urlParam request_id <number> - ID of the request
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteAbsentRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { request_id } = req.params;
        const request = await TeacherAbsentRequestActions.findOne({
            id: parseInt(request_id as string)
        });
        if (request) {
            await TeacherAbsentRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async actionApproveAbsentRequestOfTeacher(
        req: ProtectedRequest,
        request: any
    ) {
        logger.info(`Start active approve absent request of teacher >>>`);
        /**
         * Update the bookings and calendars in this period after the
         * request has been approved. No need for await here, just return
         * the success message to admin while server continues on
         * updating bookings and calendars
         */
        CalendarActions.absentOnAPeriod(
            request.teacher_id,
            request.start_time,
            request.end_time
        );
        BookingController.absentPeriodByTeacher(
            req,
            request.teacher_id,
            request.start_time,
            request.end_time,
            request.teacher_note
        );
        if (!request.list_regular_absent) {
            request.list_regular_absent = [];
        }
        let start_time_check = request.start_time;
        let end_time_check = request.end_time;
        const listTime = [];
        while (start_time_check < end_time_check) {
            if (moment(start_time_check).hour() >= 7) {
                listTime.push(start_time_check);
            }
            start_time_check = moment(start_time_check)
                .add(30, 'minute')
                .valueOf();
        }
        await Promise.all(
            listTime.map(async (e) => {
                const regular_matched = await RegularCalendarActions.findOne({
                    regular_start_time: getTimestampInWeek(e),
                    teacher_id: request.teacher_id,
                    status: EnumRegularCalendarStatus.ACTIVE
                });
                if (regular_matched) {
                    logger.info(
                        `teacher absent - regular calendar data: ${JSON.stringify(
                            regular_matched
                        )}`
                    );
                    let calendar_endTime = moment(e)
                        .add(30, 'minute')
                        .valueOf();
                    if (calendar_endTime > request.end_time) {
                        calendar_endTime = request.end_time;
                    }

                    const booking = await BookingActions.findOne({
                        teacher_id: request.teacher_id,
                        'calendar.start_time': { $gte: e },
                        'calendar.end_time': { $lte: calendar_endTime }
                    });

                    const reguarAbsent =
                        await TeacherAbsentRequestController.checkIsFirst3Booking(
                            regular_matched,
                            e
                        );

                    /**
                     * Khi approved Leave request thì cần check xem regular calendars đã có booking chưa.
                     * Nếu đã có booking của giáo viên này rồi thì ko lưu vào teacher-absent-requests.list_regular_absent nữa để ko bị phạt 2 lần.
                     */
                    if (!booking && reguarAbsent) {
                        request.list_regular_absent.push(reguarAbsent);
                    }
                    await TeacherAbsentRequestActions.update(request._id, {
                        list_regular_absent: request.list_regular_absent
                    });
                }
                await TeacherAbsentRequestController.pushNotify(
                    regular_matched,
                    e
                );
            })
        );
        const start = moment(request.start_time);
        const end = moment(request.end_time);
        // get the difference between the moments
        const diff = end.diff(start);
        //express as a duration
        const diffDuration = moment.duration(diff).asMinutes();
        // thông báo cho admin, học thuật khi yêu cầu xin nghỉ của gv từ 3 slot time trở lên 3 * 30 minutes
        logger.info(`diffDuration: ${diffDuration}`);
        logger.info(`teacher data: ${JSON.stringify(request.teacher.user)}`);
        if (diffDuration >= 90 && request.teacher.user) {
            const notiTemplate = await TemplateActions.findOne({
                code: BackEndNotification.TEACHER_REQUEST_LEAVE_OVER_TIME_SLOT
            });
            const data = {
                teacher_name: `${request.teacher.user?.full_name} - ${request.teacher.user?.username}`,
                start_time: request.start_time,
                end_time: request.end_time
            };
            if (notiTemplate) {
                // thông báo cho admin, học thuật
                const adminOwner = await AdminActions.findOne({
                    username: 'admin'
                });
                if (adminOwner) {
                    natsClient.publishEventWithTemplate({
                        template: notiTemplate.content,
                        data,
                        receiver: adminOwner._id,
                        template_obj_id: notiTemplate._id
                    });
                }
                // thông báo cho học thuật
                const hocThuatDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.HOC_THUAT
                });
                if (hocThuatDepartment) {
                    const operationIssue = await OperationIssueActions.create({
                        booking_id: null,
                        issue_description:
                            'Teacher request leave over time slot',
                        resolved_staff_id: null
                    } as any);
                    const operationIssueId = operationIssue?._id;

                    const managerHocThuat = await AdminModel.findOne({
                        department: {
                            department: hocThuatDepartment._id,
                            isRole: EnumRole.Manager
                        }
                    });
                    if (managerHocThuat) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data,
                            receiver: managerHocThuat._id,
                            template_obj_id: notiTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                    const listDeputyHT = await AdminModel.find({
                        'department.department': hocThuatDepartment._id,
                        'department.isRole': EnumRole.Deputy_manager
                    });

                    if (listDeputyHT.length) {
                        listDeputyHT.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplate.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                    const teacher = (await TeacherModel.findOne({
                        user_id: request.teacher_id
                    }).populate('staff')) as any;
                    if (teacher && teacher?.staff) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data,
                            receiver: teacher.staff._id,
                            template_obj_id: notiTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                }
            }
        }
        logger.info(`End active approve absent request of teacher <<<`);
        return request.list_regular_absent;
    }
}
