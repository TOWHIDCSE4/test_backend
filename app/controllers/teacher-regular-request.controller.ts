import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError, InternalError } from '../core/ApiError';
import TeacherRegularRequestActions from '../actions/teacher-regular-request';
import CounterActions from '../actions/counter';
import TeacherRegularRequest, {
    TeacherRegularRequestModel
} from '../models/teacher-regular-request';
import { RoleCode } from '../const/role';
import {
    MIN_MONTH_TO_REQUEST_CLOSE_REGULAR,
    WEEK_TO_MS
} from '../const/date-time';
import {
    isValidStartTimestamp,
    isTheSameTimestampSet,
    getStartOfTheWeek,
    parse1970ToTimestampInWeek
} from '../utils/datetime-utils';
import UserController from './user.controller';
import TeacherActions from '../actions/teacher';
import _ from 'lodash';
import moment from 'moment';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import UserActions from '../actions/user';
import { DepartmentModel, EnumRole } from '../models/department';
import { CODE_DEPARTMENT } from '../const/department';
import { AdminModel } from '../models/admin';
import { TeacherModel } from '../models/teacher';
import * as natsClient from '../services/nats/nats-client';
import TemplateActions from '../actions/template';
import { BackEndNotification } from '../const/notification';
import AdminActions from '../actions/admin';
import RegularCalendarActions from '../actions/regular-calendar';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';
import OperationIssueActions from '../actions/operation-issue';

const logger = require('dy-logger');
const pickUpData = [
    '_id',
    'id',
    'teacher_id',
    'old_regular_times',
    'regular_times',
    'status',
    'admin_note'
];
export default class TeacherRegularRequestController {
    /**
     * @description: GET request from admin to search for regular requests
     * @queryParam: teacher_id <number> - ID of the teacher
     * @queryParam: status - status of the requests
     * @queryParam: page_size - Number of requests returned (used for pagination)
     * @queryParam: page_number - Number of the page in the search result
     * @return: SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getAllRegularRequestsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, teacher_id, status, search } =
            req.query;
        const filter: any = {
            teacher_id,
            status: parseInt(status as string),
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search
        };
        const temp: any = await TeacherRegularRequestActions.findEachPage(
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
     * @description: GET request from teachers to get their current regular request
     * @return: SuccessResponse with the pending request or SuccessResponse with
     *          empty data or BadRequestError
     */
    public static async getCurrentRegularRequestByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const filter: any = {
            teacher_id: id,
            status: 2
        };
        let request;
        const count = await TeacherRegularRequestActions.count(filter);
        if (count > 1)
            throw new InternalError(
                req.t('errors.teacher_regular_request.only_one')
            );
        if (count == 0) {
            request = {};
        } else {
            request = await TeacherRegularRequestActions.findOne(filter, {
                teacher_id: 0,
                teacher: 0
            });
        }
        return new SuccessResponse('success', request).send(res, req);
    }

    /**
     * @description: GET request from teachers to get their current regular request
     * @return: SuccessResponse with the pending request or SuccessResponse with
     *          empty data or BadRequestError
     */
    public static async getAllRegularRequestsByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { page_size, page_number } = req.query;
        const filter: any = {
            teacher_id: id,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        const regular_requests =
            await TeacherRegularRequestActions.findAllAndPaginated(filter, {
                teacher_id: 0,
                teacher: 0
            });
        const count = await TeacherRegularRequestActions.count(filter);
        const res_payload = {
            data: regular_requests,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /**
     * @description: POST request from teachers to request regular times in
     *               week to teach. Only 1 request can be confirmed or in
     *               pending at a time.
     * @bodyParam: regular_times <number[]> - array of timestamp in the week
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async createRegularRequest(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.user.id;
        if (!req.user.role.includes(RoleCode.TEACHER)) {
            throw new BadRequestError(
                req.t('errors.authentication.permission_denied')
            );
        }
        const teacher = await TeacherActions.findOne({ user_id: teacher_id });
        if (!teacher)
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        const count = await TeacherRegularRequestActions.count({
            teacher_id,
            status: 2
        });
        if (count >= 1)
            throw new BadRequestError(
                req.t('errors.teacher_regular_request.only_one')
            );

        let { regular_times, admin_note } = req.body;
        if (!regular_times || !Array.isArray(regular_times)) {
            throw new BadRequestError(
                req.t('errors.user.no_regular_times_array')
            );
        }
        const timestamp_set = new Set<number>();
        regular_times.forEach((timestamp) => {
            if (timestamp >= WEEK_TO_MS || !isValidStartTimestamp(timestamp)) {
                throw new BadRequestError(
                    req.t('errors.user.invalid_time_input')
                );
            }
            timestamp_set.add(timestamp);
        });
        regular_times = Array.from(timestamp_set);
        const userTeacher = await UserActions.findOne({ id: teacher_id });
        const old_regular_times = userTeacher ? userTeacher.regular_times : [];
        if (
            userTeacher?.regular_times &&
            isTheSameTimestampSet(regular_times, userTeacher?.regular_times)
        ) {
            throw new BadRequestError(
                req.t('errors.teacher_regular_request.no_change')
            );
        }
        const removed_timestamps = _.difference(
            old_regular_times,
            regular_times
        );
        for (const timestamp of removed_timestamps) {
            const check_removed_timestamp =
                await RegularCalendarActions.findOne({
                    teacher_id,
                    status: [
                        EnumRegularCalendarStatus.ACTIVE,
                        EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                        EnumRegularCalendarStatus.EXPIRED
                    ],
                    regular_start_time: timestamp
                });
            if (check_removed_timestamp) {
                throw new BadRequestError(
                    req.t(
                        'errors.teacher_regular_request.match_student',
                        moment(
                            parse1970ToTimestampInWeek(timestamp as number)
                        ).format('dddd - HH:mm'),
                        check_removed_timestamp.student.full_name
                    )
                );
            }
        }
        const first_open_request = await TeacherRegularRequestModel.findOne({
            teacher_id,
            status: 1 /** CONFIRMED */
        })
            .sort({
                created_time: 1
            })
            .exec();
        let status = 2;
        let is_updated = false;
        if (first_open_request) {
            const created_time = first_open_request.created_time;
            const numDate =
                moment(moment().valueOf()).diff(moment(created_time), 'day') %
                (MIN_MONTH_TO_REQUEST_CLOSE_REGULAR * 30);
            console.log(numDate);
            if (numDate <= 3) {
                status = 1;
            }
            if (numDate > 3) {
                const last_open_request =
                    await TeacherRegularRequestModel.findOne({
                        teacher_id,
                        status: 1 /** CONFIRMED */
                    })
                        .sort({
                            created_time: -1
                        })
                        .exec();
                if (last_open_request && !last_open_request.is_updated) {
                    status = 1;
                    is_updated = true;
                    last_open_request.is_updated = true;
                    await last_open_request.save();
                }
            }
        } else {
            status = 1;
        }

        const counter = await CounterActions.findOne();
        const id = counter.teacher_regular_request_id;
        const request = {
            id,
            teacher_id,
            status: status,
            old_regular_times,
            regular_times,
            is_updated,
            teacher,
            admin_note
        };
        const regularRequest = await TeacherRegularRequestActions.create(
            request as TeacherRegularRequest
        );
        if (regularRequest.status == 1) {
            await UserController.setUserRegularTimes(
                req,
                request.regular_times,
                request.teacher_id
            );
            TeacherRegularRequestController.notifyUpdateRegularRequest(
                regularRequest
            );
        }

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async notifyUpdateRegularRequest(
        request: TeacherRegularRequest
    ) {
        const user = await UserActions.findOne({
            id: request.teacher_id
        });
        if (user) {
            const notiTemplate = await TemplateActions.findOne({
                code: BackEndNotification.TEACHER_UPDATE_REGULAR_CALENDAR
            });
            const data = {
                teacher_name: `${user.full_name} - ${user.username}`
            };
            if (notiTemplate) {
                // thông báo cho admin
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
                        issue_description: 'Update regular',
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

                // thông báo cho cs
                const cskhDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.CSKH
                });
                if (cskhDepartment) {
                    const operationIssue = await OperationIssueActions.create({
                        booking_id: null,
                        issue_description: 'Update regular',
                        resolved_staff_id: null
                    } as any);
                    const operationIssueId = operationIssue?._id;

                    const listStaff = await AdminActions.findAll({
                        'department.department': cskhDepartment._id
                    });
                    listStaff.forEach((e) => {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data,
                            receiver: e._id,
                            template_obj_id: notiTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
            }
        }
    }

    /**
     * @description: PUT request from admin to approve or cancel a regular request
     * @urlParam: request_id <number> - ID of the request
     * @bodyParam: status <number> - new status of the request
     * @bodyParam: admin_note <number> - admin's note on the request
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async changeRequestStatusByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { status, admin_note } = req.body;
        const { request_id } = req.params;
        logger.info(
            `changeRequestStatusByAdmin start: req: ${JSON.stringify(
                req.body
            )}, request id: ${request_id}`
        );
        const request = await TeacherRegularRequestActions.findOne({
            id: parseInt(request_id as string)
        });
        if (!request)
            throw new BadRequestError(
                req.t('errors.teacher_regular_request.not_found')
            );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TeacherRegularRequestModel',
            request,
            pickUpData
        );
        if (2 != request.status) {
            throw new BadRequestError(
                req.t(
                    'errors.teacher_regular_request.only_update_pending_status'
                )
            );
        }
        if (1 == status) {
            /* The request has been confirmed, let's update the teachers'
             * regular calendars
             */
            await UserController.setUserRegularTimes(
                req,
                request.regular_times,
                request.teacher_id
            );
            TeacherRegularRequestController.notifyUpdateRegularRequest(request);
        }
        const diff = {
            status,
            admin_note
        };
        const new_data = await TeacherRegularRequestActions.update(
            request._id,
            diff as TeacherRegularRequest
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'TeacherRegularRequestModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    /**
     * @description: DEL request from teachers to delete their own regular
     *               request if the request is still in pending
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteRegularRequestByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.user.id;
        const filter: any = {
            teacher_id,
            status: 2
        };
        const count = await TeacherRegularRequestActions.count(filter);
        if (count > 1)
            throw new InternalError(
                req.t('errors.teacher_regular_request.only_one')
            );
        const request = await TeacherRegularRequestActions.findOne(filter);
        if (request) {
            await TeacherRegularRequestActions.remove(request._id);
        }
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    /**
     * @description: DEL request from admin to delete a regular request
     * @urlParam: request_id <number> - ID of the request
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteRegularRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { request_id } = req.params;
        const request = await TeacherRegularRequestActions.findOne({
            id: parseInt(request_id as string)
        });
        if (request) {
            await TeacherRegularRequestActions.remove(request._id);
        }
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }
}
