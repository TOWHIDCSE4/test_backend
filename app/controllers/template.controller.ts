import {
    BackEndNotification,
    BackEndEvent,
    ZaloOANotification,
    NOTIFICATION_FILTERS,
    NOTIFICATION_STUDENT_FILTERS,
    ARRAY_NOTIFICATION_STUDENT_CODE
} from './../const/notification';
import { ProtectedRequest } from 'app-request';
import { request, Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import TemplateActions from '../actions/template';
import Template, { EnumTemplateType } from '../models/template';
import { EmailTemplate } from '../const/notification';
import _ from 'lodash';
import { BadRequestError } from '../core/ApiError';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import axios from 'axios';
import config from 'config';
import { DepartmentModel } from '../models/department';
import { CODE_DEPARTMENT } from '../const/department';
const pickUpData = ['_id', 'type', 'code', 'description', 'title', 'content'];
const logger = require('dy-logger');
const NOTIFY_API_URL = config.get('services.notification.url');
const INTERNAL_KEY = config.get('services.notification.key');
export default class TemplateController {
    public static async getTemplatesPaginated(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, type, search } = req.query;
        const filter = {
            page_size: +(page_size as string),
            page_number: +(page_number as string),
            type: type as any,
            search: search as string
        };
        const templates = await TemplateActions.findAllAndPaginated(filter);
        const count = await TemplateActions.count(filter);
        const res_payload = {
            data: templates,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createTemplate(req: ProtectedRequest, res: Response) {
        const templateInfo = {
            ...req.body,
            type: req.body.type as EnumTemplateType
        };
        const newTemplate = await TemplateActions.create({
            ...templateInfo
        } as Template);
        return new SuccessResponse(req.t('common.success'), newTemplate).send(
            res,
            req
        );
    }

    public static async editTemplate(req: ProtectedRequest, res: Response) {
        const { _id } = req.params;
        const diff = { ...req.body };
        const old_data = await TemplateActions.findOne({ _id });
        if (!old_data) {
            throw new BadRequestError();
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TemplateModel',
            old_data,
            pickUpData
        );
        const new_data = await TemplateActions.update(_id, {
            ...diff
        } as Template);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'TemplateModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async removeTemplate(req: ProtectedRequest, res: Response) {
        const { _id } = req.params;
        await TemplateActions.remove(_id);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getTemplateCodes(req: ProtectedRequest, res: Response) {
        const EnumTemplateCode = {
            email: { ...EmailTemplate },
            notification: { ...BackEndNotification },
            event: { ...BackEndEvent },
            zalo: { ...ZaloOANotification }
        };
        return new SuccessResponse(
            req.t('common.success'),
            EnumTemplateCode
        ).send(res, req);
    }

    public static async getTemplateFilters(
        req: ProtectedRequest,
        res: Response
    ) {
        const { fromDate, toDate, filter_type } = req.query;
        let arrayFilter = ['none'];
        const adminDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.ADMIN
        });
        const csDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.CSKH
        });
        const htDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.HOC_THUAT
        });
        const tngDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.TNG
        });
        const hcnsDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.HCNS
        });
        if (
            req?.user?.department?.id &&
            adminDepartment &&
            csDepartment &&
            htDepartment &&
            tngDepartment &&
            hcnsDepartment
        ) {
            switch (req?.user?.department?.id) {
                case adminDepartment?.id:
                    arrayFilter = [
                        NOTIFICATION_FILTERS.TEACHER_ABSENT_REGULAR_CALENDAR
                            .CODE,
                        NOTIFICATION_FILTERS.STUDENT_REQUEST_LEAVE.CODE,
                        NOTIFICATION_FILTERS.SUBSTITUTE_BOOKING_FOR_ADMIN.CODE,
                        NOTIFICATION_FILTERS.TEACHER_LATE_TO_CLASS_FOR_ADMIN
                            .CODE,
                        NOTIFICATION_FILTERS
                            .TEACHER_REQUEST_LEAVE_OVER_TIME_SLOT.CODE,
                        NOTIFICATION_FILTERS.CREATE_BOOKING_FOR_ADMIN.CODE,
                        NOTIFICATION_FILTERS.ALERT_ORDERED_PACKAGE_WILL_EXPIRE
                            .CODE,
                        NOTIFICATION_FILTERS.UPDATE_STATUS_BOOKING.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_ABSENT.CODE,
                        NOTIFICATION_FILTERS.CHANGE_TEACHER_BY_CRONJOB.CODE,
                        NOTIFICATION_FILTERS.NEXT_COURSE.CODE,
                        NOTIFICATION_FILTERS.FINISH_CURRICULUM.CODE,
                        NOTIFICATION_FILTERS.STUDENT_SUBMIT_IELTS_WRITING.CODE,
                        NOTIFICATION_FILTERS.ALERT_DO_NOT_HOMEWORK.CODE,
                        NOTIFICATION_FILTERS.DUPLICATE_STUDENT_INFORMATION.CODE,
                        NOTIFICATION_FILTERS.UPDATE_STATUS_SCHEDULE.CODE,
                        NOTIFICATION_FILTERS.STA_BOOKING_REMINDER_FOR_ADMIN.CODE,
                        NOTIFICATION_FILTERS.NOTIFICATION_VIA_STUDENT_EMAIL.CODE
                    ];
                    break;
                case csDepartment?.id:
                    arrayFilter = [
                        NOTIFICATION_FILTERS.STUDENT_REQUEST_LEAVE.CODE,
                        NOTIFICATION_FILTERS.SUBSTITUTE_BOOKING_FOR_ADMIN.CODE,
                        NOTIFICATION_FILTERS.TEACHER_LATE_TO_CLASS_FOR_ADMIN
                            .CODE,
                        NOTIFICATION_FILTERS.ALERT_ORDERED_PACKAGE_WILL_EXPIRE
                            .CODE,
                        NOTIFICATION_FILTERS.UPDATE_STATUS_BOOKING.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_ABSENT.CODE,
                        NOTIFICATION_FILTERS.CHANGE_TEACHER_BY_CRONJOB.CODE,
                        NOTIFICATION_FILTERS.NEXT_COURSE.CODE,
                        NOTIFICATION_FILTERS.FINISH_CURRICULUM.CODE,
                        NOTIFICATION_FILTERS.ALERT_DO_NOT_HOMEWORK.CODE,
                        NOTIFICATION_FILTERS.UPDATE_STATUS_SCHEDULE.CODE,
                        NOTIFICATION_FILTERS.STA_BOOKING_REMINDER_FOR_ADMIN.CODE,
                        NOTIFICATION_FILTERS.NOTIFICATION_VIA_STUDENT_EMAIL.CODE
                    ];
                    break;
                case htDepartment?.id:
                    arrayFilter = [
                        NOTIFICATION_FILTERS.TEACHER_LATE_TO_CLASS_FOR_ADMIN
                            .CODE,
                        NOTIFICATION_FILTERS
                            .TEACHER_REQUEST_LEAVE_OVER_TIME_SLOT.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.CODE,
                        NOTIFICATION_FILTERS.STUDENT_SUBMIT_IELTS_WRITING.CODE
                    ];
                    break;
                case tngDepartment?.id:
                    arrayFilter = [
                        NOTIFICATION_FILTERS.SUBSTITUTE_BOOKING_FOR_ADMIN.CODE,
                        NOTIFICATION_FILTERS.TEACHER_LATE_TO_CLASS_FOR_ADMIN
                            .CODE,
                        NOTIFICATION_FILTERS.UPDATE_STATUS_BOOKING.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_CANCEL.CODE,
                        NOTIFICATION_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_ABSENT.CODE,
                        NOTIFICATION_FILTERS.ALERT_DO_NOT_HOMEWORK.CODE,
                        NOTIFICATION_FILTERS.CHANGE_TEACHER_BY_CRONJOB.CODE,
                        NOTIFICATION_FILTERS.NOTIFICATION_VIA_STUDENT_EMAIL.CODE
                    ];
                    break;
                case hcnsDepartment?.id:
                    arrayFilter = [
                        NOTIFICATION_FILTERS.DUPLICATE_STUDENT_INFORMATION.CODE
                    ];
                    break;
                default: {
                    arrayFilter = ['none'];
                }
            }
        }

        const template = await TemplateActions.find({
            type: EnumTemplateType.NOTIFICATION,
            code: {
                $in: arrayFilter
            }
        });
        const templateObjIds = template.map((e) => e._id);
        let totals: any = null;
        try {
            logger.info(`getTemplateFilters, req.user._id: ${req.user?._id}`);
            const route = `${NOTIFY_API_URL}/admin/notifications/total-unseen-types-notifications-by-admin`;
            const headers = {
                'api-key': INTERNAL_KEY,
                'Content-Type': 'application/json; charset=utf-8'
            };
            const response = await axios({
                method: 'post',
                url: route,
                headers,
                data: {
                    _id: req.user._id,
                    template_obj_ids: templateObjIds,
                    filter_type: filter_type,
                    fromDate: fromDate,
                    toDate: toDate
                }
            });
            logger.info(
                `getTotalUnseenTypesNotificationsByAdmin, response.data: ${JSON.stringify(
                    response.data
                )}`
            );
            totals = response.data.data;
        } catch (err: any) {
            logger.error(
                'getTotalUnseenTypesNotificationsByAdmin, error: ',
                err?.message
            );
        }

        const templateFilters: any = [];
        if (template) {
            template.map((e) => {
                // Tạm ẩn để tăng performance
                // if (totals[e._id]?.total > 0) {
                switch (e.code) {
                    case NOTIFICATION_FILTERS.TEACHER_ABSENT_REGULAR_CALENDAR
                        .CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .TEACHER_ABSENT_REGULAR_CALENDAR.LABEL,
                            code: NOTIFICATION_FILTERS
                                .TEACHER_ABSENT_REGULAR_CALENDAR.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.STUDENT_REQUEST_LEAVE.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.STUDENT_REQUEST_LEAVE
                                .LABEL,
                            code: NOTIFICATION_FILTERS.STUDENT_REQUEST_LEAVE
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.TEACHER_LATE_TO_CLASS_FOR_ADMIN
                        .CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .TEACHER_LATE_TO_CLASS_FOR_ADMIN.LABEL,
                            code: NOTIFICATION_FILTERS
                                .TEACHER_LATE_TO_CLASS_FOR_ADMIN.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS
                        .TEACHER_REQUEST_LEAVE_OVER_TIME_SLOT.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .TEACHER_REQUEST_LEAVE_OVER_TIME_SLOT.LABEL,
                            code: NOTIFICATION_FILTERS
                                .TEACHER_REQUEST_LEAVE_OVER_TIME_SLOT.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.CREATE_BOOKING_FOR_ADMIN.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.CREATE_BOOKING_FOR_ADMIN
                                .LABEL,
                            code: NOTIFICATION_FILTERS.CREATE_BOOKING_FOR_ADMIN
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.ALERT_ORDERED_PACKAGE_WILL_EXPIRE
                        .CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .ALERT_ORDERED_PACKAGE_WILL_EXPIRE.LABEL,
                            code: NOTIFICATION_FILTERS
                                .ALERT_ORDERED_PACKAGE_WILL_EXPIRE.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS
                        .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.LABEL,
                            code: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_TEACHER_CANCEL.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS
                        .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.LABEL,
                            code: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_TEACHER_ABSENT.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.CHANGE_TEACHER_BY_CRONJOB.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .CHANGE_TEACHER_BY_CRONJOB.LABEL,
                            code: NOTIFICATION_FILTERS.CHANGE_TEACHER_BY_CRONJOB
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.NEXT_COURSE.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.NEXT_COURSE.LABEL,
                            code: NOTIFICATION_FILTERS.NEXT_COURSE.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.FINISH_CURRICULUM.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.FINISH_CURRICULUM.LABEL,
                            code: NOTIFICATION_FILTERS.FINISH_CURRICULUM.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.STUDENT_SUBMIT_IELTS_WRITING.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .STUDENT_SUBMIT_IELTS_WRITING.LABEL,
                            code: NOTIFICATION_FILTERS
                                .STUDENT_SUBMIT_IELTS_WRITING.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.ALERT_DO_NOT_HOMEWORK.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.ALERT_DO_NOT_HOMEWORK
                                .LABEL,
                            code: NOTIFICATION_FILTERS.ALERT_DO_NOT_HOMEWORK
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.DUPLICATE_STUDENT_INFORMATION
                        .CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .DUPLICATE_STUDENT_INFORMATION.LABEL,
                            code: NOTIFICATION_FILTERS
                                .DUPLICATE_STUDENT_INFORMATION.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.UPDATE_STATUS_SCHEDULE.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.UPDATE_STATUS_SCHEDULE
                                .LABEL,
                            code: NOTIFICATION_FILTERS.UPDATE_STATUS_SCHEDULE
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.STA_BOOKING_REMINDER_FOR_ADMIN
                        .CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .STA_BOOKING_REMINDER_FOR_ADMIN.LABEL,
                            code: NOTIFICATION_FILTERS
                                .STA_BOOKING_REMINDER_FOR_ADMIN.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.SUBSTITUTE_BOOKING_FOR_ADMIN.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .SUBSTITUTE_BOOKING_FOR_ADMIN.LABEL,
                            code: NOTIFICATION_FILTERS
                                .SUBSTITUTE_BOOKING_FOR_ADMIN.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS
                        .UPDATE_STATUS_BOOKING_STUDENT_ABSENT.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_STUDENT_ABSENT.LABEL,
                            code: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_STUDENT_ABSENT.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS
                        .UPDATE_STATUS_BOOKING_STUDENT_CANCEL.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_STUDENT_CANCEL.LABEL,
                            code: NOTIFICATION_FILTERS
                                .UPDATE_STATUS_BOOKING_STUDENT_CANCEL.CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.UPDATE_STATUS_BOOKING.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.UPDATE_STATUS_BOOKING
                                .LABEL,
                            code: NOTIFICATION_FILTERS.UPDATE_STATUS_BOOKING
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;
                    case NOTIFICATION_FILTERS.NOTIFICATION_VIA_STUDENT_EMAIL.CODE:
                        templateFilters.push({
                            label: NOTIFICATION_FILTERS.NOTIFICATION_VIA_STUDENT_EMAIL
                                .LABEL,
                            code: NOTIFICATION_FILTERS.NOTIFICATION_VIA_STUDENT_EMAIL
                                .CODE,
                            obj_id: e._id,
                            total_unseen: totals[e._id]?.total_unseen || 0
                        });

                        break;

                    default:
                        break;
                }
                // }
            });

            // Tạm ẩn để tăng performance
            // if (totals['other']?.total > 0) {
            templateFilters.push({
                label: NOTIFICATION_FILTERS.OTHER.LABEL,
                code: NOTIFICATION_FILTERS.OTHER.CODE,
                obj_id: 'other',
                total_unseen: totals['other']?.total_unseen || 0
            });
            // }
        }

        return new SuccessResponse(
            req.t('common.success'),
            templateFilters
        ).send(res, req);
    }

    public static async getTemplateStudentFilters(
        req: ProtectedRequest,
        res: Response
    ) {
        const { fromDate, toDate } = req.query;

        const template = await TemplateActions.find({
            type: EnumTemplateType.NOTIFICATION,
            code: {
                $in: ARRAY_NOTIFICATION_STUDENT_CODE
            }
        });
        const templateObjIds = template.map((e) => e._id);
        let totals: any = null;
        try {
            const route = `${NOTIFY_API_URL}/notifications/total-unseen-types-notifications-by-user`;
            const headers = {
                'api-key': INTERNAL_KEY,
                'Content-Type': 'application/json; charset=utf-8'
            };
            const response = await axios({
                method: 'post',
                url: route,
                headers,
                data: {
                    id: req.user.id,
                    template_obj_ids: templateObjIds,
                    fromDate: fromDate,
                    toDate: toDate
                }
            });
            logger.info(
                `getTotalUnseenTypesNotificationsByUser, response.data: ${JSON.stringify(
                    response.data
                )}`
            );
            totals = response.data.data;
        } catch (err: any) {
            logger.error(
                'getTotalUnseenTypesNotificationsByUser, error: ',
                err?.message
            );
        }
        const templateFilters: any = [];
        if (totals) {
            template.map((e) => {
                if (totals[e._id]?.total > 0) {
                    switch (e.code) {
                        case NOTIFICATION_STUDENT_FILTERS
                            .DAILY_BOOKING_REMINDER_FOR_STUDENT.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .DAILY_BOOKING_REMINDER_FOR_STUDENT.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .DAILY_BOOKING_REMINDER_FOR_STUDENT.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .STA_BOOKING_REMINDER_FOR_STUDENT.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .STA_BOOKING_REMINDER_FOR_STUDENT.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .STA_BOOKING_REMINDER_FOR_STUDENT.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .CREATE_BOOKING_FOR_STUDENT.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .CREATE_BOOKING_FOR_STUDENT.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .CREATE_BOOKING_FOR_STUDENT.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .ALERT_ORDERED_PACKAGE_WILL_EXPIRE.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .ALERT_ORDERED_PACKAGE_WILL_EXPIRE.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .ALERT_ORDERED_PACKAGE_WILL_EXPIRE.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_CANCEL_FOR_STUDENT
                            .CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .UPDATE_STATUS_BOOKING_STUDENT_CANCEL_FOR_STUDENT
                                    .LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .UPDATE_STATUS_BOOKING_STUDENT_CANCEL_FOR_STUDENT
                                    .CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .UPDATE_STATUS_BOOKING_STUDENT_ABSENT_FOR_STUDENT
                            .CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .UPDATE_STATUS_BOOKING_STUDENT_ABSENT_FOR_STUDENT
                                    .LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .UPDATE_STATUS_BOOKING_STUDENT_ABSENT_FOR_STUDENT
                                    .CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS.REMINE_DO_HOME_WORK
                            .CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .REMINE_DO_HOME_WORK.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .REMINE_DO_HOME_WORK.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .SUBSTITUTE_BOOKING_FOR_STUDENT.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .SUBSTITUTE_BOOKING_FOR_STUDENT.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .SUBSTITUTE_BOOKING_FOR_STUDENT.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .CHANGE_TEACHER_BY_CRONJOB_FOR_STUDENT.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .CHANGE_TEACHER_BY_CRONJOB_FOR_STUDENT
                                    .LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .CHANGE_TEACHER_BY_CRONJOB_FOR_STUDENT.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .COMPLETED_CLASS_WITHOUT_RATING.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .COMPLETED_CLASS_WITHOUT_RATING.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .COMPLETED_CLASS_WITHOUT_RATING.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        case NOTIFICATION_STUDENT_FILTERS
                            .STUDENT_ORDER_NEARLY_OUT_OF_CLASS.CODE:
                            templateFilters.push({
                                label: NOTIFICATION_STUDENT_FILTERS
                                    .STUDENT_ORDER_NEARLY_OUT_OF_CLASS.LABEL,
                                code: NOTIFICATION_STUDENT_FILTERS
                                    .STUDENT_ORDER_NEARLY_OUT_OF_CLASS.CODE,
                                obj_id: e._id,
                                total_unseen: totals[e._id]?.total_unseen || 0
                            });
                            break;
                        default:
                            break;
                    }
                }
            });

            // if (totals['other']?.total > 0) {
            //     templateFilters.push({
            //         label: NOTIFICATION_STUDENT_FILTERS.OTHER.LABEL,
            //         code: NOTIFICATION_STUDENT_FILTERS.OTHER.CODE,
            //         obj_id: 'other',
            //         total_unseen: totals['other']?.total_unseen || 0
            //     });
            // }
        }

        return new SuccessResponse(
            req.t('common.success'),
            templateFilters
        ).send(res, req);
    }

    public static async getAllTemplateByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const template = await TemplateActions.find({
            type: EnumTemplateType.NOTIFICATION,
            code: {
                $in: ARRAY_NOTIFICATION_STUDENT_CODE
            }
        });
        const templateObjIds = template.map((e) => e._id);
        return new SuccessResponse(
            req.t('common.success'),
            templateObjIds
        ).send(res, req);
    }
}
