import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import UserActions from '../actions/user';
import UnitActions from '../actions/unit';
import { RoleCode } from '../const/role';
import CourseActions from '../actions/course';
import TrialTestIeltsResultActions from '../actions/trial-test-ielts-result';
import TrialTestIeltsResult, {
    EnumTestType,
    EnumTrialTestIeltsSubType
} from '../models/trial-test-ielts-result';
import TrialTestServices from '../services/trial-test';
import CounterActions from '../actions/counter';
import config from 'config';
import _ from 'lodash';
import TrialBookingControllers from '../controllers/trial-booking.controller';
import moment from 'moment';
import BookingActions from '../actions/booking';
import { EnumUnitType } from '../models/unit';
import { EnumTypeChangeData } from '../services/logger';
import LogServices from '../services/logger';
import { AnyMxRecord } from 'dns';
import TemplateActions from '../actions/template';
import { BackEndNotification } from '../const/notification';
import * as natsClient from '../services/nats/nats-client';
import AdminActions from '../actions/admin';
import { DepartmentModel } from '../models/department';
import { CODE_DEPARTMENT } from '../const/department';
import { AdminModel } from '../models/admin';
import OperationIssueActions from '../actions/operation-issue';

const DOMAIN_TEST: any = config.get('services.trial_test.test_url');
const logger = require('dy-logger');
const pickUpData = [
    '_id',
    'id',
    'student_id',
    'course_id',
    'unit_id',
    'test_type',
    'test_result_grammar',
    'test_result_writing',
    'test_result_reading',
    'test_result_listening',
    'test_result_speaking'
];

export default class TrialTestIeltsResultController {
    public static async getAllTrialTestIeltsResults(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            start_time,
            search,
            sort,
            max_end_time,
            min_start_time,
            min_test_start_time,
            max_test_start_time,
            recorded,
            student_id,
            id
        } = req.query;
        let filter: any = {
            'test_result_grammar.test_start_time': start_time
                ? parseInt(start_time as string)
                : 0,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            $and: [
                {
                    $or: [
                        {
                            'test_result_grammar.submission_time': {
                                $exits: true
                            }
                        },
                        {
                            'test_result_listening.submission_time': {
                                $exits: true
                            }
                        },
                        {
                            'test_result_reading.submission_time': {
                                $exits: true
                            }
                        },
                        {
                            'test_result_writing.submission_time': {
                                $exits: true
                            }
                        },
                        { 'test_result_speaking.score': { $exits: true } }
                    ]
                }
            ]
        };
        if (id) {
            filter.id = Number(id);
        }

        if (student_id) {
            filter.student_id = parseInt(student_id as string);
        }

        filter.$and = [];
        if (min_test_start_time) {
            filter.$and.push({
                'test_result_grammar.test_start_time': {
                    $gte: parseInt(min_test_start_time as string)
                }
            });
        }
        if (max_test_start_time) {
            filter.$and.push({
                'test_result_grammar.test_start_time': {
                    $lte: parseInt(max_test_start_time as string)
                }
            });
        }

        // const date = new Date();
        // const valid_date = date.setMonth(date.getMonth() - 6);

        // if (
        //     parseInt(min_start_time as string) >
        //         parseInt(max_end_time as string) ||
        //     parseInt(start_time as string) < new Date(valid_date).getTime() ||
        //     parseInt(min_start_time as string) < new Date(valid_date).getTime()
        // ) {
        //     const res_payload = {
        //         data: [],
        //         pagination: {
        //             total: 0
        //         }
        //     };
        //     return new SuccessResponse('success', res_payload).send(res, req);
        // }

        const sort_field: any = {};
        if (min_test_start_time || max_test_start_time) {
            sort_field['test_result_grammar.test_start_time'] = -1;
        } else {
            sort_field['created_time'] = -1;
        }
        const results = await TrialTestIeltsResultActions.findAllAndPaginated(
            filter,
            sort_field
        );
        const count = await TrialTestIeltsResultActions.count(filter);
        const res_payload = {
            data: results,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async createTrialTestIeltsResultForCrm(
        req: ProtectedRequest,
        res: Response
    ) {
        const { username, unit_id } = req.body;
        const course_id = req.body.course;
        req.user = {
            role: [RoleCode.SUPER_ADMIN],
            isAdmin: true
        };

        const course = await CourseActions.findOne({
            id: parseInt(course_id as string)
        });
        if (!course) {
            throw new BadRequestError(req.t('errors.course.not_found'));
        }

        const student_user = await UserActions.findOne({
            username
        });
        if (!student_user) {
            throw new BadRequestError(req.t('errors.user.not_found'));
        }

        const unit = await UnitActions.findOne({
            id: Number(unit_id),
            course_id: course_id,
            is_active: true
        });
        if (!unit) {
            throw new BadRequestError(req.t('errors.unit.not_found'));
        }

        if (
            (unit.unit_type === EnumUnitType.IELTS_GRAMMAR &&
                !unit.test_topic_id) ||
            (unit.unit_type === EnumUnitType.IELTS_4_SKILLS &&
                (!unit.ielts_listening_topic_id ||
                    !unit.ielts_reading_topic_id ||
                    !unit.ielts_writing_topic_id))
        ) {
            throw new BadRequestError(
                req.t(
                    'errors.trial_test_ielts_result.please_select_the_unit_with_the_topic'
                )
            );
        }

        const dataTrialBookingCreationForCrm =
            await TrialBookingControllers.handleTrialBookingCreationForCrm(
                req,
                res
            );
        req = dataTrialBookingCreationForCrm.req;
        res = dataTrialBookingCreationForCrm.res;
        const dataTrialBookingCreation =
            await TrialBookingControllers.handleTrialBookingCreation(req, res);
        req = dataTrialBookingCreation.req;
        res = dataTrialBookingCreation.res;

        let trialTestIeltsResultInfo: any = null;
        trialTestIeltsResultInfo = await TrialTestIeltsResultActions.findOne({
            booking_id:
                dataTrialBookingCreation?.new_trial_booking?.booking?.id,
            student_id:
                dataTrialBookingCreation?.new_trial_booking?.booking?.student_id
        });
        logger.info(
            'crm create trial test ielts' +
                JSON.stringify(trialTestIeltsResultInfo)
        );
        if (!trialTestIeltsResultInfo) {
            const dataNew = {
                student_user,
                booking: dataTrialBookingCreation?.new_trial_booking?.booking,
                unit,
                course
            };
            trialTestIeltsResultInfo =
                await TrialTestIeltsResultController.createTrialTestIeltsResult(
                    unit.unit_type,
                    dataNew
                );
        }
        if (trialTestIeltsResultInfo) {
            if (unit.unit_type === EnumUnitType.IELTS_GRAMMAR) {
                if (unit.test_topic_id) {
                    trialTestIeltsResultInfo.test_url = `${DOMAIN_TEST}${trialTestIeltsResultInfo.test_url}?code=${trialTestIeltsResultInfo.test_result_grammar.test_result_code}&type=test&test_type=3`;
                }
            } else if (unit.unit_type === EnumUnitType.IELTS_4_SKILLS) {
                // thêm link chung đến màn thi 3 kỹ năng IELTS
                trialTestIeltsResultInfo.test_url = `${DOMAIN_TEST}${trialTestIeltsResultInfo.test_url}?code=${trialTestIeltsResultInfo.code_access}`;
            }
            logger.info(
                'link trial test ielts' + trialTestIeltsResultInfo?.test_url
            );
            return new SuccessResponse(req.t('common.success'), {
                ...trialTestIeltsResultInfo,
                test_url: trialTestIeltsResultInfo?.test_url,
                ...dataTrialBookingCreation?.new_trial_booking
            }).send(res, req);
        }
        return new SuccessResponse(req.t('common.success'), {
            ...dataTrialBookingCreation?.new_trial_booking
        }).send(res, req);
    }

    public static async updateTestResult(req: ProtectedRequest, res: Response) {
        const { test_result } = req.body;
        const test_result_id = parseInt(req.body.test_result_id as string);
        logger.info(`>>> updateTestResult, test_result_id: ${test_result_id}`);
        const filter = {
            $and: [
                {
                    $or: [
                        {
                            'test_result_grammar.test_result_id': test_result_id
                        },
                        {
                            'test_result_listening.test_result_id':
                                test_result_id
                        },
                        {
                            'test_result_reading.test_result_id': test_result_id
                        },
                        { 'test_result_writing.test_result_id': test_result_id }
                    ]
                }
            ]
        };
        logger.info(`>>> updateTestResult, filter: ${filter}`);
        const trialTestIeltsResult = await TrialTestIeltsResultActions.findOne(
            filter
        );
        logger.info(`>>> updateTestResult, data: ${trialTestIeltsResult}`);
        if (!trialTestIeltsResult) {
            throw new BadRequestError(
                req.t('errors.trial_test_ielts_result.not_found')
            );
        }

        const lesson = await BookingActions.findOne({
            id: trialTestIeltsResult.booking_id
        });

        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }

        logger.info(
            `>>> updateTestResult, trial test ielts id: ${trialTestIeltsResult.id}`
        );

        logger.info(
            `>>> updateTestResult, test_result: ${JSON.stringify(test_result)}`
        );

        const testResult = JSON.parse(test_result);

        let dateCreateTestStr = moment
            .unix(testResult.test_start_time / 1000)
            .format('YYYY-MM-DD');
        let bookingStartDateStr = moment
            .unix(lesson.calendar.end_time / 1000)
            .format('YYYY-MM-DD');

        if (
            test_result_id !=
            trialTestIeltsResult.test_result_grammar?.test_result_id
        ) {
            dateCreateTestStr = moment
                .unix(testResult.test_start_time / 1000)
                .format('YYYY-MM-DD HH:mm:ss');
            bookingStartDateStr = moment
                .unix(lesson.calendar.end_time / 1000)
                .add(2, 'day')
                .format('YYYY-MM-DD HH:mm:ss');
        }

        logger.info(
            `>>> updateTestResult, dateCreateTestStr: ${dateCreateTestStr}`
        );
        logger.info(
            `>>> updateTestResult, bookingStartDateStr: ${bookingStartDateStr}`
        );

        if (dateCreateTestStr > bookingStartDateStr) {
            throw new BadRequestError(req.t('errors.overtime_for_the_test'));
        }
        let diff: any = {};
        let testResultCode = null;
        switch (test_result_id) {
            case trialTestIeltsResult.test_result_grammar?.test_result_id:
                if (
                    trialTestIeltsResult.test_result_grammar?.test_result_id &&
                    trialTestIeltsResult.test_result_grammar?.submission_time
                ) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                diff = {
                    test_result_grammar: {
                        test_topic_id:
                            trialTestIeltsResult.test_result_grammar
                                ?.test_topic_id,
                        test_result_id:
                            trialTestIeltsResult.test_result_grammar
                                ?.test_result_id,
                        test_result_code:
                            trialTestIeltsResult.test_result_grammar
                                ?.test_result_code,
                        test_topic_name:
                            trialTestIeltsResult.test_result_grammar
                                ?.test_topic_name,
                        sub_test_url:
                            trialTestIeltsResult.test_result_grammar
                                ?.sub_test_url,
                        ...testResult
                    }
                };
                testResultCode =
                    trialTestIeltsResult.test_result_grammar?.test_result_code;
                break;

            case trialTestIeltsResult.test_result_listening?.test_result_id:
                if (
                    trialTestIeltsResult.test_result_listening
                        ?.test_result_id &&
                    trialTestIeltsResult.test_result_listening?.submission_time
                ) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                diff = {
                    test_result_listening: {
                        test_topic_id:
                            trialTestIeltsResult.test_result_listening
                                ?.test_topic_id,
                        test_result_id:
                            trialTestIeltsResult.test_result_listening
                                ?.test_result_id,
                        test_result_code:
                            trialTestIeltsResult.test_result_listening
                                ?.test_result_code,
                        test_topic_name:
                            trialTestIeltsResult.test_result_listening
                                ?.test_topic_name,
                        sub_test_url:
                            trialTestIeltsResult.test_result_listening
                                ?.sub_test_url,
                        ...testResult
                    }
                };
                testResultCode =
                    trialTestIeltsResult.test_result_listening
                        ?.test_result_code;
                break;

            case trialTestIeltsResult.test_result_reading?.test_result_id:
                if (
                    trialTestIeltsResult.test_result_reading?.test_result_id &&
                    trialTestIeltsResult.test_result_reading?.submission_time
                ) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                diff = {
                    test_result_reading: {
                        test_topic_id:
                            trialTestIeltsResult.test_result_reading
                                ?.test_topic_id,
                        test_result_id:
                            trialTestIeltsResult.test_result_reading
                                ?.test_result_id,
                        test_result_code:
                            trialTestIeltsResult.test_result_reading
                                ?.test_result_code,
                        test_topic_name:
                            trialTestIeltsResult.test_result_reading
                                ?.test_topic_name,
                        sub_test_url:
                            trialTestIeltsResult.test_result_reading
                                ?.sub_test_url,
                        ...testResult
                    }
                };
                testResultCode =
                    trialTestIeltsResult.test_result_reading?.test_result_code;
                break;

            case trialTestIeltsResult.test_result_writing?.test_result_id:
                if (
                    trialTestIeltsResult.test_result_writing?.test_result_id &&
                    trialTestIeltsResult.test_result_writing?.submission_time
                ) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                diff = {
                    test_result_writing: {
                        test_topic_id:
                            trialTestIeltsResult.test_result_writing
                                ?.test_topic_id,
                        test_result_id:
                            trialTestIeltsResult.test_result_writing
                                ?.test_result_id,
                        test_result_code:
                            trialTestIeltsResult.test_result_writing
                                ?.test_result_code,
                        test_topic_name:
                            trialTestIeltsResult.test_result_writing
                                ?.test_topic_name,
                        sub_test_url:
                            trialTestIeltsResult.test_result_writing
                                ?.sub_test_url,
                        test_start_time: testResult.test_start_time,
                        submission_time: testResult.submission_time
                    }
                };
                testResultCode =
                    trialTestIeltsResult.test_result_writing?.test_result_code;
                break;
        }

        await TrialTestIeltsResultActions.update(
            trialTestIeltsResult._id,
            diff as TrialTestIeltsResult
        );

        // Notify cho tài khoản chỉ định bên Học thuật khi có HV nộp bài Ielts wrting
        // Tài khoản học thuật:
        // Dev: id: 30, username: "tramanh"
        // Prod: id: 28, username: "tramanhize"
        if (
            test_result_id ==
            trialTestIeltsResult.test_result_writing?.test_result_id
        ) {
            const templatePayload = {
                student_name: `${lesson.student.full_name} - ${lesson.student.username}`,
                start_time: lesson.calendar.start_time
            };
            const notiTemplate = await TemplateActions.findOne({
                code: BackEndNotification.STUDENT_SUBMIT_IELTS_WRITING
            });
            const operationIssue = await OperationIssueActions.create({
                booking_id: null,
                issue_description: 'Hv submit IELTS writing',
                resolved_staff_id: null
            } as any);
            const operationIssueId = operationIssue?._id;

            if (notiTemplate) {
                // Thông báo cho admin
                const adminOwner = await AdminActions.findOne({
                    username: 'admin'
                });
                if (adminOwner) {
                    natsClient.publishEventWithTemplate({
                        template: notiTemplate.content,
                        data: templatePayload,
                        receiver: adminOwner._id,
                        template_obj_id: notiTemplate._id
                    });
                }

                // thông báo cho all nhân viên phòng Học Thuật
                const htDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.HOC_THUAT
                });
                if (htDepartment) {
                    const allStaffHT = await AdminModel.find({
                        'department.department': htDepartment._id
                    });
                    if (allStaffHT.length) {
                        allStaffHT.forEach((element: any) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplate.content,
                                data: templatePayload,
                                receiver: element._id,
                                template_obj_id: notiTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                }
            }
        }

        const res_payload = {
            data: {
                test_result_code: testResultCode
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async editTrialTestIeltsWritingResults(
        req: ProtectedRequest,
        res: Response
    ) {
        const { result_id } = req.params;
        const { note, sub_type, scores } = req.body;
        if (!scores) {
            throw new BadRequestError(
                req.t('errors.trial_test_ielts_results.score_required')
            );
        }
        const type_result = parseInt(req.body.type_result as string);
        const resultData = await TrialTestIeltsResultActions.findOne({
            id: parseInt(result_id as string)
        });
        if (!resultData) {
            throw new BadRequestError(
                req.t('errors.trial_test_ielts_results.result_null')
            );
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TrialTestIeltsResultModel',
            resultData,
            pickUpData
        );
        const diff: any = {};

        if (
            type_result == EnumTestType.IELTS_4_SKILLS &&
            sub_type == EnumTrialTestIeltsSubType.WRITING
        ) {
            if (!resultData?.test_result_writing?.submission_time) {
                throw new BadRequestError(
                    req.t('errors.trial_test_ielts_results.writing_unfinished')
                );
            }
            diff.test_result_writing = {
                test_topic_id: resultData?.test_result_writing?.test_topic_id,
                test_result_id: resultData?.test_result_writing?.test_result_id,
                test_result_code:
                    resultData?.test_result_writing?.test_result_code,
                test_topic_name:
                    resultData?.test_result_writing?.test_topic_name,
                sub_test_url: resultData?.test_result_writing?.sub_test_url,
                test_start_time:
                    resultData?.test_result_writing?.test_start_time,
                submission_time:
                    resultData?.test_result_writing?.submission_time,
                score: scores,
                note
            };
        }

        if (diff) {
            const new_data = await TrialTestIeltsResultActions.update(
                resultData._id,
                {
                    ...diff
                } as TrialTestIeltsResult
            );
            LogServices.setChangeData(
                req,
                EnumTypeChangeData.new,
                'TrialTestIeltsResultModel',
                new_data,
                pickUpData
            );
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async createTrialTestIeltsResult(
        unit_type?: string,
        data?: any
    ) {
        if (unit_type === EnumUnitType.IELTS_GRAMMAR) {
            const resSessionTest = await TrialTestServices.createSessionTest(
                data?.student_user._id,
                data?.unit.test_topic_id,
                '/api/v1/core/crm/student/trial-test-ielts-result/update-test-result'
            );

            const topicName = resSessionTest?.data.topic_name;
            const testResultId = resSessionTest?.data.id;
            const testResultCode = resSessionTest?.data.code;
            const testUrl = `/student/trial-test`;

            const counter = await CounterActions.findOne();
            const id = counter.trial_test_ielts_result_id;
            const trialTestIeltsResultInfo: any = {
                id,
                student_id: data?.student_user.id,
                booking_id: data?.booking?.id,
                course_id: data?.course.id,
                unit_id: data?.unit.id,
                test_type: EnumTestType.IELTS_GRAMMAR,
                test_url: testUrl,
                test_result_grammar: {
                    test_topic_id: data?.unit.test_topic_id || null,
                    test_result_id: testResultId,
                    test_result_code: testResultCode,
                    test_topic_name: topicName
                }
            };

            await TrialTestIeltsResultActions.create({
                ...trialTestIeltsResultInfo
            } as TrialTestIeltsResult);
            return trialTestIeltsResultInfo;
        } else if (unit_type === EnumUnitType.IELTS_4_SKILLS) {
            // url chung cho link 3 bai test
            const testUrl = `/student/ielts-skill-synthesis`;

            // test ielts listening
            const resSessionTestIeltsListening =
                await TrialTestServices.createSessionTest(
                    data?.student_user._id,
                    data?.unit.ielts_listening_topic_id,
                    '/api/v1/core/crm/student/trial-test-ielts-result/update-test-result'
                );

            const ieltsListeningTopicName =
                resSessionTestIeltsListening?.data.topic_name;
            const ieltsListeningTestResultId =
                resSessionTestIeltsListening?.data.id;
            const ieltsListeningTestResultCode =
                resSessionTestIeltsListening?.data.code;
            const ieltsListeningTestUrl = `/student/trial-test`;

            // test ielts reading
            const resSessionTestIeltsReading =
                await TrialTestServices.createSessionTest(
                    data?.student_user._id,
                    data?.unit.ielts_reading_topic_id,
                    '/api/v1/core/crm/student/trial-test-ielts-result/update-test-result'
                );

            const ieltsReadingTopicName =
                resSessionTestIeltsReading?.data.topic_name;
            const ieltsReadingTestResultId =
                resSessionTestIeltsReading?.data.id;
            const ieltsReadingTestResultCode =
                resSessionTestIeltsReading?.data.code;
            const ieltsReadingTestUrl = `/student/trial-test`;

            // test ielts writing
            const resSessionTestIeltsWriting =
                await TrialTestServices.createSessionTest(
                    data?.student_user._id,
                    data?.unit.ielts_writing_topic_id,
                    '/api/v1/core/crm/student/trial-test-ielts-result/update-test-result'
                );

            const ieltsWritingTopicName =
                resSessionTestIeltsWriting?.data.topic_name;
            const ieltsWritingTestResultId =
                resSessionTestIeltsWriting?.data.id;
            const ieltsWritingTestResultCode =
                resSessionTestIeltsWriting?.data.code;
            const ieltsWritingTestUrl = `/student/trial-test`;

            const codeAccess =
                await TrialTestIeltsResultController.generateCode(16);

            const counter = await CounterActions.findOne();
            const id = counter.trial_test_ielts_result_id;
            const trialTestIeltsResultInfo: any = {
                id,
                student_id: data?.student_user.id,
                booking_id: data?.booking?.id,
                course_id: data?.course.id,
                unit_id: data?.unit.id,
                test_type: EnumTestType.IELTS_4_SKILLS,
                test_url: testUrl,
                code_access: codeAccess,
                test_result_listening: {
                    test_topic_id: data?.unit.ielts_listening_topic_id || null,
                    test_result_id: ieltsListeningTestResultId,
                    test_result_code: ieltsListeningTestResultCode,
                    test_topic_name: ieltsListeningTopicName,
                    sub_test_url: ieltsListeningTestUrl
                },
                test_result_reading: {
                    test_topic_id: data?.unit.ielts_reading_topic_id || null,
                    test_result_id: ieltsReadingTestResultId,
                    test_result_code: ieltsReadingTestResultCode,
                    test_topic_name: ieltsReadingTopicName,
                    sub_test_url: ieltsReadingTestUrl
                },
                test_result_writing: {
                    test_topic_id: data?.unit.ielts_writing_topic_id || null,
                    test_result_id: ieltsWritingTestResultId,
                    test_result_code: ieltsWritingTestResultCode,
                    test_topic_name: ieltsWritingTopicName,
                    sub_test_url: ieltsWritingTestUrl
                }
            };

            await TrialTestIeltsResultActions.create({
                ...trialTestIeltsResultInfo
            } as TrialTestIeltsResult);
            return trialTestIeltsResultInfo;
        }
    }

    public static generateCode(length: any) {
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
        }
        return result.toString();
    }

    public static async getLinkIeltsSkills(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`>>> getLinkIeltsSkills`);
        const { ielts_skill_synthesis_code } = req.query;
        logger.info(
            `ielts_skill_synthesis_code: ${ielts_skill_synthesis_code}`
        );
        const trialTestIeltsResult = await TrialTestIeltsResultActions.findOne({
            code_access: ielts_skill_synthesis_code
        });

        const listeningTestUrl = `${DOMAIN_TEST}${trialTestIeltsResult?.test_result_listening?.sub_test_url}?code=${trialTestIeltsResult?.test_result_listening?.test_result_code}&type=test`;
        const readingTestUrl = `${DOMAIN_TEST}${trialTestIeltsResult?.test_result_reading?.sub_test_url}?code=${trialTestIeltsResult?.test_result_reading?.test_result_code}&type=test`;
        const writingTestUrl = `${DOMAIN_TEST}${trialTestIeltsResult?.test_result_writing?.sub_test_url}?code=${trialTestIeltsResult?.test_result_writing?.test_result_code}&type=test`;
        const listeningResultUrl = `${DOMAIN_TEST}${trialTestIeltsResult?.test_result_listening?.sub_test_url}?code=${trialTestIeltsResult?.test_result_listening?.test_result_code}&type=result`;
        const readingResultUrl = `${DOMAIN_TEST}${trialTestIeltsResult?.test_result_reading?.sub_test_url}?code=${trialTestIeltsResult?.test_result_reading?.test_result_code}&type=result`;
        const writingResultUrl = `${DOMAIN_TEST}${trialTestIeltsResult?.test_result_writing?.sub_test_url}?code=${trialTestIeltsResult?.test_result_writing?.test_result_code}&type=result`;
        const finishedListening = trialTestIeltsResult?.test_result_listening
            ?.submission_time
            ? true
            : false;
        const finishedReading = trialTestIeltsResult?.test_result_reading
            ?.submission_time
            ? true
            : false;
        const finishedWriting = trialTestIeltsResult?.test_result_writing
            ?.submission_time
            ? true
            : false;

        const res_payload = {
            ielts_listening: {
                has_been_completed: finishedListening,
                test_url: listeningTestUrl,
                result_url: listeningResultUrl
            },
            ielts_reading: {
                has_been_completed: finishedReading,
                test_url: readingTestUrl,
                result_url: readingResultUrl
            },
            ielts_writing: {
                has_been_completed: finishedWriting,
                test_url: writingTestUrl,
                result_url: writingResultUrl
            }
        };
        logger.info(`<<< getLinkIeltsSkills`);
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
