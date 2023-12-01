import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { RoleCode } from '../const/role';
import UserActions from '../actions/user';
import BookingActions from '../actions/booking';
import User, { UserModel } from '../models/user';
import Booking, { EnumBookingMediumType } from '../models/booking';
import CourseActions from '../actions/course';
import { CourseModel, EnumCourseType } from '../models/course';
import { EnumUnitType, UnitModel } from '../models/unit';
import TrialTestIeltsResultActions from '../actions/trial-test-ielts-result';
import CSCallManagementActions from '../actions/cs-call-management';
import CSCallManagement, {
    CSCallManagementModel,
    CallType,
    EnumPeriodicType,
    EnumPriority
} from '../models/cs-call-management';
import { EnumRegularCare } from '../models/cs-call-management';
import StudentLeaveRequestActions from '../actions/student-leave-request';
import StudentLeaveRequest from '../models/student-leave-request';
import CounterActions from '../actions/counter';
import DepartmentActions from '../actions/department';
import Department from '../models/department';
import { EnumRole } from '../models/department';
import TemplateActions from '../actions/template';
import { EmailTemplate } from '../const/notification';
import JobQueueServices from '../services/job-queue';
import { findLastIndex } from 'lodash';
const logger = require('dy-logger');

export default class RecoverController {
    public static async recoverLinkSkypeUser(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start recoverLinkSkypeUser >>>>>>>>>>>>>`);
        const user_list = await UserActions.findAllByRecoverLinkSkype({
            is_active: true,
            role: [RoleCode.STUDENT],
            'trial_class_skype_url.joinLink': { $exists: false }
        });
        let countUserRecover = 0;
        for (const user of user_list) {
            const filter = {
                student_id: user.id,
                'learning_medium.medium_type': EnumBookingMediumType.SKYPE,
                'learning_medium.info.joinLink': { $exists: true }
            };
            const booking = await BookingActions.findOne(
                filter,
                { id: 1, learning_medium: 1 },
                { created_time: -1 }
            );
            if (booking) {
                logger.info(`user recover link ${user.id}`);
                logger.info(`booking has link ${booking.id}`);
                await UserActions.update(user._id, {
                    trial_class_skype_url: booking.learning_medium.info
                } as User);
                countUserRecover = countUserRecover + 1;
            }
        }
        logger.info(`total user recover:  ${countUserRecover}`);
        logger.info(`end recoverLinkSkypeUser <<<<<<<<<<<<<<<<<<<<`);
        const res_payload = {
            message: 'recover link skype success'
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async recoverCourseTypeAndUnitType(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start recoverCourseTypeAndUnitType >>>>>>>>>>>>>`);
        await CourseModel.updateMany(
            {
                course_type: { $exists: false }
            },
            {
                $set: {
                    course_type: EnumCourseType.EN_COMMON
                }
            },
            {
                upsert: false
            }
        ).exec();

        await UnitModel.updateMany(
            {
                unit_type: { $exists: false }
            },
            {
                $set: {
                    unit_type: EnumUnitType.EN_COMMON
                }
            },
            {
                upsert: false
            }
        ).exec();

        logger.info(`end recoverCourseTypeAndUnitType <<<<<<<<<<<<<<<<<<<<`);
        const res_payload = {
            message: 'recover course type and unit type success'
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async recoverUnitType(req: ProtectedRequest, res: Response) {
        logger.info(`start recoverUnitType >>>>>>>>>>>>>`);
        const user_list = await UserActions.findAllByRecoverLinkSkype({
            is_active: true,
            role: [RoleCode.STUDENT],
            'trial_class_skype_url.joinLink': { $exists: false }
        });
        let countUserRecover = 0;
        for (const user of user_list) {
            const filter = {
                student_id: user.id,
                'learning_medium.medium_type': EnumBookingMediumType.SKYPE,
                'learning_medium.info.joinLink': { $exists: true }
            };
            const booking = await BookingActions.findOne(
                filter,
                { id: 1, learning_medium: 1 },
                { created_time: -1 }
            );
            if (booking) {
                logger.info(`user recover link ${user.id}`);
                logger.info(`booking has link ${booking.id}`);
                await UserActions.update(user._id, {
                    trial_class_skype_url: booking.learning_medium.info
                } as User);
                countUserRecover = countUserRecover + 1;
            }
        }
        logger.info(`total user recover:  ${countUserRecover}`);
        logger.info(`end recoverUnitType <<<<<<<<<<<<<<<<<<<<`);
        const res_payload = {
            message: 'recover unit type success'
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async recoverTrialTestIeltsResult(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start recoverTrialTestIeltsResult >>>>>>>>>>>>>`);
        const results = await TrialTestIeltsResultActions.findAll({
            'test_result_grammar.test_start_time': { $exists: false }
        });
        for (const result of results) {
            logger.info(`test topic id: ${result.test_topic_id}`);
            const diff = {
                test_result_grammar: {
                    test_topic_id: result.test_topic_id,
                    test_result_id: result.test_result_id,
                    test_result_code: result.test_result_code,
                    test_topic_name: result.test_topic_name
                    // total_questions: result.test_result_grammar.total_questions,
                    // total_correct_answers:
                    //     result.test_result_grammar.total_correct_answers,
                    // percent_correct_answers:
                    //     result.test_result_grammar.percent_correct_answers,
                    // submission_time: result.test_result_grammar.submission_time,
                    // test_start_time: result.test_result_grammar.test_start_time
                }
            };

            await TrialTestIeltsResultActions.update(result._id, diff);
        }

        logger.info(`end recoverTrialTestIeltsResult <<<<<<<<<<<<<<<<<<<<`);
        const res_payload = {
            message: 'recover trial test ielts result success'
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async deleteAllCheckingCallLessonOne(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter: any = {
            call_type: CallType.CHECKING,
            lesson_index_in_course: 1,
            status: EnumRegularCare.NOT_DONE
        };
        logger.info(`start deleteAllCheckingCallLessonOne >>>>>>>>>>>>>`);
        const listRegularCare = await CSCallManagementActions.findAll(filter);
        if (listRegularCare && listRegularCare.length > 0) {
            logger.info(
                `deleteAllCheckingCallLessonOne count:  ${listRegularCare.length}`
            );
        }
        await CSCallManagementModel.deleteMany(filter);
        logger.info(`end deleteAllCheckingCallLessonOne <<<<<<<<<<<<<<<<<<<<`);
        const res_payload = {
            message: 'recover deleteAllCheckingCallLessonOne success'
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async quizSessionBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const quizSessionId = parseInt(req.body.quiz_session_id as string);
        logger.info(
            `start recover quizSessionBooking quiz session id: ${quizSessionId} >>>>>>>>>>>>>`
        );
        const filter: any = {
            'homework.sessions.0.id': quizSessionId
        };
        const checkBooking = await BookingActions.findOne(filter, {
            _id: 1,
            id: 1,
            homework: 1
        });
        let res_payload = {
            message: 'no recover quizSessionBooking'
        };
        if (
            checkBooking &&
            checkBooking.homework &&
            checkBooking.homework?.sessions['0']?.user_score > 0
        ) {
            logger.info(`has recover booking_id: ${checkBooking.id}`);
            const newScoreHomework = Number(
                (checkBooking.homework?.sessions['0']?.user_score / 2).toFixed(
                    2
                )
            );
            let homeworkData = checkBooking.homework;
            if (homeworkData.sessions[0] && newScoreHomework > 0) {
                homeworkData.sessions[0].user_score = newScoreHomework;
            }
            await BookingActions.update(checkBooking._id, {
                homework: homeworkData
            } as Booking);
            res_payload = {
                message:
                    'recover quizSessionBooking success with booking_id: ' +
                    checkBooking.id
            };
        }
        logger.info(`end recover quizSessionBooking <<<<<<<<<<<<<<<<<<<<`);
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async statusTestReports(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start recover statusTestReports >>>>>>>>>>>>>`);
        const allCSCallManagement = await CSCallManagementActions.findAll({
            call_type: CallType.TEST_REPORTS,
            status: 0
        });
        logger.info(`count statusTestReports : ${allCSCallManagement.length}`);
        await Promise.all(
            allCSCallManagement.map(async (record: CSCallManagement) => {
                await CSCallManagementActions.update(record._id, {
                    status: EnumRegularCare.WAITING_NEXT_BOOKING
                });
            })
        );
        const res_payload = {
            message: 'recover statusTestReports success '
        };

        logger.info(`end recover statusTestReports <<<<<<<<<<<<<<<<<<<<`);
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateIdStudentLeaveRequest(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start recover updateIdStudentLeaveRequest >>>>>>>>>>>>>`);
        let total = await StudentLeaveRequestActions.count({});
        logger.info(`total: ` + total);
        let pageNumber = 0;
        let indexId = 1;
        do {
            pageNumber = pageNumber + 1;
            const filter: any = {
                page_number: pageNumber,
                page_size: 10
            };
            logger.info(`page number: ` + pageNumber);
            const leaveRequests =
                await StudentLeaveRequestActions.findAllAndPaginated(
                    filter,
                    { _id: 1 },
                    { created_time: 1 }
                );
            if (leaveRequests?.length > 0) {
                for await (const item of leaveRequests) {
                    logger.info(`update id for request obj_id: ` + item?._id);
                    logger.info(`id for request: ` + indexId);
                    await StudentLeaveRequestActions.update(item?._id, {
                        id: indexId
                    });
                    indexId++;
                }
            }
            logger.info(`while total: ` + pageNumber * 10);
        } while (pageNumber * 10 < total);
        await CounterActions.increaseId('student_leave_request_id');
        const res_payload = {
            message: 'recover updateIdStudentLeaveRequest success '
        };

        logger.info(
            `end recover updateIdStudentLeaveRequest <<<<<<<<<<<<<<<<<<<<`
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async decentralizationRoleDeputyManager(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(
            `start recover decentralizationRoleDeputyManager >>>>>>>>>>>>>`
        );
        const allDepartment = await DepartmentActions.findAll();
        logger.info(`count department recover : ${allDepartment.length}`);
        await Promise.all(
            allDepartment.map(async (record: Department) => {
                logger.info(`department id: ${record.id}`);
                await DepartmentActions.updatePermissionOfDepartment(
                    record._id,
                    EnumRole.Deputy_manager,
                    record?.permissionOfMember?.manager
                );
            })
        );
        const res_payload = {
            message: 'recover decentralizationRoleDeputyManager success '
        };

        logger.info(
            `end recover decentralizationRoleDeputyManager <<<<<<<<<<<<<<<<<<<<`
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async addDefaultPriorityPeriodicReport(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(
            `start recover addDefaultPriorityPeriodicReport >>>>>>>>>>>>>`
        );
        const total = await CSCallManagementActions.count({
            call_type: CallType.PERIODIC_REPORTS
        });
        logger.info(`total: ` + total);
        let pageNumber = 0;
        let indexId = 1;
        do {
            pageNumber = pageNumber + 1;
            const filter: any = {
                page_number: pageNumber,
                page_size: 10,
                call_type: CallType.PERIODIC_REPORTS
            };
            logger.info(`page number: ` + pageNumber);
            const periodicReports =
                await CSCallManagementActions.findAllAndPaginated(
                    filter,
                    { _id: 1 },
                    { created_time: 1 }
                );
            if (periodicReports?.length > 0) {
                for await (const item of periodicReports) {
                    logger.info(`update id for request obj_id: ` + item?._id);
                    logger.info(`id for request: ` + indexId);
                    await CSCallManagementActions.update(item?._id, {
                        priority: EnumPriority.NORMAL
                    });
                    indexId++;
                }
            }
            logger.info(`while total: ` + pageNumber * 10);
        } while (pageNumber * 10 < total);
        const res_payload = {
            message: 'recover addDefaultPriorityPeriodicReport success '
        };

        logger.info(
            `end recover addDefaultPriorityPeriodicReport <<<<<<<<<<<<<<<<<<<<`
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateTypePeriodicReport(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start recover updateTypePeriodicReport >>>>>>>>>>>>>`);
        const total = await CSCallManagementActions.count({
            call_type: CallType.PERIODIC_REPORTS
        });
        logger.info(`total: ` + total);
        let pageNumber = 0;
        let indexId = 1;
        do {
            pageNumber = pageNumber + 1;
            const filter: any = {
                page_number: pageNumber,
                page_size: 10,
                call_type: CallType.PERIODIC_REPORTS
            };
            logger.info(`page number: ` + pageNumber);
            const periodicReports =
                await CSCallManagementActions.findAllAndPaginated(
                    filter,
                    { _id: 1, lesson_index_in_course: 1 },
                    { created_time: 1 }
                );
            if (periodicReports?.length > 0) {
                for await (const item of periodicReports) {
                    logger.info(`update id for request obj_id: ` + item?._id);
                    logger.info(`id for request: ` + indexId);
                    let typePeriodic = EnumPeriodicType.PERIODIC;
                    switch (item?.lesson_index_in_course) {
                        case 95:
                            typePeriodic = EnumPeriodicType.END_TERM;
                            break;
                        case 45:
                            typePeriodic = EnumPeriodicType.NONE;
                            break;
                        default:
                            typePeriodic = EnumPeriodicType.PERIODIC;
                            break;
                    }
                    await CSCallManagementActions.update(item?._id, {
                        periodic_type: typePeriodic
                    });
                    indexId++;
                }
            }
            logger.info(`while total: ` + pageNumber * 10);
        } while (pageNumber * 10 < total);
        const res_payload = {
            message: 'recover updateTypePeriodicReport success '
        };

        logger.info(
            `end recover updateTypePeriodicReport <<<<<<<<<<<<<<<<<<<<`
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateVerifyEmailAllStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`start updateVerifyEmailAllStudent >>>>>>>>>>>>>`);
        await UserModel.updateMany(
            {
                role: 1,
                is_verified_email: true
            },
            {
                $set: {
                    is_verified_email: true
                }
            },
            {
                upsert: false
            }
        ).exec();

        logger.info(`end updateVerifyEmailAllStudent <<<<<<<<<<<<<<<<<<<<`);
        const res_payload = {
            message: 'recover updateVerifyEmailAllStudent success'
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
