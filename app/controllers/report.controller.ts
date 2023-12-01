import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from './../core/ApiError';
import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import ReportActions from '../actions/report';
import CounterActions from '../actions/counter';
import Report from '../models/report';
import UserActions from '../actions/user';
import BookingActions from '../actions/booking';
import Booking from '../models/booking';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import moment from 'moment';
import { DAY_TO_MS } from '../const/date-time';
const pickUpData = [
    '_id',
    'id',
    'booking_id',
    'report_user_id',
    'report_content',
    'report_teacher_id',
    'report_teacher_feedback',
    'report_solution',
    'resolve_user_id',
    'created_user_id',
    'teacher',
    'recommend_content',
    'recommend_section',
    'recommend_status',
    'classify',
    'level',
    'processing_department_id',
    'department_staff_id',
    'department_staff_feedback',
    'error_cause',
    'type',
    'support_timeline'
];
export default class ExamController {
    public static async createReport(req: ProtectedRequest, res: Response) {
        const {
            recommend_section,
            recommend_content,
            type,
            report_teacher_id,
            booking_id,
            report_content,
            recommend_status,
            classify,
            level,
            report_user,
            resolve_user_id
        } = req.body;
        const created_user_id = req.user?.id;
        const booking = await BookingActions.findOne({ id: booking_id });
        if (!booking && (type === '2' || type === 2))
            throw new BadRequestError(req.t('Booking not found by id'));
        const existsWithBooking = await ReportActions.findOne({
            booking_id: booking_id,
            type: type
        });
        // nếu quá 3 ngày kể từ lúc kết thúc buổi học thì ko save report
        if (booking && existsWithBooking) {
            const currentTimestamp = moment().valueOf();
            const checkTimeBooking = booking.calendar.end_time + 3 * DAY_TO_MS;
            if (checkTimeBooking < currentTimestamp) {
                return new SuccessResponse(
                    req.t('common.success'),
                    report_content
                ).send(res, req);
            }
        }
        if (existsWithBooking && (type === '2' || type === 2)) {
            await ReportActions.update(existsWithBooking._id, {
                report_content: report_content
            });
            return new SuccessResponse(
                req.t('common.success'),
                report_content
            ).send(res, req);
        }
        // throw new BadRequestError(req.t('Report exist with booking'))
        const reportUser = await UserActions.findOne({
            id: report_user || req.user.id
        });
        if (!reportUser) throw new BadRequestError(req.t('common.not_found'));
        const counter = await CounterActions.findOne();
        const id = counter.report_id;
        const createInfo: any = {
            id,
            recommend_section,
            recommend_content,
            report_user_id: reportUser.id,
            report_teacher_id,
            booking_id,
            type,
            created_user_id,
            report_content,
            recommend_status,
            report_user: {
                id: reportUser.id,
                username: reportUser.username,
                email: reportUser.email,
                full_name: reportUser.full_name,
                role: reportUser.role,
                phone_number: reportUser.phone_number,
                skype_account: reportUser.skype_account,
                address: reportUser.address
            },
            classify,
            level,
            resolve_user_id
        };
        if (
            report_content &&
            (report_content.rating === 5 || report_content.rating === '5')
        )
            createInfo.recommend_status = 3;
        const reportTeacher = await UserActions.findOne({
            id: report_teacher_id
        });
        if (reportTeacher && (type === '2' || type === 2))
            createInfo.report_teacher = {
                id: reportTeacher.id,
                username: reportTeacher.username,
                email: reportTeacher.email,
                full_name: reportTeacher.full_name,
                role: reportTeacher.role,
                phone_number: reportTeacher.phone_number,
                skype_account: reportTeacher.skype_account,
                address: reportTeacher.address
            };
        const createdObj = await ReportActions.create({
            ...createInfo
        } as unknown as Report);
        await BookingActions.update(booking?._id, {
            report: createdObj._id
        } as Booking);
        return new SuccessResponse(req.t('common.success'), createdObj).send(
            res,
            req
        );
    }

    public static async getReportListByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_number,
            page_size,
            report_user_id,
            resolve_user_id,
            recommend_status,
            recommend_section,
            processing_department_id,
            department_staff_id,
            type,
            month
        } = req.query;
        const result = await ReportActions.findAllAndPaginated({
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string),
            type: parseInt(type as string),
            report_user_id: report_user_id
                ? parseInt(report_user_id as string)
                : undefined,
            resolve_user_id: resolve_user_id
                ? parseInt(resolve_user_id as string)
                : undefined,
            recommend_status: recommend_status
                ? parseInt(recommend_status as string)
                : undefined,
            recommend_section: recommend_section
                ? parseInt(recommend_section as string)
                : undefined,
            processing_department_id: processing_department_id
                ? parseInt(processing_department_id as string)
                : undefined,
            department_staff_id: department_staff_id
                ? parseInt(department_staff_id as string)
                : undefined,
            month: month
                ? new Date(parseInt(month as string)).getMonth() + 1
                : new Date().getMonth() + 1,
            year: month
                ? new Date(parseInt(month as string)).getFullYear()
                : new Date().getFullYear()
        });
        const reports = result[0].paginatedResults;
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: reports,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getReportByUser(req: ProtectedRequest, res: Response) {
        const { page_number, page_size, type } = req.query;
        if (!type) throw new BadRequestError(req.t('Need report type'));
        let result;
        if (type === '1') {
            result = await ReportActions.findAllAndPaginated({
                report_user_id: req.user.id,
                page_number: parseInt(page_number as string),
                page_size: parseInt(page_size as string),
                type: parseInt(type as string)
            });
        } else {
            result = await ReportActions.findAllAndPaginated({
                report_teacher_id: req.user.id,
                page_number: parseInt(page_number as string),
                page_size: parseInt(page_size as string),
                type: parseInt(type as string)
            });
        }
        const reports = result[0].paginatedResults;
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: reports,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async findStaffByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.query;
        if (!id) throw new BadRequestError(req.t('Need id'));
        let result;

        result = await ReportActions.findStaffByStudent({
            user_id: id
        });

        return new SuccessResponse(req.t('common.success'), result).send(
            res,
            req
        );
    }
    public static async findStaffByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.query;
        if (!id) throw new BadRequestError(req.t('Need id'));
        let result;

        result = await ReportActions.findStaffByTeacher({
            user_id: id
        });

        return new SuccessResponse(req.t('common.success'), result).send(
            res,
            req
        );
    }

    public static async updateReport(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const report = await ReportActions.findOne({
            id: parseInt(id as string)
        });
        if (!report) {
            throw new BadRequestError(req.t('common.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'ReportModel',
            report,
            pickUpData
        );
        const {
            recommend_section,
            recommend_content,
            report_solution,
            recommend_status,
            resolve_user_id,
            report_teacher_feedback,
            classify,
            department_staff_feedback,
            department_staff_id,
            error_cause,
            level,
            teacher,
            processing_department_id
        } = req.body;

        const diff = {
            recommend_section: recommend_section | report.recommend_section,
            recommend_content: recommend_content
                ? recommend_content
                : report.recommend_content,
            report_solution: report_solution
                ? report_solution
                : report.report_solution,
            resolve_user_id: resolve_user_id
                ? resolve_user_id
                : report.resolve_user_id,
            recommend_status: recommend_status
                ? recommend_status
                : report.recommend_status,
            report_teacher_feedback: report_teacher_feedback
                ? report_teacher_feedback
                : report.report_teacher_feedback,
            classify: classify ? classify : report.classify,
            department_staff_feedback: department_staff_feedback
                ? department_staff_feedback
                : report.department_staff_feedback,
            department_staff_id: department_staff_id
                ? department_staff_id
                : report.department_staff_id,
            error_cause: error_cause ? error_cause : report.error_cause,
            level: level ? level : report.level,
            teacher: teacher ? teacher : report.teacher,
            processing_department_id: processing_department_id
                ? processing_department_id
                : report.processing_department_id
        };
        try {
            const updatedObj = await ReportActions.update(report._id, diff);
            LogServices.setChangeData(
                req,
                EnumTypeChangeData.new,
                'ReportModel',
                updatedObj,
                pickUpData
            );
            return new SuccessResponse(
                req.t('common.success'),
                updatedObj
            ).send(res, req);
        } catch (e: any) {
            throw new BadRequestError(req.t(e.message));
        }
    }

    public static async deleteReport(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const report = await ReportActions.findOne({
            id: parseInt(id as string)
        });
        if (!report) {
            throw new BadRequestError(req.t('common.not_found'));
        }
        await ReportActions.delete(report);
        return new SuccessResponse(req.t('common.success'), report).send(
            res,
            req
        );
    }
}
