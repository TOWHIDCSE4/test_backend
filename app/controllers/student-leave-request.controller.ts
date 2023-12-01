import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import StudentLeaveRequestActions from '../actions/student-leave-request';
import StudentLeaveRequest, {
    EnumStudentLeaveRequestSource,
    EnumStudentLeaveRequestStatus
} from '../models/student-leave-request';
import { MINUTE_TO_MS } from '../const/date-time';
import _ from 'lodash';
import StudentActions from '../actions/student';
import BookingActions from '../actions/booking';
import Booking, { EnumBookingStatus } from '../models/booking';
import BookingController from './booking.controller';
import { RoleCode } from '../const/role';
import moment from 'moment';
import TeacherActions from '../actions/teacher';
import CounterActions from '../actions/counter';
import TemplateActions from '../actions/template';
import { BackEndNotification } from '../const/notification';
import UserActions from '../actions/user';
import AdminActions from '../actions/admin';
import * as natsClient from '../services/nats/nats-client';
import { DepartmentModel } from '../models/department';
import OperationIssueActions from '../actions/operation-issue';
import { CODE_DEPARTMENT } from '../const/department';
import { StudentModel } from '../models/student';
import { AdminModel } from '../models/admin';
import { EnumRole } from '../models/department';

const logger = require('dy-logger');

export default class StudentLeaveRequestController {
    public static async getAllLeaveRequestsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, student_id, start_time, end_time } =
            req.query;

        const filter: any = {
            start_time: start_time
                ? { $gte: parseInt(start_time as string) }
                : null,
            end_time: end_time ? { $lte: parseInt(end_time as string) } : null,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (student_id) {
            filter.student_id = parseInt(student_id as string);
        }

        const temp: any = await StudentLeaveRequestActions.findEachPage(filter);

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

    public static async createLeaveRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id, start_time, end_time, admin_note } = req.body;
        const student = await StudentActions.findOne({ user_id: student_id });
        if (!student) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }
        const current_moment = new Date().getTime();
        if (start_time + 30 * MINUTE_TO_MS > end_time) {
            throw new BadRequestError(
                req.t('errors.student_leave_request.invalid_time')
            );
        }
        if (end_time < current_moment) {
            throw new BadRequestError(
                req.t('errors.student_leave_request.invalid_time')
            );
        }
        const check_request_filter = {
            student_id,
            start_time: { $lt: end_time },
            end_time: { $gt: start_time }
        };
        const check_request = await StudentLeaveRequestActions.findOne(
            check_request_filter
        );
        if (check_request) {
            throw new BadRequestError(
                req.t('errors.student_leave_request.already_requested')
            );
        }
        const request: any = {
            student_id,
            start_time,
            end_time,
            student,
            admin_note,
            source: EnumStudentLeaveRequestSource.ADMIN,
            creator_id: req.user.id
        };
        const counter = await CounterActions.findOne({});
        request.id = counter.student_leave_request_id;
        await StudentLeaveRequestActions.create(request as StudentLeaveRequest);

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async deleteLeaveRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { request_id } = req.params;
        const request = await StudentLeaveRequestActions.findOne({
            _id: request_id
        });
        if (request) {
            await StudentLeaveRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    // function student page

    public static async getAllLeaveRequestsByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, status, start_time, end_time } =
            req.query;
        const filter: any = {
            student_id: req.user.id,
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
        const leave_requests =
            await StudentLeaveRequestActions.findAllAndPaginated(
                filter,
                {},
                { id: -1 }
            );
        const count = await StudentLeaveRequestActions.count(filter);
        const res_payload = {
            data: leave_requests,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createLeaveRequestByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const student_id = parseInt(req.user.id as string);
        logger.info(
            'createLeaveRequestByStudent >>>  - student_id: ' + student_id
        );
        const { reason } = req.body;
        const start_time = parseInt(req.body.start_time as string);
        const end_time = parseInt(req.body.end_time as string);
        if (!req.user.role.includes(RoleCode.STUDENT)) {
            throw new BadRequestError(
                req.t('errors.authentication.permission_denied')
            );
        }
        const student = await StudentActions.findOne({ user_id: student_id });
        if (!student) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }
        if (start_time + 30 * MINUTE_TO_MS > end_time) {
            throw new BadRequestError(
                req.t('errors.student_leave_request.invalid_time')
            );
        }
        const current_moment = new Date().getTime();
        if (end_time < current_moment) {
            throw new BadRequestError(
                req.t('errors.student_leave_request.invalid_time')
            );
        }

        const check_request_filter = {
            student_id,
            start_time: { $lt: end_time },
            end_time: { $gt: start_time },
            status: {
                $in: [
                    EnumStudentLeaveRequestStatus.APPROVED,
                    EnumStudentLeaveRequestStatus.PENDING
                ]
            }
        };
        const check_request = await StudentLeaveRequestActions.findOne(
            check_request_filter
        );
        if (check_request) {
            throw new BadRequestError(
                req.t('errors.student_leave_request.already_requested')
            );
        }
        const request: any = {
            student_id,
            start_time,
            end_time,
            student,
            reason,
            source: EnumStudentLeaveRequestSource.STUDENT,
            creator_id: req.user.id
        };
        const currentTime = moment().valueOf();
        const filterBookings: any = {
            student_id,
            status: [EnumBookingStatus.PENDING, EnumBookingStatus.CONFIRMED],
            'calendar.start_time': { $gte: start_time, $lt: end_time }
        };

        const checkBookings = await BookingActions.findAll(filterBookings);
        if (checkBookings) {
            logger.info('start change status booking ' + checkBookings?.length);
            for await (const booking of checkBookings) {
                logger.info('check change status booking id: ' + booking?.id);
                if (booking.calendar.start_time >= currentTime) {
                    let status = EnumBookingStatus.CANCEL_BY_STUDENT;
                    const teacherData = await TeacherActions.findOne({
                        user_id: booking.teacher_id
                    });
                    const cancelTime =
                        teacherData?.location?.cancel_time ?? 180;
                    const timeCheck =
                        (booking.calendar.start_time - currentTime) /
                        MINUTE_TO_MS;
                    if (timeCheck < cancelTime) {
                        status = EnumBookingStatus.STUDENT_ABSENT;
                    }
                    logger.info('check status: ' + status);
                    await BookingController.onBookingStatusChange(
                        req,
                        booking,
                        status
                    );
                    await BookingActions.update(booking._id, {
                        status
                    } as Booking);
                }
            }
        }

        const counter = await CounterActions.findOne({});
        request.id = counter.student_leave_request_id;
        const requestData: any = await StudentLeaveRequestActions.create(
            request as StudentLeaveRequest
        );
        const studentData: any = await UserActions.findOne({ id: student_id });
        if (requestData && studentData) {
            const operationIssue = await OperationIssueActions.create({
                booking_id: null,
                issue_description: 'Notification student request leave',
                resolved_staff_id: null
            } as any);
            const operationIssueId = operationIssue?._id;
            const templatePayload = {
                student_name: `${studentData?.full_name}`,
                start_time,
                end_time
            };
            const notiStudentRequestLeave = await TemplateActions.findOne({
                code: BackEndNotification.STUDENT_REQUEST_LEAVE
            });
            // Thông báo cho admin
            const adminOwner = await AdminActions.findOne({
                username: 'admin'
            });
            if (adminOwner && notiStudentRequestLeave) {
                natsClient.publishEventWithTemplate({
                    template: notiStudentRequestLeave.content,
                    data: templatePayload,
                    receiver: adminOwner._id,
                    template_obj_id: notiStudentRequestLeave._id
                });
            }
            // Thông báo cho cs
            const cskhDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.CSKH
            });
            if (cskhDepartment && notiStudentRequestLeave) {
                const managerCskh = await AdminModel.findOne({
                    department: {
                        department: cskhDepartment._id,
                        isRole: EnumRole.Manager
                    }
                });
                if (managerCskh) {
                    natsClient.publishEventWithTemplate({
                        template: notiStudentRequestLeave.content,
                        data: templatePayload,
                        receiver: managerCskh._id,
                        template_obj_id: notiStudentRequestLeave._id,
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
                            template: notiStudentRequestLeave.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiStudentRequestLeave._id,
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
                            template: notiStudentRequestLeave.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiStudentRequestLeave._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
                // thông báo cho nhân viên quản lý
                const student = await StudentModel.findOne({
                    user_id: student_id
                }).populate('staff');
                const checkExits = listLeader.find(
                    (e) => e.id === student?.staff?.id
                );
                if (student && student?.staff && !checkExits) {
                    natsClient.publishEventWithTemplate({
                        template: notiStudentRequestLeave.content,
                        data: templatePayload,
                        receiver: student.staff._id,
                        template_obj_id: notiStudentRequestLeave._id,
                        operation_issue_id: operationIssueId
                    });
                }
            }
        }
        logger.info('createLeaveRequestByStudent <<<<');
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getLeaveRequestForCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            start_time,
            end_time,
            page_number,
            page_size,
            last_booking_id
        } = req.body;
        const filter: any = {
            start_time: start_time ? parseInt(start_time as string) : null,
            end_time: end_time ? parseInt(end_time as string) : null,
            page_number,
            page_size,
            last_booking_id
        };

        const temp: any =
            await StudentLeaveRequestActions.findLeaveRequestAndBooking(filter);
        const data = temp.length > 0 ? temp || [] : [];
        const res_payload = {
            list_leave_request_bookings: data
        };

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async cancelBookingByStudentLeaveRequestForCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const { booking_ids } = req.body;
        const filter = {
            id: { $in: booking_ids }
        };
        const bookings = await BookingActions.findAllByArrayId(filter);
        // boooking 1: orrder package: count 10 -> 9
        // boooking 2: orrder package: count 10 -> 9
        for (const booking of bookings) {
            if (
                booking &&
                booking.status != EnumBookingStatus.CANCEL_BY_STUDENT
            ) {
                await BookingController.onBookingStatusChange(
                    req,
                    booking,
                    EnumBookingStatus.CANCEL_BY_STUDENT
                );
                booking.status = EnumBookingStatus.CANCEL_BY_STUDENT;
                await booking.save();
            }
        }

        const res_payload = {};

        return new SuccessResponse('success', res_payload).send(res, req);
    }
}
