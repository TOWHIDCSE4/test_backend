import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import moment from 'moment';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, InternalError } from '../core/ApiError';
import BookingController from './booking.controller';
import CounterActions from '../actions/counter';
import CourseActions from '../actions/course';
import ScheduledMemoActions from '../actions/scheduled-memo';
import StudentActions from '../actions/student';
import StudentLevelActions from '../actions/student-level';
import TemplateActions from '../actions/template';
import UserActions from '../actions/user';
import ScheduledMemo, { EnumScheduledMemoType } from '../models/scheduled-memo';
import Student from '../models/student';
import * as natsClient from '../services/nats/nats-client';
import { BackEndNotification } from '../const/notification';
import { RoleCode } from '../const/role';
import {
    STUDENT_INCREASE_LEVEL_AFTER_LEARNING,
    MIN_EXAM_POINT_TO_INCREASE_STUDENT_LEVEL
} from '../const/student';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import axios from 'axios';
import User from '../models/user';
import ApiKeyAIActions from '../actions/api-key-AI';
import ApiKeyAI from '../models/api-key-AI';
import PromptTemplateAIActions from '../actions/prompt-template-AI';
import { EnumBookingStatus } from '../models/booking';
import OrderedPackageActions from '../actions/ordered-package';
import { EnumPackageOrderType } from '../const/package';
import BookingActions from '../actions/booking';
import LearningAssessmentReportsActions from '../actions/learning-assessment-reports';
import AIReportGenerateController from './ai-report-generate.controller';

const OPEN_AI_URL = process.env.OPEN_AI_URI || 'https://api.openai.com';
const logger = require('dy-logger');
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
export default class ScheduledMemoController {
    public static async getScheduledMemosByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            type,
            month,
            year,
            course_id,
            student_id,
            teacher_id,
            sort
        } = req.query;
        const res_payload = {
            data: new Array<ScheduledMemo>(),
            pagination: {
                total: 0
            }
        };
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            type: type ? parseInt(type as string) : 0,
            month: month ? parseInt(month as string) : 0,
            year: year ? parseInt(year as string) : 0,
            course_id: course_id ? parseInt(course_id as string) : 0,
            student_id: student_id ? parseInt(student_id as string) : 0,
            teacher_id: teacher_id ? parseInt(teacher_id as string) : 0
        };
        if (req.query.hasOwnProperty('teacher_commented')) {
            filter.teacher_commented = req.query.teacher_commented == 'true';
        }
        if (req.query.hasOwnProperty('teacher_assigned')) {
            filter.teacher_assigned = req.query.teacher_assigned == 'true';
        }
        let sortQuery: any;
        if (sort) {
            const sortArr = (sort as string).split(',');
            sortQuery = {};
            sortArr.forEach((s) => {
                const [key, value] = s.split(':');
                sortQuery[key] = value;
            });
            filter.sort = sortQuery;
        }
        const memos = await ScheduledMemoActions.findAllAndPaginated(
            filter,
            sortQuery
        );
        const total = await ScheduledMemoActions.count(filter);
        res_payload.data = memos;
        res_payload.pagination.total = total;
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getScheduledMemosByUser(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, type, month, year, course_id } =
            req.query;
        const res_payload = {
            data: new Array<ScheduledMemo>(),
            pagination: {
                total: 0
            }
        };

        if (!req.user) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }

        switch (parseInt(type as string)) {
            /**
             * User should only able to request for one memo type only
             * and this request shouldn't have filters related to other types
             */
            case EnumScheduledMemoType.MONTHLY:
                if (course_id) {
                    return new SuccessResponse(
                        req.t('common.success'),
                        res_payload
                    ).send(res, req);
                }
                break;
            case EnumScheduledMemoType.COURSE:
                if (month || year) {
                    return new SuccessResponse(
                        req.t('common.success'),
                        res_payload
                    ).send(res, req);
                }
                break;
            default:
                return new SuccessResponse(
                    req.t('common.success'),
                    res_payload
                ).send(res, req);
                break;
        }

        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            type: type ? parseInt(type as string) : 0,
            month: month ? parseInt(month as string) : 0,
            year: year ? parseInt(year as string) : 0,
            course_id: course_id ? parseInt(course_id as string) : 0
        };
        if (req.query.hasOwnProperty('teacher_commented')) {
            filter.teacher_commented = req.query.teacher_commented == 'true';
        }
        if (req.user.role.includes(RoleCode.TEACHER)) {
            filter.teacher_id = req.user.id;
        } else if (req.user.role.includes(RoleCode.STUDENT)) {
            filter.student_id = req.user.id;
        } else {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }

        const memos = await ScheduledMemoActions.findAllAndPaginated(filter);
        const total = await ScheduledMemoActions.count(filter);
        res_payload.data = memos;
        res_payload.pagination.total = total;
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static generateCommentsBasedOnPoints(
        attendance_point: number,
        attitude_point: number,
        homework_point: number
    ) {
        const comments = {
            attendance_comment: '',
            attitude_comment: '',
            homework_comment: ''
        };
        comments.attendance_comment = `Comment for point ${attendance_point}`;
        comments.attitude_comment = `Comment for point ${attitude_point}`;
        comments.homework_comment = `Comment for point ${homework_point}`;
        return comments;
    }

    public static async createScheduledMemo(req: ProtectedRequest) {
        const { student_id, type, course_id, month, year, increaseLevel } =
            req.body;
        let course = null;

        const res_payload: any = {
            exists: false,
            created: false,
            memo: null
        };

        const student = await UserActions.findOne({
            id: student_id,
            role: { $all: [RoleCode.STUDENT] }
        });
        if (!student) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }
        const student_profile = await StudentActions.findOne({
            user_id: student_id
        });
        if (!student_profile) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }

        const checked_memo = await ScheduledMemoActions.findOne({
            student_id,
            month,
            year,
            course_id
        });
        if (checked_memo) {
            res_payload.exists = true;
            res_payload.memo = checked_memo;
            return res_payload;
        }
        let student_summary;

        let teacher_id = null;
        let teacher = null;
        let student_start_level = null;
        const student_current_level = null;
        switch (type) {
            case EnumScheduledMemoType.MONTHLY: {
                const teacher_result =
                    await BookingController.getTeacherToCommentMonthlyMemo(
                        student_id,
                        month,
                        year
                    );
                if (
                    teacher_result &&
                    teacher_result.teacher_id &&
                    teacher_result.teacher
                ) {
                    teacher_id = teacher_result.teacher_id;
                    teacher = teacher_result.teacher;
                }

                student_summary =
                    await BookingController.getStudentStudyingSummaryMonthly(
                        student_id,
                        month,
                        year
                    );
                break;
            }
            case EnumScheduledMemoType.COURSE: {
                course = await CourseActions.findOne({
                    id: course_id
                });
                if (!course) {
                    throw new BadRequestError(req.t('errors.course.not_found'));
                }

                const teacher_result =
                    await BookingController.getTeacherToCommentCourseMemo(
                        student_id,
                        course_id
                    );
                if (
                    teacher_result &&
                    teacher_result.teacher_id &&
                    teacher_result.teacher
                ) {
                    teacher_id = teacher_result.teacher_id;
                    teacher = teacher_result.teacher;
                }

                student_summary =
                    await BookingController.getStudentStudyingSummaryInCourse(
                        student_id,
                        course_id
                    );
                student_start_level = student_profile.student_level_id;
                // if ( student_summary.exam_result > MIN_EXAM_POINT_TO_INCREASE_STUDENT_LEVEL ) {
                //     student_current_level = student_start_level + STUDENT_INCREASE_LEVEL_AFTER_LEARNING;
                //     const check_level = await StudentLevelActions.findOne({
                //         id: student_current_level
                //     });
                //     if ( !check_level ) {
                //         const max_level_sort = { id: -1 };
                //         const level_selected_field = { id: 1 };
                //         const max_levels = await StudentLevelActions.findAllAndPaginated({
                //             page_size: 1,
                //             page_number: 1,
                //             id: { $lt: student_current_level }
                //         }, max_level_sort, level_selected_field);
                //         if ( max_levels.length <= 0 ) {
                //             throw new InternalError(
                //                 req.t('errors.student_level.not_found')
                //             );
                //         }
                //         student_current_level = max_levels[0].id;
                //         if ( student_current_level < student_start_level ) {
                //             /** Student start level is max level */
                //             student_current_level = student_start_level;
                //         }
                //     }
                // } else {
                //     student_current_level = student_start_level;
                // }

                break;
            }
            default: {
                throw new BadRequestError(
                    req.t('errors.scheduled_memo.invalid_type')
                );
                break;
            }
        }
        if (!student_summary) {
            throw new BadRequestError(
                req.t('errors.scheduled_memo.no_studying_summary')
            );
        }

        const counter = await CounterActions.findOne();
        const id = counter.scheduled_memo_id;
        const memo_info = {
            id,
            type,
            student_id,
            month,
            year,
            course_id,
            teacher_id,
            student,
            teacher,
            course,
            registered_class: student_summary.registered_class,
            completed_class: student_summary.completed_class,
            attendance: {
                point: student_summary.attendance_point
            },
            attitude: {
                point: student_summary.attitude_point
            },
            // homework: {
            //     point: student_summary.homework_point
            // },
            // exam_result: student_summary.exam_result,
            segments: student_summary.segments,
            student_start_level,
            student_current_level
        };
        // if (increaseLevel && memo_info.student_current_level !== null) {
        //     memo_info.student_current_level += 1;
        // }
        await ScheduledMemoActions.create({ ...memo_info } as any);
        res_payload.created = true;
        res_payload.memo = memo_info;
        return res_payload;
    }

    public static async createScheduledMemoByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const res_payload = await ScheduledMemoController.createScheduledMemo(
            req
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async editScheduledMemo(
        req: ProtectedRequest,
        memo: ScheduledMemo
    ) {
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'ScheduledMemoModel',
            memo,
            pickUpData
        );
        logger.info('editScheduledMemo');
        const {
            teacher_id,
            attendance_comment,
            attitude_comment,
            homework_comment,
            teacher_note,
            admin_note
        } = req.body;

        if (memo.report_link) {
            throw new BadRequestError(
                req.t('errors.scheduled_memo.memo_confirmed')
            );
        }

        let student_summary = null;

        /** Re-update student's point */
        switch (memo.type) {
            case EnumScheduledMemoType.MONTHLY: {
                if (!memo.month || !memo.year) {
                    throw new InternalError(
                        req.t('errors.scheduled_memo.corrupt_data')
                    );
                }
                student_summary =
                    await BookingController.getStudentStudyingSummaryMonthly(
                        memo.student_id,
                        memo.month,
                        memo.year
                    );
                break;
            }
            case EnumScheduledMemoType.COURSE: {
                if (!memo.course_id) {
                    throw new InternalError(
                        req.t('errors.scheduled_memo.corrupt_data')
                    );
                }
                student_summary =
                    await BookingController.getStudentStudyingSummaryInCourse(
                        memo.student_id,
                        memo.course_id
                    );
                break;
            }
            default: {
                throw new InternalError(
                    req.t('errors.scheduled_memo.invalid_type')
                );
                break;
            }
        }
        const diff: any = {
            registered_class: student_summary.registered_class,
            completed_class: student_summary.completed_class,
            attendance: {
                point: student_summary.attendance_point
            },
            attitude: {
                point: student_summary.attitude_point
            },
            // VinhPD set homework.point = 0 tranh bug crash khi finish teaching, khong hieu logic nghiep vu
            homework: {
                point: 0, // huydq: fix bug finish teaching , bỏ // để có thể set homework.comment
                comment: '' // huydq: fix bug finish teaching , bỏ // để có thể set homework.comment
            }

            // exam_result: student_summary.exam_result,
            // weeks: student_summary.segments
        };

        diff.attendance.comment = attendance_comment
            ? attendance_comment
            : memo.attendance.comment;
        diff.attitude.comment = attitude_comment
            ? attitude_comment
            : memo.attitude.comment;
        diff.homework.comment = homework_comment
            ? homework_comment
            : memo.homework.comment;
        diff.teacher_note = teacher_note ? teacher_note : memo.teacher_note;
        diff.admin_note = admin_note ? admin_note : memo.admin_note;

        if (teacher_id && teacher_id != memo.teacher_id) {
            const teacher = await UserActions.findOne({
                id: teacher_id,
                role: { $all: [RoleCode.TEACHER] }
            });
            if (!teacher) {
                throw new BadRequestError(req.t('errors.teacher.not_found'));
            }
            /** Changing teachers mean that we reset all the past comments */
            diff.teacher_id = teacher_id;
            diff.teacher_commented = false;
            diff.teacher = teacher;
            diff.attendance.comment = '';
            diff.attitude.comment = '';
            diff.homework.comment = '';
        }

        /** Generate comments if there is none and no teacher to comment */
        if (!memo.teacher_commented && !teacher_id && !memo.teacher_id) {
            const comments =
                ScheduledMemoController.generateCommentsBasedOnPoints(
                    diff.attendance.point,
                    diff.attitude.point,
                    diff.homework.point
                );
            if (!diff.attendance.comment && !memo.attendance.comment) {
                diff.attendance.comment = comments.attendance_comment;
            }
            if (!diff.attitude.comment && !memo.attitude.comment) {
                diff.attitude.comment = comments.attendance_comment;
            }
            if (!diff.homework.comment && !memo.homework.comment) {
                diff.homework.comment = comments.homework_comment;
            }
            diff.teacher_commented = true;
        }
        if (memo.type == EnumScheduledMemoType.COURSE) {
            if (!memo.student_start_level) {
                const student_profile = await StudentActions.findOne({
                    user_id: memo.student_id
                });
                if (!student_profile) {
                    throw new BadRequestError(
                        req.t('errors.student.not_found')
                    );
                }
                diff.student_start_level = student_profile.student_level_id;
            } else {
                diff.student_start_level = memo.student_start_level;
            }
            if (
                diff?.exam_result > MIN_EXAM_POINT_TO_INCREASE_STUDENT_LEVEL &&
                (!memo.exam_result ||
                    memo.exam_result <=
                        MIN_EXAM_POINT_TO_INCREASE_STUDENT_LEVEL)
            ) {
                diff.student_current_level =
                    diff.student_start_level +
                    STUDENT_INCREASE_LEVEL_AFTER_LEARNING;
                const check_level = await StudentLevelActions.findOne({
                    id: diff.student_current_level
                });
                if (!check_level) {
                    const max_level_sort = { id: -1 };
                    const level_selected_field = { id: 1 };
                    const max_levels =
                        await StudentLevelActions.findAllAndPaginated(
                            {
                                page_size: 1,
                                page_number: 1,
                                id: { $lt: diff.student_current_level }
                            },
                            max_level_sort,
                            level_selected_field
                        );
                    if (max_levels.length <= 0) {
                        throw new InternalError(
                            req.t('errors.student_level.not_found')
                        );
                    }
                    diff.student_current_level = max_levels[0].id;
                    if (diff.student_current_level < diff.student_start_level) {
                        /** Student start level is max level */
                        diff.student_current_level = diff.student_start_level;
                    }
                }
            } else if (
                diff?.exam_result <= MIN_EXAM_POINT_TO_INCREASE_STUDENT_LEVEL &&
                (!memo.exam_result ||
                    memo.exam_result > MIN_EXAM_POINT_TO_INCREASE_STUDENT_LEVEL)
            ) {
                diff.student_current_level = diff.student_start_level;
            }

            if (!memo.curriculum_for_next_course) {
                /** @TODO Calculate later */
                diff.curriculum_for_next_course =
                    'Side by side'; /** Mock data */
            }
        }

        const new_data = await ScheduledMemoActions.update(memo._id, {
            ...diff
        } as ScheduledMemo);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'ScheduledMemoModel',
            new_data,
            pickUpData
        );
        return true;
    }

    public static async editMonthlyMemoByCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const { memo_id } = req.params;
        const memo = await ScheduledMemoActions.findOne({
            id: parseInt(memo_id as string),
            type: EnumScheduledMemoType.MONTHLY
        });
        /** Nothing here. Everything is already done by the system */
        req.body = {};
        if (!memo) {
            throw new BadRequestError(req.t('errors.scheduled_memo.not_found'));
        }
        const update_result = await ScheduledMemoController.editScheduledMemo(
            req,
            memo
        );
        return new SuccessResponse(req.t('common.success'), {
            ok: update_result
        }).send(res, req);
    }

    public static async editScheduledMemoByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { memo_id } = req.params;
        const memo = await ScheduledMemoActions.findOne({
            id: parseInt(memo_id as string)
        });
        if (!memo) {
            throw new BadRequestError(req.t('errors.scheduled_memo.not_found'));
        }

        const update_result = await ScheduledMemoController.editScheduledMemo(
            req,
            memo
        );

        return new SuccessResponse(req.t('common.success'), {
            ok: update_result
        }).send(res, req);
    }

    public static async commentOnScheduledMemoByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { memo_id } = req.params;
        const { id } = req.user;
        const {
            attendance_comment,
            attitude_comment,
            homework_comment,
            teacher_note
        } = req.body;

        const memo = await ScheduledMemoActions.findOne({
            id: parseInt(memo_id as string),
            teacher_id: id,
            teacher_commented: false
        });
        if (!memo)
            throw new BadRequestError(req.t('errors.scheduled_memo.not_found'));

        const diff: any = {
            attendance: {
                point: memo.attendance.point,
                comment: ''
            },
            attitude: {
                point: memo.attitude.point,
                comment: ''
            },
            homework: {
                point: memo.homework.point,
                comment: ''
            },
            teacher_commented: true
        };

        if (attendance_comment) {
            diff.attendance.comment = attendance_comment;
        }
        if (attitude_comment) {
            diff.attitude.comment = attitude_comment;
        }
        if (homework_comment) {
            diff.homework.comment = homework_comment;
        }
        if (teacher_note) {
            diff.teacher_note = teacher_note;
        }

        await ScheduledMemoActions.update(memo._id, {
            ...diff
        } as ScheduledMemo);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async removeScheduledMemo(
        req: ProtectedRequest,
        res: Response
    ) {
        const memo_id = parseInt(req.params.memo_id as string);
        const memo = await ScheduledMemoActions.findOne({ id: memo_id });
        if (memo) {
            await ScheduledMemoActions.remove(memo._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getListOfTeachersToCommentMonthlyMemo(
        req: ProtectedRequest,
        res: Response
    ) {
        const { month, year, late } = req.query;
        const res_payload = {
            data: new Array<any>()
        };
        if (!month || !year) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        const request_month_start = moment()
            .utc()
            .year(parseInt(year as string))
            .month(parseInt(month as string) - 1)
            .startOf('month');
        const current_month_start = moment().utc().startOf('month');
        if (request_month_start.valueOf() > current_month_start.valueOf()) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        if (
            request_month_start.add(1, 'month').valueOf() <
            current_month_start.valueOf()
        ) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        const filter = {
            month: parseInt(month as string),
            year: parseInt(year as string),
            teacher_id: { $ne: null },
            teacher_commented: false
        };
        const teachers = await ScheduledMemoActions.getTeacherList(filter);
        const notification_template =
            late === 'true'
                ? await TemplateActions.findOne({
                      code: BackEndNotification.TEACHER_HAVE_LATE_MONTHLY_MEMOS
                  })
                : await TemplateActions.findOne({
                      code: BackEndNotification.TEACHER_HAVE_MONTHLY_MEMOS_TO_COMMENT
                  });
        if (notification_template) {
            for (const teacher of teachers) {
                const notification_payload = {
                    teacher_name: teacher.teacher.full_name,
                    student_count: teacher.student_count
                };
                natsClient.publishEventWithTemplate({
                    template: notification_template.content,
                    data: notification_payload,
                    receiver: teacher._id,
                    template_obj_id: notification_template._id
                });
            }
        }
        res_payload.data = teachers;
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAutoRateMemo(req: ProtectedRequest, res: Response) {
        logger.info('getAutoRateMemo >>');
        const dataFilterMemo = req.body.dataFilterMemo;
        const promptObjId = req.body.promptObjId;
        const res_payload = {
            data: null
        };
        const promptTemplate: any = await PromptTemplateAIActions.findOne({
            _id: promptObjId
        });
        let dataBooking: any = [];
        if (dataFilterMemo) {
            let arr = [];
            // @ts-ignore
            arr = dataFilterMemo.range_search;
            let startTimeCheck = null;
            let endTimeCheck = null;
            const filter: any = {
                status: [EnumBookingStatus.COMPLETED],
                'calendar.start_time': {},
                $or: []
            };
            if (dataFilterMemo.memo_status) {
                filter.memo_status = Number(dataFilterMemo.memo_status);
            }
            if (dataFilterMemo.range_search != null && arr?.length > 0) {
                startTimeCheck = parseInt(arr[0] as string);
                endTimeCheck = parseInt(arr[1] as string);
                filter['calendar.start_time'] = {
                    $gte: startTimeCheck,
                    $lte: endTimeCheck
                };
            } else {
                filter['calendar.start_time'] = null;
            }
            if (dataFilterMemo.best_memo) {
                if (parseInt(dataFilterMemo.best_memo as string)) {
                    filter.best_memo = true;
                } else {
                    filter.best_memo = false;
                }
            }
            const name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    dataFilterMemo.search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
            for (const query of name_query_list) {
                // @ts-ignore
                filter.$or.push(query);
            }
            if (dataFilterMemo.memo_type == 'NORMAL_MEMO') {
                const orderTrials = await OrderedPackageActions.findAll({
                    type: [EnumPackageOrderType.TRIAL]
                });
                const package_ids = orderTrials.map((e) => e.id);
                filter.ordered_package_id = { $nin: package_ids };
            }
            const bookings = await BookingActions.findAll(
                filter,
                { 'calendar.start_time': -1 },
                { teacher: 0, course: 0, student: 0, unit: 0 }
            );
            if (bookings) {
                // check xem đã có đánh giá của prompt này ở khoảng time này chưa
                const filterPrompt: any = {
                    student_id: bookings[0]?.student_id,
                    prompt_obj_id: promptObjId,
                    $or: [
                        {
                            $and: [
                                { start_time: { $lt: startTimeCheck } },
                                { end_time: { $gt: endTimeCheck } }
                            ]
                        },
                        {
                            $and: [
                                { start_time: { $gte: startTimeCheck } },
                                { start_time: { $lt: endTimeCheck } }
                            ]
                        },
                        {
                            $and: [
                                { end_time: { $gt: startTimeCheck } },
                                { end_time: { $lte: endTimeCheck } }
                            ]
                        }
                    ]
                };
                const promptCheck =
                    await LearningAssessmentReportsActions.findOne(
                        filterPrompt
                    );
                if (promptCheck) {
                    throw new BadRequestError(
                        'Đã có đánh giá của khoảng thời gian thuộc khoảng thời gian đang lọc của loại Prompt này '
                    );
                }
                await Promise.all(
                    bookings.map(async (item, index) => {
                        if (item?.memo?.other && item?.memo?.other[5]) {
                            dataBooking.push(item);
                        }
                    })
                );
            }
        }
        if (dataBooking && dataBooking.length > 4 && promptTemplate) {
            const studentId = dataBooking[0].student_id;
            const studentData = await UserActions.findOne({ id: studentId });
            let name = null;
            let age = null;
            let listMemo: any = '';
            if (studentData) {
                name = studentData?.full_name;
                age = moment
                    .unix(moment().valueOf() / 1000)
                    .diff(moment(studentData?.date_of_birth, 'YYYY'), 'years');
            } else {
                logger.error('name or age is not exists');
                throw new BadRequestError('wrong input data');
            }
            const numberClass = dataBooking.length;
            let index = 1;
            for await (const booking of dataBooking) {
                const dataMemo = booking.memo;
                if (dataMemo) {
                    const findData = async (
                        keyword: string,
                        keyArr: string,
                        key: string
                    ) => {
                        try {
                            return (
                                (await dataMemo[keyArr].find(
                                    (e: any) => e.keyword === keyword
                                )[key]) || 'Chưa có đánh giá'
                            );
                        } catch (error) {
                            logger.info('keyArr' + keyArr);
                            logger.info('keyArr' + keyword);
                            logger.info('keyArr' + key);
                            logger.error('data memo is not exists');
                            throw new BadRequestError('wrong input data');
                        }
                        return 'Chưa có đánh giá';
                    };
                    const strength_point = await findData(
                        'strength',
                        'other',
                        'comment'
                    );
                    const weakness_point = await findData(
                        'weakness',
                        'other',
                        'comment'
                    );
                    const comment = await findData(
                        'another_comment',
                        'other',
                        'comment'
                    );
                    const level_of_attention = await findData(
                        'attention',
                        'other',
                        'comment'
                    );
                    const level_of_comprehension = await findData(
                        'comprehension',
                        'other',
                        'comment'
                    );
                    const in_class_performance = await findData(
                        'performance',
                        'other',
                        'comment'
                    );
                    if (
                        level_of_attention &&
                        level_of_comprehension &&
                        in_class_performance &&
                        strength_point &&
                        weakness_point &&
                        comment
                    ) {
                        listMemo += ` Class [${index}]: Level of Attention: ${level_of_attention} - Level of Comprehension : ${level_of_comprehension} - In-class Performance : ${in_class_performance} - Strength: ${strength_point} - Weakness: ${weakness_point} - Another comment : ${comment}.`;
                    } else {
                        logger.error('rate component is not exists');
                        throw new BadRequestError('wrong input data');
                    }
                } else {
                    logger.error('dataMemo is not exists');
                    throw new BadRequestError('wrong input data');
                }
                index++;
            }
            let promptData = promptTemplate.prompt;
            logger.info(promptData);
            if (numberClass && listMemo) {
                promptData = await promptData.replace('$[user_name]', name);
                promptData = await promptData.replace('$[age]', age);
                promptData = await promptData.replace(
                    '$[number_class]',
                    numberClass
                );
                promptData = await promptData.replace('$[list_memo]', listMemo);
            } else {
                logger.error('numberClass or listMemo is not exists');
                throw new BadRequestError('wrong input data');
            }
            let dataGenerate: any =
                await AIReportGenerateController.generateAIResult(promptData);
            if (dataGenerate) {
                dataGenerate = await dataGenerate.replaceAll(
                    '\n\n',
                    '</p> <p>'
                );
                res_payload.data = dataGenerate;
            }
        } else {
            throw new BadRequestError('wrong input data');
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
