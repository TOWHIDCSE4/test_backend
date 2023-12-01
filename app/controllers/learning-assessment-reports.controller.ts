import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import { NotFoundResponse, SuccessResponse } from './../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import UserActions from '../actions/user';
import LearningAssessmentReports, {
    EnumLAReportSource,
    EnumLAReportStatus,
    EnumLAReportType,
    LearningAssessmentReportsModel
} from '../models/learning-assessment-reports';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import TemplateActions from '../actions/template';
import { BackEndNotification, ZaloOANotification } from '../const/notification';
import * as natsClient from '../services/nats/nats-client';
import LearningAssessmentReportsActions from '../actions/learning-assessment-reports';
import BookingController from './booking.controller';
import PromptTemplateAIActions from '../actions/prompt-template-AI';
import CounterActions from '../actions/counter';
import { EnumBookingStatus } from '../models/booking';
import BookingActions from '../actions/booking';
import moment from 'moment';
import DepartmentActions from '../actions/department';
import { CODE_DEPARTMENT } from '../const/department';
import { EnumRole } from '../models/department';
import TeamActions from '../actions/team';

const logger = require('dy-logger');

const pickUpData = [
    '_id',
    'id',
    'student_id',
    'start_time',
    'end_time',
    'status',
    'type',
    'prompt_obj_id',
    'prompt_template',
    'memo',
    'booking_ids',
    'source',
    'note'
];

export default class LearningAssessmentReportsController {
    /*
     * Summary: Admin getting all LearningAssessmentReportss
     * Request type: GET
     */
    public static async getAllLearningAssessmentReports(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const status: any = parseInt(req.query.status as string);
        const staff_id: any = parseInt(req.query.staff_id as string);
        const create_time = parseInt(req.query.create_time as string);
        const type_report = parseInt(req.query.type as string);
        const report_id = parseInt(req.query.report_id as string);
        let res_payload: any = {
            data: null
        };
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10)
        };
        const csDepartment = await DepartmentActions.findOne({
            filter: {
                unsignedName: CODE_DEPARTMENT.CSKH
            }
        });
        if (!csDepartment) {
            throw new Error('Department CSKH not found');
        }
        let filterStaff = [];
        if (
            req.user.username !== 'admin' &&
            req.user.department.id === csDepartment.id &&
            req.user.department.isRole !== EnumRole.Manager &&
            req.user.department.isRole !== EnumRole.Deputy_manager
        ) {
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
                } else {
                    filterStaff.push(req.user.id);
                }
            }
        }
        if (filterStaff && filterStaff.length > 0) {
            if (staff_id) {
                if (filterStaff.includes(staff_id) && staff_id != -1) {
                    filter['user_student.staff_id'] = staff_id;
                } else {
                    filter['user_student.staff_id'] = -2;
                }
            } else {
                filter['user_student.staff_id'] = { $in: filterStaff };
            }
        } else {
            if (staff_id) {
                if (staff_id != -1) {
                    filter['user_student.staff_id'] = staff_id;
                } else {
                    filter['user_student.staff_id'] = 'null';
                }
            }
        }
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.search = search;
        }
        if (create_time) {
            const startDay = moment(create_time).startOf('day').valueOf();
            const endDay = moment(create_time).endOf('day').valueOf();
            filter.time_create = { $gt: startDay, $lt: endDay };
        }
        if (type_report) {
            filter.type = type_report;
        }
        if (report_id) {
            filter.id = report_id;
        }
        const dataReports =
            await LearningAssessmentReportsActions.findAllAndPaginated(filter);
        if (dataReports.length > 0) {
            res_payload.data = dataReports[0].data;
            res_payload.pagination = dataReports[0].pagination;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllLearningAssessmentReportsByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const studentId = parseInt(req.user.id as string);
        const { page_size, page_number, search } = req.query;
        const status: any = parseInt(req.query.status as string);
        const create_time = parseInt(req.query.create_time as string);
        const type_report = parseInt(req.query.type as string);
        let res_payload: any = {
            data: null
        };
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10),
            student_id: studentId,
            type: type_report
        };
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.search = search;
        }
        if (create_time) {
            const startDay = moment(create_time).startOf('day').valueOf();
            const endDay = moment(create_time).endOf('day').valueOf();
            filter.time_create = { $gt: startDay, $lt: endDay };
        }
        const dataReports =
            await LearningAssessmentReportsActions.findAllAndPaginated(filter);
        if (dataReports.length > 0) {
            res_payload.data = dataReports[0].data;
            res_payload.pagination = dataReports[0].pagination;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getLearningAssessmentReportsByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const studentId = parseInt(req.user.id as string);
        const { report_id } = req.query;
        const res_payload: any = {
            data: null,
            bookings: null
        };
        const dataReports = await LearningAssessmentReportsActions.findOne({
            status: EnumLAReportStatus.PUBLISHED,
            student_id: studentId,
            id: parseInt(report_id as string)
        });
        if (dataReports && dataReports.booking_ids) {
            const listBooking: any = [];
            await Promise.all(
                dataReports.booking_ids.map(async (item: any) => {
                    listBooking.push(parseInt(item as string));
                })
            );
            res_payload.data = dataReports;
            if (listBooking && listBooking[0]) {
                const bookings = await BookingActions.findAllNotPopulate(
                    {
                        booking_ids: listBooking
                    },
                    {
                        id: 1
                    }
                );
                res_payload.bookings = bookings ?? [];
            }
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async createLAReportsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id, ranger_search, promptObjId, ordered_package_id,  file} = req.body;
        const type = parseInt(req.body.type as string);
        let data_info: any = null;
        const studentId = student_id ? parseInt(student_id as string) : 0;
            if (!studentId) {
                throw new BadRequestError('student id is not found');
            }
        if(type === EnumLAReportType.DILIGENCE){
            let content_prompt = req.body.content_prompt.trim();
            const promptData = await PromptTemplateAIActions.findOne({
                _id: promptObjId
            });

            if (!promptData) {
                throw new BadRequestError('Prompt Template is not exists');
            }
            if (content_prompt) {
                content_prompt = '<p>' + content_prompt + '</p>';
                content_prompt = await content_prompt.replaceAll(
                    '\n\n',
                    '</p> <p>'
                );
            }
            data_info = {
                type,
                student_id: studentId,
                prompt_obj_id: promptObjId,
                prompt_template: promptData,
                memo: content_prompt,
                source: EnumLAReportSource.ADMIN,
                booking_ids: [],
                time_create: moment().valueOf()
            };
            let arr = [];
            // @ts-ignore
            arr = ranger_search;

            if (ranger_search != null && arr?.length > 0) {
                const filter: any = {
                    status: [
                        EnumBookingStatus.COMPLETED,
                        EnumBookingStatus.STUDENT_ABSENT
                    ],
                    student_id: student_id ? parseInt(student_id as string) : 0,
                    'calendar.start_time': {
                        $gte: parseInt(arr[0] as string),
                        $lte: parseInt(arr[1] as string)
                    }
                };
                const dataBookings: any = await BookingActions.findAll(filter);
                const arrBookingIds = [];
                for await (const booking of dataBookings) {
                    arrBookingIds.push(booking.id);
                }
                data_info.booking_ids = arrBookingIds;
                (data_info.start_time = parseInt(arr[0] as string)),
                    (data_info.end_time = parseInt(arr[1] as string));
            }
        }else if(type === EnumLAReportType.PERIODIC || type === EnumLAReportType.PERIODIC){
            data_info = {
                student_id: studentId,
                type,
                source: EnumLAReportSource.ADMIN,
                booking_ids: [],
                time_create: moment().valueOf()
            };
            if (ordered_package_id) {
                data_info.package_id = parseInt(ordered_package_id as string);
            }
            if (file) {
                data_info.file_upload = file;
            }
        }
        if(data_info){
            const counter = await CounterActions.findOne();
            data_info.id = counter.learning_assessment_reports_id;
            await LearningAssessmentReportsActions.create(data_info);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async updateLearningAssessment(
        req: ProtectedRequest,
        res: Response
    ) {
        const { note, cskh_note, ht_note, status, from_date, to_date, file } = req.body;
        const typeReport = req.body.type_report ? parseInt(req.body.type_report as string) : null;
        let memo_new = req.body.memo_new;
        const { idLearningAssessment } = req.params;
        const LearningAssessment: any =
            await LearningAssessmentReportsActions.findOne({
                id: parseInt(idLearningAssessment as string)
            });
        if (!LearningAssessment) {
            throw new BadRequestError(
                'Learning Assessment Report is not exists'
            );
        }
        const data: any = {};
        if (memo_new && LearningAssessment.memo !== memo_new) {
            data.memo = memo_new;
        }

        if (
            note &&
            (LearningAssessment.note?.ht !== ht_note ||
                LearningAssessment.note?.cskh !== cskh_note)
        ) {
            data.note = {
                cskh: cskh_note,
                ht: ht_note
            };
        }
        if (status) {
            data.status = parseInt(status as string);
            if (
                LearningAssessment.status == EnumLAReportStatus.PRIVATE &&
                data.status == EnumLAReportStatus.PUBLISHED
            ) {
                const student = await UserActions.findOne({
                    id: LearningAssessment.student_id
                });
                const monthReport =
                    moment(LearningAssessment.start_time).month() + 1;
                const yearReport = moment(LearningAssessment.start_time).year();
                if (student) {
                    const dataSend = {
                        student_name: student.full_name,
                        month: monthReport,
                        year: yearReport
                    };
                    logger.info(
                        'send zalo publish a deligence report for student: ' +
                            student.id
                    );
                    natsClient.publishEventZalo(
                        student,
                        ZaloOANotification.PUBLISH_DILIGENCE_REPORT_FOR_STUDENT,
                        dataSend
                    );
                }
            }
        }
        if(typeReport){
            if(typeReport != LearningAssessment.type){
                data.type = typeReport;
            }
            if(from_date && to_date){
                if(parseInt(from_date as string) != LearningAssessment.start_time){
                    data.start_time = parseInt(from_date as string);
                }
                if(parseInt(to_date as string) != LearningAssessment.end_time){
                    data.end_time = parseInt(to_date as string);
                }
            }
            if(file){
                data.file_upload = file
            }
        }

        let newLearningAssessment: any = null;

        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'LearningAssessmentReportsModel',
            LearningAssessment,
            pickUpData
        );
        newLearningAssessment = await LearningAssessmentReportsActions.update(
            LearningAssessment._id,
            data as LearningAssessmentReports
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'LearningAssessmentReportsModel',
            newLearningAssessment,
            pickUpData
        );

        return new SuccessResponse('success', newLearningAssessment).send(
            res,
            req
        );
    }

    public static async updateStatusReports(req: ProtectedRequest, res: any) {
        const { list_publish } = req.body;
        if (
            list_publish &&
            Array.isArray(list_publish) &&
            list_publish.length > 0
        ) {
            const filter: any = {
                status: EnumLAReportStatus.PRIVATE,
                id: { $in: list_publish }
            };
            logger.info('send zalo all student publish deligence report');
            logger.info('filter data: ' + JSON.stringify(filter));
            const listData = await LearningAssessmentReportsActions.findAll(
                filter
            );
            logger.info('list data count: ' + JSON.stringify(listData.length));

            for await (const item of listData) {
                logger.info('item status: ' + item.status);
                if (item.status == EnumLAReportStatus.PRIVATE) {
                    const student = await UserActions.findOne({
                        id: item.student_id
                    });
                    const monthReport = moment(item.start_time).month() + 1;
                    const yearReport = moment(item.start_time).year();
                    if (student) {
                        const dataSend = {
                            student_name: student.full_name,
                            month: monthReport,
                            year: yearReport
                        };
                        logger.info(
                            'send zalo publish deligence report for student: ' +
                                student.id
                        );
                        natsClient.publishEventZalo(
                            student,
                            ZaloOANotification.PUBLISH_DILIGENCE_REPORT_FOR_STUDENT,
                            dataSend
                        );
                    }
                }
            }

            await LearningAssessmentReportsModel.updateMany(
                filter,
                {
                    $set: {
                        status: EnumLAReportStatus.PUBLISHED
                    }
                },
                {
                    upsert: false,
                    new: true,
                    returnOriginal: false
                }
            ).exec();
        }

        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }

    public static async deleteLearningAssessment(
        req: ProtectedRequest,
        res: Response
    ) {
        const { idLearningAssessment } = req.params;
        const LearningAssessment =
            await LearningAssessmentReportsActions.findOne({
                id: parseInt(idLearningAssessment as string)
            });
        if (!LearningAssessment) throw new NotFoundError('Reports not found');
        await LearningAssessmentReportsActions.remove(LearningAssessment._id);
        return new SuccessResponse('success', 'Remove success').send(res, req);
    }

    public static async addDiligenceReportsMonthly(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`addDiligenceReportsMonthly >>>`);
        const startLastMonth = moment()
            .subtract(1, 'month')
            .startOf('month')
            .valueOf();
        const endLastMonth = moment()
            .subtract(1, 'month')
            .endOf('month')
            .valueOf();
        let total = 0;
        let pageNumber = 0;
        logger.info(`start time: ` + startLastMonth);
        logger.info(`end time: ` + endLastMonth);
        do {
            pageNumber = pageNumber + 1;
            const filter: any = {
                page_number: pageNumber,
                page_size: 10,
                start_time: startLastMonth,
                end_time: endLastMonth
            };
            logger.info(`page number: ` + pageNumber);
            const listStudent =
                await UserActions.getAllStudentWidthBookingLastMonth(filter);
            if (listStudent?.length > 0) {
                const studentData: any = listStudent[0].paginatedResults;
                total = listStudent[0].totalResults[0]?.count;
                logger.info(`total: ` + total);
                for await (const item of studentData) {
                    logger.info(`check create report booking_id: ` + item?.id);
                    const arrBookingIds = [];
                    for await (const booking of item?.booking) {
                        arrBookingIds.push(booking.id);
                    }
                    if (arrBookingIds?.length > 0) {
                        const data_info: any = {
                            type: EnumLAReportType.DILIGENCE,
                            student_id: item?.id,
                            source: EnumLAReportSource.SYSTEM,
                            booking_ids: arrBookingIds,
                            time_create: moment().valueOf(),
                            start_time: startLastMonth,
                            end_time: endLastMonth
                        };

                        const counter = await CounterActions.findOne();
                        data_info.id = counter.learning_assessment_reports_id;
                        const report =
                            await LearningAssessmentReportsActions.create(
                                data_info
                            );
                        if (report) {
                            logger.info(`add diligence report success`);
                        }
                    }
                }
            }
            logger.info(`while total: ` + pageNumber * 10);
        } while (pageNumber * 10 < total);
        logger.info(`count student has report: ${total}`);

        logger.info(`addDiligenceReportsMonthly <<<`);
        return new SuccessResponse('success', {}).send(res, req);
    }
}
