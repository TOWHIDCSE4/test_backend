import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import UnitActions from '../actions/unit';
import HomeworkTestResultActions from '../actions/homework-test-result';
import HomeworkTestResult, {
    EnumTestType,
    HomeworkTestResultModel
} from '../models/homework-test-result';
import TrialTestServices from '../services/trial-test';
import CounterActions from '../actions/counter';
import moment from 'moment';
import BookingActions from '../actions/booking';
import _ from 'lodash';
import Booking from '../models/booking';
import Unit from '../models/unit';
import { EnumCourseType } from '../models/course';

const logger = require('dy-logger');

export default class HomeworkTestResultController {
    public static async getAllHomeworkTestResult(
        req: ProtectedRequest,
        res: Response
    ) {
        const { booking_id, page_number, page_size } = req.query;
        const user_id = _.toInteger(req.user.id);
        const filter = {
            booking_id: Number(booking_id),
            student_id: user_id,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            'test_result.submission_time': { $exists: true }
        };

        const homeworkTestResult =
            await HomeworkTestResultActions.findAllAndPaginated(filter, {
                'test_result.test_start_time': 1
            });

        const count = await HomeworkTestResultActions.count(filter);

        const res_payload = {
            data: homeworkTestResult,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async startTest(req: ProtectedRequest, res: Response) {
        const { id } = req.user;
        const { lesson_id } = req.body;

        const lesson = await BookingActions.findOne({
            student_id: id,
            id: parseInt(lesson_id as string)
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }

        const unit = await UnitActions.findOne({
            id: lesson.unit_id
        });
        if (!unit) throw new BadRequestError(req.t('errors.unit.not_found'));

        if (!unit.homework2_id) {
            throw new BadRequestError(
                req.t(
                    'errors.trial_test_ielts_result.please_select_the_unit_with_the_topic'
                )
            );
        }

        // const dateCreateTestStr = moment().format('YYYY-MM-DD');
        // const bookingStartDateStr = moment
        //     .unix(lesson.calendar.start_time / 1000)
        //     .add(2, 'day')
        //     .format('YYYY-MM-DD');

        // if (dateCreateTestStr > bookingStartDateStr) {
        //     throw new BadRequestError(req.t('errors.overtime_for_the_test'));
        // }

        const homeworkTestResult = HomeworkTestResultActions.findOne({
            booking_id: lesson.id,
            test_result: { $exists: false }
        });
        const HomeworkTestResultInfo =
            await HomeworkTestResultController.updateTrialBookingTest(
                req,
                homeworkTestResult,
                lesson,
                unit
            );

        const res_payload = {
            data: {
                test_result_code: HomeworkTestResultInfo.testResultCode,
                test_url: HomeworkTestResultInfo.testUrl
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async updateTestResult(req: ProtectedRequest, res: Response) {
        const { test_result_id, test_result, test_start_time } = req.body;
        logger.info(`>>> updateTestResult, test_result_id: ${test_result_id}`);
        logger.info(
            `>>> updateTestResult, test_start_time: ${test_start_time}`
        );
        const testStartTime = parseInt(test_start_time);

        // const lesson = await BookingActions.findOne({
        //     test_result_id
        // });
        // if (!lesson) {
        //     throw new BadRequestError(req.t('errors.booking.not_found'));
        // }

        const homeworkTestResult = await HomeworkTestResultActions.findOne({
            test_result_id
        });
        if (!homeworkTestResult) {
            throw new BadRequestError(
                req.t('errors.homework_test_results.not_found')
            );
        }

        const isTestResult =
            await HomeworkTestResultController.checkTestResultTrialTest(
                homeworkTestResult
            );
        if (isTestResult) {
            throw new BadRequestError(req.t('errors.test_has_been_completed'));
        }

        // const dateCreateTestStr = moment
        //     .unix(test_start_time / 1000)
        //     .format('YYYY-MM-DD');
        // const bookingStartDateStr = moment
        //     .unix(lesson.calendar.start_time / 1000)
        //     .add(2, 'day')
        //     .format('YYYY-MM-DD');

        // if (dateCreateTestStr > bookingStartDateStr) {
        //     throw new BadRequestError(req.t('errors.overtime_for_the_test'));
        // }

        logger.info(
            `>>> updateTestResult, test_result: ${JSON.stringify(test_result)}`
        );

        let testResult = JSON.parse(test_result);

        if (homeworkTestResult.test_type == EnumTestType.homework) {
            const countCategoryInTestResult =
                await HomeworkTestResultController.countCategoryInTestResult(
                    testResult
                );
            const totalScoreInTestResult =
                await HomeworkTestResultController.totalScoreInTestResult(
                    testResult
                );
            const avg =
                Math.round(
                    (totalScoreInTestResult / countCategoryInTestResult) * 10
                ) / 10;
            testResult = {
                ...testResult,
                test_start_time: testStartTime,
                avg: avg
            };
        }

        const diff: any = {
            test_result: testResult
        };

        await HomeworkTestResultActions.update(
            homeworkTestResult._id,
            diff as HomeworkTestResult
        );

        const res_payload = {
            data: {
                test_result_code: homeworkTestResult.test_result_code
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    private static async checkTestResultTrialTest(
        homeworkTestResult: HomeworkTestResult
    ) {
        const allScore = [
            homeworkTestResult.test_result?.vocabulary,
            homeworkTestResult.test_result?.reading,
            homeworkTestResult.test_result?.writing,
            homeworkTestResult.test_result?.grammar
        ];
        const checkNumber = (element: any) => typeof element === 'number';
        return allScore.some(checkNumber);
    }

    private static async countCategoryInTestResult(testResult: any) {
        const allScore = [
            testResult?.vocabulary,
            testResult?.reading,
            testResult?.writing,
            testResult?.grammar
        ];
        const checkNumber = allScore.filter((item) => typeof item === 'number');
        return checkNumber.length;
    }

    private static async totalScoreInTestResult(testResult: any) {
        const allScore = [
            testResult?.vocabulary,
            testResult?.reading,
            testResult?.writing,
            testResult?.grammar
        ];
        return allScore.reduce(function (acc, val) {
            return acc + val;
        }, 0);
    }

    public static async updateTrialBookingTest(
        req: ProtectedRequest,
        homeworkTestResult: any,
        lesson: Booking,
        unit: Unit
    ) {
        const { _id, id } = req.user;
        let testResultId = homeworkTestResult?.test_result_id || null;
        let testResultCode = homeworkTestResult?.test_result_code || null;
        let testUrl = homeworkTestResult?.test_url || null;
        let diff = {};

        if (!testResultId) {
            try {
                let testType = EnumTestType.homework;
                if (lesson?.course?.course_type == EnumCourseType.IELTS) {
                    testType = EnumTestType.ielts;
                }

                const resSessionTest =
                    await TrialTestServices.createSessionTest(
                        _id,
                        unit.homework2_id,
                        '/api/v1/core/student/homework/update-test-result',
                        testType
                    );

                const topicName = resSessionTest?.data.topic_name;
                testResultId = resSessionTest?.data.id;
                testResultCode = resSessionTest?.data.code;
                testUrl = `/student/trial-test`;

                const counter = await CounterActions.findOne();
                const homeworkTestResultId = counter.homework_test_result_id;

                diff = {
                    id: homeworkTestResultId,
                    student_id: id,
                    booking_id: lesson.id,
                    course_id: unit.course_id,
                    unit_id: unit.id,
                    test_type: testType,
                    test_topic_id: unit.homework2_id,
                    test_result_id: testResultId,
                    test_result_code: testResultCode,
                    test_topic_name: topicName,
                    test_url: testUrl
                };

                await HomeworkTestResultActions.create({
                    ...diff
                } as HomeworkTestResult);
            } catch (err: any) {
                logger.error(
                    `----------> error createSessionTest: ${err.message}`
                );
                throw new BadRequestError(err.message);
            }
        } else {
            try {
                await TrialTestServices.updateSessionTest(
                    _id,
                    testResultId,
                    homeworkTestResult?.test_topic_id
                );
            } catch (err: any) {
                logger.error(
                    `----------> error updateSessionTest: ${err.message}`
                );
                throw new BadRequestError(err.message);
            }
        }

        return {
            testResultId,
            testResultCode,
            testUrl
        };
    }

    public static async getSelfStudyHistoryV2(
        req: ProtectedRequest,
        res: Response
    ) {
        const { search_student, search_self_study, page_number, page_size } =
            req.query;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            'test_result.submission_time': { $exists: true },
            $and: new Array<any>()
        };

        if (search_student) {
            filter.$and.push({
                $or: [
                    {
                        'student.full_name': {
                            $regex: search_student,
                            $options: 'i'
                        }
                    },
                    {
                        'student.username': {
                            $regex: search_student,
                            $options: 'i'
                        }
                    }
                ]
            });
        }

        if (search_self_study) {
            filter.$and.push({
                test_topic_name: {
                    $regex: search_self_study,
                    $options: 'i'
                }
            });
        }

        let homeworkTestResult =
            await HomeworkTestResultActions.findAllAndPaginated(filter, {
                id: -1
            });

        const studentIds = homeworkTestResult.map((e: any) => e?.student_id);
        logger.info(`studentIds: ${studentIds}`);

        const aggregate = [
            {
                $match: {
                    student_id: { $in: studentIds }
                }
            },
            {
                $group: {
                    _id: '$student_id'
                }
            },
            {
                $lookup: {
                    from: 'homework-test-result',
                    let: {
                        uid: '$_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$uid', '$student_id']
                                }
                            }
                        },
                        {
                            $sort: {
                                'test_result.submission_time': 1
                            }
                        },
                        {
                            $limit: 1
                        }
                    ],
                    as: 'top1'
                }
            },
            {
                $unwind: '$top1'
            },
            {
                $replaceRoot: {
                    newRoot: '$top1'
                }
            }
        ];
        const pickFistSubmitByStudent = await HomeworkTestResultModel.aggregate(
            aggregate
        );

        const fistSubmitIds = pickFistSubmitByStudent.map((e: any) => e?.id);
        logger.info(`fistSubmitIds: ${fistSubmitIds}`);

        const testTopicIds = homeworkTestResult.map(
            (e: any) => e?.test_topic_id
        );

        const resInformationOfTopicsById =
            await TrialTestServices.getInformationOfTopicsById(testTopicIds);

        homeworkTestResult = await Promise.all(
            homeworkTestResult.map(async (u: any) => {
                const tmp: any = {
                    ...u
                };

                if (fistSubmitIds.includes(tmp.id)) {
                    tmp.is_first_submission = true;
                } else {
                    tmp.is_first_submission = false;
                }

                tmp.topic_information = resInformationOfTopicsById.data.find(
                    (obj: any) => {
                        return obj?.id == tmp.test_topic_id;
                    }
                );

                if (tmp.test_result?.avg) {
                    tmp.test_result.avg =
                        Math.round(tmp.test_result?.avg * 10) / 10;
                }

                return tmp;
            })
        );

        const count = await HomeworkTestResultActions.count(filter);

        const res_payload = {
            data: homeworkTestResult,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}
