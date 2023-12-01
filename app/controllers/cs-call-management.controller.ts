import { ProtectedRequest } from 'app-request';
import DepartmentActions from '../actions/department';
import { Response } from 'express';
import { NotFoundResponse, SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import { DepartmentModel, EnumRole } from '../models/department';
import { LIST_PERMISSIONS } from '../const/permission';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import CSCallManagementActions from '../actions/cs-call-management';
import CSCallManagement, {
    CallType,
    CHECKING_CALL,
    CSCallManagementModel,
    EnumDetailGreeting,
    EnumRegularCare,
    NONE,
    STATUS,
    TestType,
    UPCOMING_TEST,
    TEST_REPORTS,
    REGULAR_TEST,
    PERIODIC_REPORTS,
    EnumPriority,
    OBSERVATION,
    EnumPeriodicType
} from '../models/cs-call-management';
import { DAY_TO_MS, HOUR_TO_MS } from '../const';
import AdminActions from '../actions/admin';
import { UnitModel } from '../models/unit';
import UnitActions from '../actions/unit';
import Booking from '../models/booking';
import JobQueueServices from '../services/job-queue';
import * as natsClient from '../services/nats/nats-client';
import {
    EmailTemplate,
    EMAIL_ADDRESS_EXCEPTION,
    ZaloOANotification
} from '../const/notification';
import TemplateActions from '../actions/template';
import BookingActions from '../actions/booking';
import { AdminModel } from '../models/admin';
import { EnumBookingStatus } from '../models/booking';
import OrderedPackageActions from '../actions/ordered-package';
import { EnumPackageOrderType } from '../const/package';
import { CODE_DEPARTMENT } from '../const/department';
import moment from 'moment';
import { EnumLAReportSource } from '../models/learning-assessment-reports';
import LearningAssessmentReportsActions from '../actions/learning-assessment-reports';
import CounterActions from '../actions/counter';
import CustomerSupportManagementActions from '../actions/customer-support/customer-support-student';
import ActionHistoryActions from '../actions/action-history';
import { EnumTypeAction } from '../models/action-history';
import { EnumParentType } from '../models/action-history';
import { constants } from 'buffer';

const logger = require('dy-logger');
const pickUpData = [
    '_id',
    'status',
    'student_user_id',
    'ordered_package_id',
    'deadline',
    'detail_checking',
    'lesson_index_in_course',
    'call_type',
    'input_level'
];

export default class CsCallManagementController {
    public static async getDataDashboardActiveForm(
        req: ProtectedRequest,
        res: any
    ) {
        const res_payload = {
            data: new Array<any>()
        };
        const department = await DepartmentActions.findOne({
            filter: { $or: [{ unsignedName: CODE_DEPARTMENT.CSKH }] }
        });
        if (!department) {
            return new NotFoundResponse('Department not found');
        }
        const res_agg =
            await CSCallManagementActions.getDataDashboardActiveForm(
                department._id
            );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg;
        }
        const res_no_one: any =
            await CSCallManagementActions.getDataDashboardNoOne();

        if (res_no_one && Array.isArray(res_no_one) && res_no_one.length > 0) {
            const dataNoOne = {
                _id: 'fakedatanoone',
                fullname: 'no_one',
                username: null,
                email: null,
                phoneNumber: null,
                student: res_no_one
            };
            res_payload.data.push(dataNoOne);
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAllCsCallPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const departments = await DepartmentActions.findAllPagination({
            paginationInfo: {
                page_number: Number(page_number || 0),
                page_size: Number(page_size || 0)
            }
        });
        return new SuccessResponse('success', departments).send(res, req);
    }

    // notify zalo, email to student
    public static async sendNotify(
        zaloOA_notification: string,
        email_notification: string,
        receiver_id: number,
        receiver_email: string,
        dataMail: any,
        dataZaloOA: any,
        is_verified_email?: any,
        is_enable_receive_mail?: boolean,
    ) {
        const receiverTemplate = await TemplateActions.findOne({
            code: email_notification
        });
        logger.info(`receiver_email: ${receiver_email}`);
        logger.info(`receiver_id: ${receiver_id}`);
        if (receiverTemplate) {
            if(is_verified_email === true && is_enable_receive_mail){
                logger.info('upcoming: start publish email');
                JobQueueServices.sendMailWithTemplate({
                    to: receiver_email,
                    subject: receiverTemplate.title,
                    body: receiverTemplate.content,
                    data: dataMail
                });
            }
            // Send to Email Exception
            Promise.all(
                EMAIL_ADDRESS_EXCEPTION.map(async (item) => {
                    JobQueueServices.sendMailWithTemplate({
                        to: item,
                        subject: receiverTemplate.title,
                        body: receiverTemplate.content,
                        data: dataMail
                    });
                })
            );
            logger.info('upcoming: done publish email');
        }
        logger.info('upcoming: start publish event zalo');
        await natsClient.publishEventZalo(
            receiver_id,
            zaloOA_notification,
            dataZaloOA
        );
        logger.info('upcoming: done publish event zalo');
    }

    public static async getAllGreetingCall(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            status,
            fromDate,
            toDate
        } = req.query;
        const res_agg = await CSCallManagementActions.getGreetingCallByFilter(
            req,
            {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                status,
                fromDate,
                toDate
            }
        );

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAllCheckingCall(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            lesson_index_in_course,
            status,
            fromDate,
            toDate
        } = req.query;
        const res_agg = await CSCallManagementActions.getCheckingCallByFilter(
            req,
            {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                lesson_index_in_course,
                status,
                fromDate,
                toDate
            }
        );

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createGreetingCall(
        student_user_id: number,
        ordered_package_id: number,
        end_date: number
    ) {
        const checkExitsGreetingCall = await CSCallManagementActions.findOne({
            student_user_id,
            ordered_package_id,
            call_type: 'greeting'
        });
        let data = null;
        logger.info(
            `create greeting call - id package : ${ordered_package_id}`
        );
        logger.info(
            `checkExitsGreetingCall: ${JSON.stringify(checkExitsGreetingCall)}`
        );
        if (
            !checkExitsGreetingCall ||
            !checkExitsGreetingCall?.student_user_id
        ) {
            logger.info(`create greeting call: yes`);
            const deadline = end_date + DAY_TO_MS;
            data = await CSCallManagementActions.create({
                student_user_id,
                ordered_package_id,
                deadline,
                call_type: CallType.GREETING,
                detail_greeting: {
                    confirm_package_class: {
                        status: EnumDetailGreeting.NOT_DONE
                    },
                    confirm_student_info: {
                        status: EnumDetailGreeting.NOT_DONE
                    },
                    confirm_schedule: {
                        status: EnumDetailGreeting.NOT_DONE
                    },
                    regulations_info: {
                        status: EnumDetailGreeting.NOT_DONE
                    },
                    intro_zalo_oa: {
                        status: EnumDetailGreeting.NOT_DONE
                    },
                    contact_channel: {
                        status: EnumDetailGreeting.NOT_DONE
                    }
                }
            } as CSCallManagement);
        }
        return data;
    }

    public static async updateGreetingCall(req: ProtectedRequest, res: any) {
        const { _id, detail_greeting, status, note } = req.body;
        let arrNote = new Array<any>();
        const data = await CSCallManagementActions.findOne({
            _id: _id
        });

        let dataDiff = {};
        if (!status) {
            if (note) {
                if (data && data?.note_history && req.user) {
                    arrNote = data?.note_history;
                    arrNote.push({
                        note,
                        staff_id: req.user.id,
                        created_time: new Date()
                    });
                }
            }
            if (arrNote && arrNote.length > 0) {
                dataDiff = {
                    detail_greeting: detail_greeting,
                    note_history: arrNote
                };
            } else {
                dataDiff = {
                    detail_greeting: detail_greeting
                };
            }
        } else {
            dataDiff = {
                status: parseInt(status as string)
            };
        }
        const res_gc = await CSCallManagementActions.update(_id, dataDiff);
        return new SuccessResponse(req.t('common.success'), res_gc).send(
            res,
            req
        );
    }

    // up coming

    public static async getAllUpcomingTest(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            status,
            lesson,
            fromDate,
            toDate
        } = req.query;
        const res_agg = await CSCallManagementActions.getUpcomingCallByFilter(
            req,
            {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                status,
                lesson,
                fromDate,
                toDate
            }
        );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateUpcomingTest(req: ProtectedRequest, res: any) {
        const { _id, status, note } = req.body;
        let arrNote = new Array<any>();
        const data = await CSCallManagementActions.findOne({ _id: _id });

        let dataDiff = {};
        if (!status) {
            if (note) {
                if (data && data?.note_history && req.user) {
                    arrNote = data?.note_history;
                    arrNote.push({
                        note,
                        staff_id: req.user.id,
                        created_time: new Date()
                    });
                }
            }
            dataDiff = {
                note_history: arrNote
            };
        } else {
            dataDiff = {
                status: parseInt(status as string)
            };
        }
        const res_gc = await CSCallManagementActions.update(_id, dataDiff);
        return new SuccessResponse(req.t('common.success'), res_gc).send(
            res,
            req
        );
    }

    public static async updateCheckingCall(req: ProtectedRequest, res: any) {
        const { _id, detail_checking, status, note } = req.body;
        let arrNote = new Array<any>();
        const dataCheckingCall = await CSCallManagementActions.findOne({
            _id: _id
        });

        let dataDiff = {};
        if (!status) {
            arrNote = dataCheckingCall?.note_history;
            if (note) {
                if (
                    dataCheckingCall &&
                    dataCheckingCall?.note_history &&
                    req.user
                ) {
                    arrNote.push({
                        note,
                        staff_id: req.user.id,
                        created_time: new Date()
                    });
                }
            }
            dataDiff = {
                detail_checking: detail_checking,
                note_history: arrNote
            };
        } else {
            dataDiff = {
                status: parseInt(status as string)
            };
        }
        const res_gc = await CSCallManagementActions.update(_id, dataDiff);
        return new SuccessResponse(req.t('common.success'), res_gc).send(
            res,
            req
        );
    }

    public static async getListStaffContactHistory(
        req: ProtectedRequest,
        res: any
    ) {
        const { arrStaff } = req.query;
        const query = { id: { $in: arrStaff } };
        const res_payload = await AdminActions.findAll(
            {
                ...query
            },
            { permissions: 0 }
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createRegularCare(diff: CSCallManagement) {
        const dataNew = await CSCallManagementActions.create(diff);
        return dataNew;
    }

    public static async insertCsCallManagement(
        lesson: Booking,
        lesson_change?: Booking,
        new_status?: any
    ) {
        const studentId = lesson_change?.student?.id ?? lesson.student_id;
        const unitId = lesson_change?.unit?.id ?? lesson.unit.id;
        const courseId = lesson_change?.course_id ?? lesson.course_id;
        const orderPackageId =
            lesson_change?.ordered_package_id ?? lesson.ordered_package_id;
        const unit = await UnitActions.findOne({
            id: Number(unitId)
        });
        const endTime = lesson_change?.calendar?.end_time
            ? lesson_change.calendar?.end_time
            : lesson.calendar.end_time;
        const deadline = endTime + DAY_TO_MS;

        logger.info(`courseId: ${courseId}`);
        logger.info(`orderPackageId: ${orderPackageId}`);
        logger.info(`studentId: ${studentId}`);

        if (
            new_status === EnumBookingStatus.COMPLETED ||
            new_status === EnumBookingStatus.STUDENT_ABSENT
        ) {
            let countLessonsOfPackageInBooking = await BookingActions.count({
                ordered_package_id: orderPackageId,
                student_id: studentId,
                status: [
                    EnumBookingStatus.COMPLETED,
                    EnumBookingStatus.STUDENT_ABSENT
                ]
            });
            countLessonsOfPackageInBooking = countLessonsOfPackageInBooking + 1;
            logger.info(
                `countLessonsOfPackageInBooking: ${countLessonsOfPackageInBooking}`
            );

            //  insert checking
            if (
                CHECKING_CALL.LIST_LESSONS_STUDENT_COMPLETES.includes(
                    countLessonsOfPackageInBooking
                )
            ) {
                logger.info(`check insert checking call`);
                const checkExitsCheckingCall: any =
                    CSCallManagementActions.findOne({
                        call_type: CallType.CHECKING,
                        student_user_id: studentId,
                        ordered_package_id: orderPackageId,
                        lesson_index_in_course: countLessonsOfPackageInBooking
                    });
                logger.info(
                    `data checking call: ` +
                        JSON.stringify(checkExitsCheckingCall)
                );
                if (
                    !checkExitsCheckingCall ||
                    !checkExitsCheckingCall?.student_user_id
                ) {
                    const checkingCallInfo = {
                        student_user_id: studentId,
                        ordered_package_id: orderPackageId,
                        status: EnumRegularCare.NOT_DONE,
                        deadline: deadline,
                        booking_id: lesson_change?.id ?? lesson.id,
                        detail_checking: {
                            teacher_review: {
                                status: STATUS.NONE,
                                reason: NONE
                            },
                            curriculum_review: {
                                status: STATUS.NONE
                            },
                            overall_assessment_of_the_lesson: {
                                status: STATUS.NONE,
                                reason: NONE
                            },
                            information_about_the_system_of_self_study_materials:
                                {
                                    status: STATUS.NONE,
                                    reason: NONE
                                }
                        },
                        lesson_index_in_course: countLessonsOfPackageInBooking,
                        call_type: CallType.CHECKING
                    };

                    await this.createRegularCare(
                        checkingCallInfo as CSCallManagement
                    );
                }
            }

            //  insert observation
            if (
                OBSERVATION.LIST_LESSONS_CAN_OBSERVE.includes(
                    countLessonsOfPackageInBooking
                )
            ) {
                logger.info(`check insert observation`);
                const checkExitsObservation: any =
                    CSCallManagementActions.findOne({
                        call_type: CallType.OBSERVATION,
                        student_user_id: studentId,
                        ordered_package_id: orderPackageId,
                        lesson_index_in_course: countLessonsOfPackageInBooking
                    });
                logger.info(
                    `check data observation: ` +
                        JSON.stringify(checkExitsObservation)
                );
                if (
                    !checkExitsObservation ||
                    !checkExitsObservation?.student_user_id
                ) {
                    const observationInfo = {
                        student_user_id: studentId,
                        ordered_package_id: orderPackageId,
                        status: EnumRegularCare.NOT_DONE,
                        deadline: deadline,
                        booking_id: lesson_change?.id ?? lesson.id,
                        detail_data: {
                            classroom_teacher: {
                                content: NONE
                            },
                            camera: {
                                content: NONE
                            },
                            on_time: {
                                content: NONE
                            },
                            attitude_and_cooperation_in_the_classroom: {
                                content: NONE
                            },
                            progress_according_to_reviews_of_cs: {
                                content: NONE
                            }
                        },
                        lesson_index_in_course: countLessonsOfPackageInBooking,
                        call_type: CallType.OBSERVATION
                    };

                    await this.createRegularCare(
                        observationInfo as CSCallManagement
                    );
                }
            }

            // periodic reports
            const numberClass = lesson_change?.ordered_package
                ?.original_number_class
                ? lesson_change.ordered_package?.original_number_class
                : lesson.ordered_package?.original_number_class;
            logger.info(
                `check insert periodic reports - number class: ` + numberClass
            );
            if (numberClass >= 25) {
                let countLessonsCompletedInPackage = await BookingActions.count(
                    {
                        ordered_package_id: orderPackageId,
                        student_id: studentId,
                        status: EnumBookingStatus.COMPLETED
                    }
                );
                let countLessonsStudentAbsentInPackage =
                    await BookingActions.count({
                        ordered_package_id: orderPackageId,
                        student_id: studentId,
                        status: EnumBookingStatus.STUDENT_ABSENT
                    });
                if (new_status === EnumBookingStatus.COMPLETED) {
                    countLessonsCompletedInPackage++;
                } else if (new_status === EnumBookingStatus.STUDENT_ABSENT) {
                    countLessonsStudentAbsentInPackage++;
                }
                logger.info(`count lesson: ` + countLessonsOfPackageInBooking);
                if (
                    PERIODIC_REPORTS.LIST_LESSONS_STUDENT_COMPLETES.includes(
                        countLessonsOfPackageInBooking
                    )
                ) {
                    // check ton tai bc dinh ki ở lesson nay chưa
                    const filterCheck: any = {
                        call_type: CallType.PERIODIC_REPORTS,
                        student_user_id: studentId,
                        ordered_package_id: lesson_change?.ordered_package_id
                            ? lesson_change.ordered_package_id
                            : lesson.ordered_package_id,
                        lesson_index_in_course: countLessonsOfPackageInBooking
                    };
                    const checkExitsPeriodicReports: any =
                        CSCallManagementActions.findOne(filterCheck);
                    logger.info(
                        `data periodic reports: ` +
                            JSON.stringify(checkExitsPeriodicReports)
                    );
                    if (
                        !checkExitsPeriodicReports ||
                        !checkExitsPeriodicReports?.student_user_id
                    ) {
                        let deadlinePeriodic =
                            moment().valueOf() + 3 * DAY_TO_MS;
                        let periodicType = EnumPeriodicType.PERIODIC;
                        if (numberClass < 50) {
                            if (countLessonsOfPackageInBooking == 20) {
                                deadlinePeriodic =
                                    moment().valueOf() + 5 * DAY_TO_MS;
                                periodicType = EnumPeriodicType.END_TERM;
                            }
                        } else if (numberClass === 50) {
                            if (countLessonsOfPackageInBooking == 40) {
                                deadlinePeriodic =
                                    moment().valueOf() + 5 * DAY_TO_MS;
                                periodicType = EnumPeriodicType.END_TERM;
                            }
                        } else {
                            if (countLessonsOfPackageInBooking == 90) {
                                deadlinePeriodic =
                                    moment().valueOf() + 5 * DAY_TO_MS;
                                periodicType = EnumPeriodicType.END_TERM;
                            }
                        }
                        const CSinfo: any =
                            await CustomerSupportManagementActions.findOne({
                                user_id: Number(studentId)
                            });
                        let inputLevel = 0;
                        if (CSinfo?.customer_care?.length > 0) {
                            CSinfo.customer_care.map(
                                (item: any) =>
                                    (inputLevel = item.input_level ?? 0)
                            );
                        }
                        logger.info(`has insert periodic reports`);
                        const periodicReportsInfo: any = {
                            student_user_id: studentId,
                            ordered_package_id:
                                lesson_change?.ordered_package_id
                                    ? lesson_change.ordered_package_id
                                    : lesson.ordered_package_id,
                            status: EnumRegularCare.NOT_DONE,
                            deadline: deadlinePeriodic,
                            booking_id: lesson_change?.id
                                ? lesson_change.id
                                : lesson.id,
                            detail_data: {
                                exchange_information_from_ht_report: {
                                    status: EnumRegularCare.NOT_DONE
                                }
                            },
                            lesson_index_in_course:
                                countLessonsOfPackageInBooking,
                            input_level: inputLevel,
                            call_type: CallType.PERIODIC_REPORTS,
                            priority: EnumPriority.NORMAL,
                            periodic_type: periodicType,
                            periodic_sync_data: false,
                            periodic_number_completed:
                                countLessonsCompletedInPackage,
                            periodic_number_absent:
                                countLessonsStudentAbsentInPackage
                        };
                        await this.createRegularCare(
                            periodicReportsInfo as CSCallManagement
                        );
                    } else {
                        logger.info(`periodic reports is exists`);
                    }
                }
            }
        }
        if (new_status === EnumBookingStatus.COMPLETED) {
            let unitDisplayOrder = -1;
            if (unit?.display_order || unit?.display_order == 0) {
                unitDisplayOrder = unit.display_order + 1;
            }
            logger.info(`display order: ${unitDisplayOrder}`);
            if (
                UPCOMING_TEST.LIST_LESSONS_STUDENT_COMPLETES.includes(
                    unitDisplayOrder
                )
            ) {
                const upcomingTestInfo: any = {
                    student_user_id: studentId,
                    ordered_package_id: lesson_change?.ordered_package_id
                        ? lesson_change.ordered_package_id
                        : lesson.ordered_package_id,
                    status: EnumRegularCare.NOT_DONE,
                    deadline: deadline,
                    booking_id: lesson_change?.id
                        ? lesson_change.id
                        : lesson.id,
                    detail_checking: {
                        teacher_review: {
                            status: STATUS.NONE,
                            reason: NONE
                        },
                        curriculum_review: {
                            status: STATUS.NONE
                        },
                        overall_assessment_of_the_lesson: {
                            status: STATUS.NONE,
                            reason: NONE
                        },
                        information_about_the_system_of_self_study_materials: {
                            status: STATUS.NONE,
                            reason: NONE
                        }
                    },
                    lesson_index_in_course: unitDisplayOrder,
                    call_type: CallType.UPCOMING_TEST
                };

                logger.info(`check insert upcoming test`);
                const unitHasMaxDisplayOrder = await UnitModel.findOne({
                    course_id: Number(courseId)
                }).sort({ display_order: -1 });
                let maxDisplayOrder = -1;
                if (
                    unitHasMaxDisplayOrder?.display_order ||
                    unitHasMaxDisplayOrder?.display_order == 0
                ) {
                    maxDisplayOrder = unitHasMaxDisplayOrder?.display_order + 1;
                }
                logger.info(`max display order: ${maxDisplayOrder}`);
                const currentIndexDisplayOrder =
                    UPCOMING_TEST.LIST_LESSONS_STUDENT_COMPLETES.indexOf(
                        unitDisplayOrder
                    );
                const nextIndexDisplayOrder = currentIndexDisplayOrder + 1;
                let testType = null;
                if (
                    nextIndexDisplayOrder >=
                        UPCOMING_TEST.LIST_LESSONS_STUDENT_COMPLETES.length ||
                    UPCOMING_TEST.LIST_LESSONS_STUDENT_COMPLETES[
                        nextIndexDisplayOrder
                    ] > maxDisplayOrder
                ) {
                    upcomingTestInfo.test_type = TestType.FINAL;
                    testType = 'cuối kì';
                } else {
                    upcomingTestInfo.test_type = TestType.MID;
                    testType = 'giữa kì';
                }

                const upcomingData = await this.createRegularCare(
                    upcomingTestInfo as CSCallManagement
                );

                // notify webapp, zalo, email to student
                if (upcomingData && unitDisplayOrder > 0) {
                    const dataNotiUpcoming: any = {
                        student_name:
                            lesson_change?.student?.full_name ??
                            lesson?.student?.full_name,
                        student_username:
                            lesson_change?.student?.username ??
                            lesson?.student?.username,
                        student_id:
                            lesson_change?.student?.id ?? lesson?.student?.id,
                        package_name:
                            lesson_change?.ordered_package?.package_name ??
                            lesson.ordered_package?.package_name,
                        number_class_completed: unitDisplayOrder,
                        test_type: testType,
                        test_number:
                            unitDisplayOrder == 12 ? 15 : unitDisplayOrder + 4
                    };

                    await this.sendNotify(
                        ZaloOANotification.REMINE_UPCOMING_TEST,
                        EmailTemplate.REMINE_UPCOMING_TEST,
                        lesson_change?.student?.id ?? lesson?.student?.id,
                        lesson_change?.student?.email ?? lesson?.student?.email,
                        dataNotiUpcoming,
                        dataNotiUpcoming,
                        lesson_change?.student?.is_verified_email,
                        lesson_change?.student?.is_enable_receive_mail,
                    );
                }
            }

            if (
                TEST_REPORTS.LIST_LESSONS_STUDENT_COMPLETES.includes(
                    unitDisplayOrder
                )
            ) {
                const testReportsInfo: any = {
                    student_user_id: studentId,
                    ordered_package_id: lesson_change?.ordered_package_id
                        ? lesson_change.ordered_package_id
                        : lesson.ordered_package_id,
                    status: EnumRegularCare.WAITING_NEXT_BOOKING,
                    deadline: null,
                    booking_id: lesson_change?.id
                        ? lesson_change.id
                        : lesson.id,
                    detail_checking: {
                        exchange_information_from_ht_report: {
                            status: EnumRegularCare.NOT_DONE
                        },
                        feedback_from_parents_when_receiving_results: {
                            content: NONE
                        },
                        other_exchange_wishes_of_hv: {
                            content: NONE
                        }
                    },
                    lesson_index_in_course: unitDisplayOrder,
                    call_type: CallType.TEST_REPORTS
                };

                logger.info(`check insert test reports`);
                const unitHasMaxDisplayOrder = await UnitModel.findOne({
                    course_id: Number(courseId)
                }).sort({ display_order: -1 });
                let maxDisplayOrder = -1;
                if (
                    unitHasMaxDisplayOrder?.display_order ||
                    unitHasMaxDisplayOrder?.display_order == 0
                ) {
                    maxDisplayOrder = unitHasMaxDisplayOrder?.display_order + 1;
                }
                logger.info(`max display order: ${maxDisplayOrder}`);
                const currentIndexDisplayOrder =
                    TEST_REPORTS.LIST_LESSONS_STUDENT_COMPLETES.indexOf(
                        unitDisplayOrder
                    );
                const nextIndexDisplayOrder = currentIndexDisplayOrder + 1;
                if (
                    nextIndexDisplayOrder >=
                        TEST_REPORTS.LIST_LESSONS_STUDENT_COMPLETES.length ||
                    TEST_REPORTS.LIST_LESSONS_STUDENT_COMPLETES[
                        nextIndexDisplayOrder
                    ] > maxDisplayOrder
                ) {
                    testReportsInfo.test_type = TestType.FINAL;
                } else {
                    testReportsInfo.test_type = TestType.MID;
                }

                await this.createRegularCare(
                    testReportsInfo as CSCallManagement
                );
            }
        }
    }

    public static async getAllTestReports(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            lesson_index_in_course,
            status,
            fromDate,
            toDate
        } = req.query;
        const res_agg = await CSCallManagementActions.getTestReportsByFilter(
            req,
            {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                lesson_index_in_course,
                status,
                fromDate,
                toDate
            }
        );

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateTestReports(req: ProtectedRequest, res: any) {
        const { _id, detail_test_reports, status, note } = req.body;
        let arrNote = new Array<any>();
        const dataTestReports = await CSCallManagementActions.findOne({
            _id: _id
        });

        let dataDiff = {};
        if (!status) {
            arrNote = dataTestReports?.note_history;
            if (note) {
                if (
                    dataTestReports &&
                    dataTestReports?.note_history &&
                    req.user
                ) {
                    arrNote.push({
                        note,
                        staff_id: req.user.id,
                        created_time: new Date()
                    });
                }
            }
            dataDiff = {
                detail_test_reports: detail_test_reports,
                note_history: arrNote
            };
        } else {
            dataDiff = {
                status: parseInt(status as string)
            };
        }
        const res_gc = await CSCallManagementActions.update(_id, dataDiff);
        return new SuccessResponse(req.t('common.success'), res_gc).send(
            res,
            req
        );
    }

    public static async getAllOrderPackageNeedGreetingCallForCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const condition_time_start = new Date().getTime() - 2 * HOUR_TO_MS;
        const condition_time_end = new Date().getTime();
        const filter: any = {
            activation_date: {
                $gte: condition_time_start,
                $lte: condition_time_end
            },
            type: { $ne: EnumPackageOrderType.TRIAL }
        };

        const temp: any = await OrderedPackageActions.findAllNeedGreetingCall(
            filter
        );
        const data = temp.length > 0 ? temp || [] : [];
        const res_payload = {
            list_order_packages: data
        };

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async createGreetingCallForCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_packages } = req.body;
        if (ordered_packages && ordered_packages.length > 0) {
            for (const item of ordered_packages) {
                if (item) {
                    logger.info(`id package: ${item.ordered_package_id}`);
                    CsCallManagementController.createGreetingCall(
                        item.user_id,
                        item.ordered_package_id,
                        item.activation_date
                    );
                }
            }
        }
        const res_payload = {};
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async changeStatusForTestReports(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info(`>>> changeStatusForTestReports`);
        const today = moment().startOf('day').valueOf();
        const tomorrow = moment().startOf('day').add(1, 'days').valueOf();
        logger.info(`>>> today: ${today}`);
        logger.info(`>>> tomorrow: ${tomorrow}`);

        const allCSCallManagement = await CSCallManagementActions.findAll({
            call_type: CallType.TEST_REPORTS,
            status: EnumRegularCare.WAITING_NEXT_BOOKING
        });

        await Promise.all(
            allCSCallManagement.map(async (record: CSCallManagement) => {
                const lessonIndexInCourse = record.lesson_index_in_course;
                logger.info(`>>> lessonIndexInCourse: ${lessonIndexInCourse}`);
                logger.info(`>>> record.booking_id: ${record.booking_id}`);

                const bookingById = await BookingActions.findOne({
                    id: record.booking_id
                });

                if (bookingById) {
                    logger.info(
                        `>>> bookingById.student_id: ${bookingById.student_id}`
                    );
                    logger.info(
                        `>>> bookingById.course_id: ${bookingById.course_id}`
                    );
                    const booking = await BookingActions.findOne(
                        {
                            student_id: bookingById.student_id,
                            course_id: bookingById.course_id,
                            status: EnumBookingStatus.CONFIRMED,
                            'calendar.start_time': {
                                $gte: today,
                                $lt: tomorrow
                            }
                        },
                        {},
                        { 'calendar.start_time': -1 }
                    );

                    if (booking) {
                        let maxDisplayOrder = booking.unit?.display_order;
                        logger.info(`>>> maxDisplayOrder: ${maxDisplayOrder}`);
                        if (
                            typeof maxDisplayOrder === 'number' &&
                            typeof lessonIndexInCourse === 'number'
                        ) {
                            maxDisplayOrder += 1;
                            if (maxDisplayOrder > lessonIndexInCourse) {
                                logger.info(
                                    `>>> CSCallManagementActions.update`
                                );
                                logger.info(
                                    `>>> booking.calendar?.end_time: ${booking.calendar?.end_time}`
                                );
                                await CSCallManagementActions.update(
                                    record._id,
                                    {
                                        status: EnumRegularCare.NOT_DONE,
                                        deadline: moment()
                                            .add(1, 'day')
                                            .startOf('day')
                                            .valueOf()
                                    }
                                );
                            }
                        }
                    }
                }
            })
        );
        logger.info(`changeStatusForTestReports <<<`);
        return new SuccessResponse('success', {}).send(res, req);
    }

    public static async getAllRegularTest(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            lesson_index_in_course
        } = req.query;

        const res_agg = await CSCallManagementActions.getRegularTestByFilter(
            req,
            {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                lesson_index_in_course
            }
        );

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;

            await Promise.all(
                res_payload.data.map(async (item: any) => {
                    const courseId = item.course_id;
                    let unitDisplayOrder = -1;
                    if (typeof item.unit?.display_order === 'number') {
                        unitDisplayOrder = item.unit.display_order + 1;
                    }
                    const currentIndexDisplayOrder =
                        REGULAR_TEST.LIST_LESSONS_STUDENT_COMPLETES.indexOf(
                            unitDisplayOrder
                        );
                    const nextIndexDisplayOrder = currentIndexDisplayOrder + 1;
                    const unitHasMaxDisplayOrder = await UnitModel.findOne({
                        course_id: Number(courseId)
                    }).sort({ display_order: -1 });
                    let maxDisplayOrder = -1;
                    if (
                        typeof unitHasMaxDisplayOrder?.display_order ===
                        'number'
                    ) {
                        maxDisplayOrder =
                            unitHasMaxDisplayOrder?.display_order + 1;
                    }
                    if (
                        nextIndexDisplayOrder >=
                            REGULAR_TEST.LIST_LESSONS_STUDENT_COMPLETES
                                .length ||
                        REGULAR_TEST.LIST_LESSONS_STUDENT_COMPLETES[
                            nextIndexDisplayOrder
                        ] > maxDisplayOrder
                    ) {
                        item.test_type = TestType.FINAL;
                    } else {
                        item.test_type = TestType.MID;
                    }
                })
            );
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAllPeriodicReports(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            lesson_index_in_course,
            status,
            priority,
            report_upload_status,
            fromDate,
            toDate,
            createTime,
            reporter_id,
            sort,
            periodic_type,
            sync_data
        } = req.query;
        const res_agg =
            await CSCallManagementActions.getPeriodicReportsByFilter(req, {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                lesson_index_in_course,
                status,
                priority,
                report_upload_status,
                fromDate,
                toDate,
                createTime,
                reporter_id,
                sort,
                periodic_type,
                sync_data
            });

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updatePeriodicReports(req: ProtectedRequest, res: any) {
        const {
            _id,
            detail_data,
            status,
            note,
            input_level,
            object_ids,
            type_action,
            reporter_choose,
            priority,
            periodic_type
        } = req.body;
        const dataDiff: any = {};
        let response: any = '';
        logger.info(`type_action: ${type_action}`);
        const dataHistory: any = {
            user_action: req?.user?.id || null,
            parent_type: EnumParentType.PERIODIC_REPORT
        };
        if (!type_action) {
            let arrNote = new Array<any>();
            const dataPeriodicReports = await CSCallManagementActions.findOne({
                _id: _id
            });
            if (!dataPeriodicReports) {
                throw new Error('Periodic report not found');
            }
            dataHistory.parent_obj_id = _id;

            if (note) {
                arrNote = dataPeriodicReports?.note_history;
                if (
                    dataPeriodicReports &&
                    dataPeriodicReports?.note_history &&
                    req.user
                ) {
                    arrNote.push({
                        note,
                        staff_id: req.user.id,
                        created_time: new Date()
                    });
                }
                dataDiff.note_history = arrNote;
            }
            if (detail_data) {
                dataDiff.detail_data = detail_data;
            }
            if (status) {
                dataDiff.status = parseInt(status as string);
                dataHistory.type = EnumTypeAction.PR_UPDATE_STATUS;
                dataHistory.data_old = dataPeriodicReports.status;
                dataHistory.data_new = status;
            }
            if (input_level || input_level == 0) {
                dataDiff.input_level = parseInt(input_level as string);
                dataHistory.type = EnumTypeAction.PR_UPDATE_LEVEL;
                dataHistory.data_old = dataPeriodicReports.input_level;
                dataHistory.data_new = input_level;
            }
            if (priority) {
                dataDiff.priority = parseInt(priority as string);
                dataHistory.type = EnumTypeAction.PR_UPDATE_PRIORITY;
                dataHistory.data_old = dataPeriodicReports.priority;
                dataHistory.data_new = priority;
            }
            if (periodic_type) {
                dataDiff.periodic_type = parseInt(periodic_type as string);
                dataHistory.type = EnumTypeAction.PR_UPDATE_TYPE_REPORT;
                dataHistory.data_old = dataPeriodicReports.periodic_type;
                dataHistory.data_new = periodic_type;
            }

            logger.info(`data update: ${JSON.stringify(dataDiff)}`);
            response = await CSCallManagementActions.update(_id, dataDiff);
            if (response && dataHistory.type) {
                await ActionHistoryActions.create(dataHistory);
            }
        } else if (object_ids) {
            let reporter = null;
            logger.info(`list object id update: ${JSON.stringify(object_ids)}`);
            const reportData = await CSCallManagementActions.findAll(
                {
                    _id: { $in: object_ids },
                    call_type: CallType.PERIODIC_REPORTS
                },
                { _id: 1, reporter_id: 1, periodic_sync_data: 1 }
            );
            logger.info(`reportData update: ${JSON.stringify(reportData)}`);
            if (type_action == 'status_sync_data') {
                if (reportData && reportData?.length > 0) {
                    for await (const item of reportData) {
                        logger.info(
                            `periodic_sync_data status: ${JSON.stringify(
                                item.periodic_sync_data
                            )}`
                        );
                        if (item.periodic_sync_data == false) {
                            dataHistory.parent_obj_id = item._id;
                            dataHistory.content = 'Sync data to google sheets';
                            dataHistory.type = EnumTypeAction.PR_SYNC_DATA;
                            await ActionHistoryActions.create(dataHistory);
                        }
                    }
                }

                response = await CSCallManagementModel.updateMany(
                    {
                        _id: { $in: object_ids },
                        call_type: CallType.PERIODIC_REPORTS
                    },
                    {
                        $set: {
                            periodic_sync_data: true
                        }
                    },
                    {
                        upsert: false
                    }
                ).exec();
            } else {
                if (type_action == 'assign_manager') {
                    const htDepartment = await DepartmentModel.findOne({
                        unsignedName: CODE_DEPARTMENT.HOC_THUAT
                    });
                    if (htDepartment) {
                        const academicManager = await AdminModel.findOne({
                            department: {
                                department: htDepartment._id,
                                isRole: EnumRole.Manager
                            }
                        });
                        reporter = academicManager?.id || null;
                    }
                } else if (type_action == 'assign_academic') {
                    reporter = reporter_choose || null;
                }
                if (!reporter) {
                    throw new Error('Reporter not found');
                }
                if (reportData && reportData?.length > 0) {
                    for await (const item of reportData) {
                        logger.info(
                            `reporter old: ${JSON.stringify(item.reporter_id)}`
                        );
                        logger.info(
                            `reporter new: ${JSON.stringify(reporter)}`
                        );
                        if (item.reporter_id !== reporter) {
                            dataHistory.parent_obj_id = item._id;
                            if (item.reporter_id) {
                                dataHistory.data_old = item.reporter_id;
                                dataHistory.type =
                                    EnumTypeAction.PR_CHANGE_REPORTER;
                            } else {
                                dataHistory.data_old = null;
                                dataHistory.type =
                                    EnumTypeAction.PR_ASSIGNED_ACADEMIC;
                            }
                            dataHistory.data_new = reporter;
                            await ActionHistoryActions.create(dataHistory);
                        }
                    }
                }

                response = await CSCallManagementModel.updateMany(
                    {
                        _id: { $in: object_ids },
                        call_type: CallType.PERIODIC_REPORTS
                    },
                    {
                        $set: {
                            reporter_id: reporter
                        }
                    },
                    {
                        upsert: false
                    }
                ).exec();
            }
        }
        return new SuccessResponse(req.t('common.success'), response).send(
            res,
            req
        );
    }

    public static async createPeriodicReportsForLearningAssessment(
        req: ProtectedRequest,
        res: any
    ) {
        const { _id, student_id, package_id, type_report, file } = req.body;
        const startTime = parseInt(req.body.from_date as string);
        const endTime = parseInt(req.body.to_date as string);
        let response: any = '';
        const dataPeriodicReports = await CSCallManagementActions.findOne({
            _id: _id
        });
        if (!dataPeriodicReports) {
            throw new Error('Periodic report not found');
        }
        const studentId = student_id ? parseInt(student_id as string) : 0;
        if (!studentId) {
            throw new BadRequestError('student id is not found');
        }
        const timeCreate = moment().valueOf();

        const dataPost: any = {
            student_id: studentId,
            type: Number(type_report),
            source: EnumLAReportSource.ADMIN,
            booking_ids: [],
            time_create: timeCreate
        };
        if (package_id) {
            dataPost.package_id = parseInt(package_id as string);
        }
        if (file) {
            dataPost.file_upload = file;
        }

        if (startTime && endTime) {
            dataPost.start_time=  startTime;
            dataPost.end_time=  endTime;
            const filter: any = {
                status: [
                    EnumBookingStatus.COMPLETED,
                    EnumBookingStatus.STUDENT_ABSENT
                ],
                student_id: studentId || 0,
                'calendar.start_time': {
                    $gte: startTime,
                    $lte: endTime
                }
            };
            const dataBookings: any = await BookingActions.findAll(filter);
            const arrBookingIds = [];
            for await (const booking of dataBookings) {
                arrBookingIds.push(booking.id);
            }
            dataPost.booking_ids = arrBookingIds;
        }

        const counter = await CounterActions.findOne();
        dataPost.id = counter.learning_assessment_reports_id;
        // data_info.id = 1;
        const dataLA = await LearningAssessmentReportsActions.create(dataPost);
        if (dataLA) {
            LogServices.setChangeData(
                req,
                EnumTypeChangeData.old,
                'CSCallManagementPeriodicReports',
                dataPeriodicReports,
                pickUpData
            );
            response = await CSCallManagementActions.update(_id, {
                status: EnumRegularCare.DONE,
                periodic_report_id: dataLA.id,
                periodic_report_time: timeCreate
            });
            if (response) {
                const dataHistory: any = {
                    parent_obj_id: _id,
                    user_action: req?.user?.id || null,
                    parent_type: EnumParentType.PERIODIC_REPORT,
                    content: 'Add report file',
                    type: EnumTypeAction.PR_ADD_REPORT
                };
                await ActionHistoryActions.create(dataHistory);
            }
            LogServices.setChangeData(
                req,
                EnumTypeChangeData.new,
                'CSCallManagementPeriodicReports',
                response,
                pickUpData
            );
        }
        return new SuccessResponse(req.t('common.success'), response).send(
            res,
            req
        );
    }

    public static async removeRegularCare(
        req: ProtectedRequest,
        res: Response
    ) {
        const { obj_id } = req.params;
        const dataRemove = await CSCallManagementActions.findOne({
            _id: obj_id
        });
        if (dataRemove) {
            await CSCallManagementActions.remove(dataRemove._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getAllObservation(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            student_user_id,
            staff_id,
            lesson_index_in_course,
            status,
            fromDate,
            toDate
        } = req.query;
        const res_agg = await CSCallManagementActions.getAllObservationByFilter(
            req,
            {
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                student_user_id,
                staff_id,
                lesson_index_in_course,
                status,
                fromDate,
                toDate
            }
        );

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateObservation(req: ProtectedRequest, res: any) {
        const { _id, detail_data, status, note } = req.body;
        let arrNote = new Array<any>();
        const dataCheck = await CSCallManagementActions.findOne({
            _id: _id
        });

        let dataDiff = {};
        if (!status) {
            arrNote = dataCheck?.note_history;
            if (note) {
                if (dataCheck && dataCheck?.note_history && req.user) {
                    arrNote.push({
                        note,
                        staff_id: req.user.id,
                        created_time: new Date()
                    });
                }
            }
            dataDiff = {
                detail_data: detail_data,
                note_history: arrNote
            };
        } else {
            dataDiff = {
                status: parseInt(status as string)
            };
        }
        const res_gc = await CSCallManagementActions.update(_id, dataDiff);
        return new SuccessResponse(req.t('common.success'), res_gc).send(
            res,
            req
        );
    }

    public static async getListActionHistory(req: ProtectedRequest, res: any) {
        const { obj_id, page_number, page_size, parent_type } = req.query;
        const filter = {
            parent_obj_id: obj_id as string,
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string),
            parent_type: parseInt(parent_type as string)
        };
        const actionHistory: any =
            await ActionHistoryActions.findAllAndPaginated(filter);
        const res_payload: any = {
            data: null,
            pagination: {
                total: 0
            }
        };
        if (actionHistory && actionHistory.length > 0) {
            res_payload.data = actionHistory[0].data;
            res_payload.pagination = actionHistory[0].pagination;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
