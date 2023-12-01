import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _, { StringIterator, escapeRegExp, isString } from 'lodash';
import moment from 'moment';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import BookingController from './booking.controller';
import CalendarController from './calendar.controller';
import OrderController from './order.controller';
import BookingActions from '../actions/booking';
import CalendarActions from '../actions/calendar';
import OrderedPackageActions from '../actions/ordered-package';
import RegularCalendarActions from '../actions/regular-calendar';
import StudentLevelActions from '../actions/student-level';
import TrialBookingActions from '../actions/trial-booking';
import UserActions from '../actions/user';
import Booking, {
    BookingModel,
    EnumBookingMediumType,
    EnumBookingStatus
} from '../models/booking';
import TrialBooking, { EnumTrialBookingStatus } from '../models/trial-booking';
import CrmApiServices from '../services/crm';
import PdfGeneratorServices from '../services/pdf-generator';
import { MINUTE_TO_MS } from '../const/date-time';
import { IOriginMemo } from '../const/memo';
import { EnumPackageOrderType } from '../const/package';
import { STUDENT_INCREASE_LEVEL_AFTER_LEARNING } from '../const/student';
import { getTimestampInWeek } from '../utils/datetime-utils';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';
import { OrderedPackageModel } from '../models/ordered-package';
import UnitActions from '../actions/unit';
import { LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN } from '../const';
import TeacherActions from '../actions/teacher';
import { RoleCode } from '../const/role';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import TrialTestController from './trial-test.controller';
import * as natsClient from '../services/nats/nats-client';
import { ZaloOANotification } from '../const/notification';
import { EnumUnitType } from '../models/unit';
import TrialTestIeltsResult, {
    EnumTestType
} from '../models/trial-test-ielts-result';
import TrialTestIeltsResultActions from '../actions/trial-test-ielts-result';
import TrialTestServices from '../services/trial-test';
import CounterActions from '../actions/counter';
import TrialTestIeltsResultController from './trial-test-ielts-result.controller';
import TrialTeacherActions from '../actions/trial-teacher';
import AdviceLetterActions from '../actions/advice-letter';

const logger = require('dy-logger');

const admin_note_crm = 'tc-crm';

const pickUpData = [
    '_id',
    'id',
    'booking_id',
    'booking',
    'status',
    'memo',
    'recommendation_type',
    'curriculum_id',
    'recommendation_letter_link'
];
export default class TrialBookingController {
    public static async handleTrialBookingCreation(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_package_id, teacher_id, start_time } = req.body;
        let { end_time } = req.body;
        if (!end_time) {
            end_time = start_time + 30 * MINUTE_TO_MS;
            req.body.end_time = end_time;
        }

        const teacher_user = await UserActions.findOne({
            id: teacher_id
        });
        if (!teacher_user) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }

        const ordered_package = await OrderedPackageActions.findOne({
            id: ordered_package_id,
            type: [EnumPackageOrderType.TRIAL],
            number_class: { $gt: 0 }
        });
        if (!ordered_package) {
            throw new BadRequestError(
                req.t('errors.ordered_package.not_found')
            );
        }

        // tìm tất cả booking của student tại time này
        const userBookings = await BookingActions.findAll(
            {
                student_id: ordered_package.user_id,
                'calendar.start_time': start_time
            },
            {
                created_time: -1
            }
        );
        // kiểm tra xem booking có thời gian gần nhất có trạng thái đạt điều kiện hay không
        if (
            userBookings.length > 0 &&
            ![
                EnumBookingStatus.CANCEL_BY_TEACHER,
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CHANGE_TIME
            ].includes(userBookings[0].status)
        ) {
            throw new BadRequestError(
                req.t('errors.booking.student_has_booked_at_time')
            );
        }

        /**
         * Check the start_time with teacher regular_times and calendar
         * If it's in teacher regular times and it's not booked, create a
         * calendar and book it.
         * If it's not in teacher regular times then it needs to be registered
         * by the teacher before in teacher open calendar
         */
        let calendar_id: number;
        const start_timestamp_in_week = getTimestampInWeek(start_time);
        if (
            teacher_user.regular_times &&
            teacher_user.regular_times.includes(start_timestamp_in_week)
        ) {
            // kiểm tra time có nằm trong lịch cố định đang active , ... hay không
            const checked_regular = await RegularCalendarActions.findOne({
                teacher_id,
                regular_start_time: start_timestamp_in_week,
                status: [
                    EnumRegularCalendarStatus.ACTIVE,
                    EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING
                ]
            });

            // tìm tất cả booking của teacher tại time này
            const teacherBookings = await BookingActions.findAll(
                {
                    teacher_id,
                    min_start_time: start_time,
                    max_end_time: end_time
                },
                {
                    created_time: -1
                }
            );

            // kiểm tra nếu nằm trong lịch cố định và booking của teacher tại time này có thời gian gần nhất
            // có trạng thái đạt điều kiện hay không thì trả về lỗi học sinh không thể dặt lịch
            if (
                checked_regular &&
                teacherBookings.length > 0 &&
                ![
                    EnumBookingStatus.CANCEL_BY_STUDENT,
                    EnumBookingStatus.CHANGE_TIME
                ].includes(teacherBookings[0].status)
            ) {
                throw new BadRequestError(
                    req.t('errors.booking.manual_book_on_regular')
                );
            }

            calendar_id = await CalendarController.createSchedule(
                req,
                teacher_id,
                {
                    accept_time: true
                }
            );
        } else {
            const calendar = await CalendarActions.findOne({
                teacher_id,
                start_time
            });
            if (!calendar) {
                throw new BadRequestError(req.t('errors.calendar.not_found'));
            }
            calendar_id = calendar.id;
        }

        /** Add more fields to request body to create booking */
        req.body.course_id = req.body.course;
        const student_id = ordered_package.user_id;
        req.body.calendar_id = calendar_id;
        const booking: any = await BookingController.createBooking(
            req,
            student_id,
            EnumBookingStatus.CONFIRMED,
            {
                accept_time: true
            }
        );

        const new_trial_booking = {
            booking_id: booking.id,
            status: EnumTrialBookingStatus.CREATED_FOR_LEARNING,
            booking,
            created_time: new Date(),
            updated_time: new Date()
        };
        await TrialBookingActions.create({
            ...new_trial_booking
        } as TrialBooking);

        if (req.body?.isCrm) {
            if (req.body?.medium === EnumBookingMediumType.SKYPE) {
                const student_create_booking_req = {
                    user: booking.student
                };

                booking.learning_medium.medium_type =
                    EnumBookingMediumType.SKYPE;
                // await BookingController.generateBookingJoinUrl(
                //     student_create_booking_req as ProtectedRequest,
                //     booking
                // );
                const medium_info = {
                    learning_medium: {
                        medium_type: EnumBookingMediumType.SKYPE,
                        info: student_create_booking_req.user
                            .trial_class_skype_url
                    }
                };
                await BookingActions.update(
                    booking._id,
                    medium_info as Booking
                );
            }

            if (booking.unit?.unit_type != EnumUnitType.IELTS_GRAMMAR) {
                await BookingController.updateTrialBookingTest(req, booking);
            }
            await ordered_package.update({ admin_note: admin_note_crm });
        }

        new_trial_booking.booking = _.pick(booking, [
            'id',
            'student_id',
            'teacher_id',
            'course_id',
            'ordered_package_id',
            'calendar_id',
            'unit_id',
            'test_topic_id',
            'calendar',
            'admin_note',
            'status',
            'student',
            'teacher',
            'course',
            'learning_medium',
            'ordered_package',
            'unit',
            'test_result_code',
            'created_time',
            'updated_time'
        ]);
        logger.info(
            `>>> new_trial_booking: ${JSON.stringify(new_trial_booking)}`
        );
        const newBooking = await BookingModel.findById(booking._id);
        if (newBooking) {
            new_trial_booking.booking.learning_medium =
                newBooking.learning_medium;
            if (newBooking.trial_test_url && newBooking.test_result_code) {
                new_trial_booking.booking.trial_test_url = `${newBooking.trial_test_url}?code=${newBooking.test_result_code}&type=test`;
            } else {
                new_trial_booking.booking.trial_test_url = null;
            }
        }

        return {
            new_trial_booking,
            req,
            res
        };
    }

    public static async createTrialBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const data = await TrialBookingController.handleTrialBookingCreation(
            req,
            res
        );

        return new SuccessResponse(
            req.t('common.success'),
            data.new_trial_booking
        ).send(res, req);
    }

    public static async handleTrialBookingCreationForCrm(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info('start handleTrialBookingCreationForCrm >>');
        const { username, unit_id, start_time } = req.body;
        const teacher_id = parseInt(req.body.teacher_id as string);

        // const trialCourseId = 1;
        const trialCourseId = req.body.course;

        // req.body.course = trialCourseId;
        req.user = {
            role: [RoleCode.SUPER_ADMIN],
            isAdmin: true
        };
        const student_user = await UserActions.findOne({
            username,
            is_active: true
        });
        if (!student_user) {
            throw new BadRequestError(req.t('errors.user.not_found'));
        }

        const teacher_user = await UserActions.findOne({
            id: teacher_id,
            is_active: true
        });
        if (!teacher_user) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }

        const teacherUser = await TeacherActions.findOne({
            user_id: teacher_id
        });
        if (
            !teacherUser ||
            ![LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN].includes(
                teacherUser.location_id
            )
        ) {
            throw new BadRequestError(
                req.t('errors.teacher.not_trial_teacher')
            );
        }

        if (start_time && !Number.isNaN(start_time)) {
            const teacher_set =
                await CalendarController.getAvailableTeacherListFromStartTime(
                    req,
                    parseInt(start_time as string)
                );
            const arrTeacherAvailable = Array.from(teacher_set);
            logger.info('teacher id: ' + teacher_id);
            logger.info(
                'arrTeacherAvailable: ' + JSON.stringify(arrTeacherAvailable)
            );
            if (!arrTeacherAvailable.includes(teacher_id)) {
                throw new BadRequestError(
                    'Không thể đặt lịch do lịch của giáo viên đã đóng'
                );
            }
            const checkTrialPool = await TrialTeacherActions.findOne({
                teacher_id
            });
            if (!checkTrialPool) {
                throw new BadRequestError(
                    'Giáo viên đã bị xóa khỏi Trial pool'
                );
            }
        }

        const unit = await UnitActions.findOne({
            id: Number(unit_id),
            course_id: trialCourseId,
            is_active: true
        });
        if (!unit) {
            throw new BadRequestError(req.t('errors.unit.not_found'));
        }

        // tìm tất cả booking của student tại time này
        const userBookings = await BookingActions.findAll(
            {
                student_id: student_user.id,
                'calendar.start_time': start_time
            },
            {
                created_time: -1
            }
        );
        // kiểm tra xem booking có thời gian gần nhất có trạng thái đạt điều kiện hay không
        if (
            userBookings.length > 0 &&
            ![
                EnumBookingStatus.CANCEL_BY_TEACHER,
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CHANGE_TIME
            ].includes(userBookings[0].status)
        ) {
            throw new BadRequestError(
                req.t('errors.booking.student_has_booked_at_time')
            );
        }

        // tìm tất cả booking của student tại time này
        const teacherBookings = await BookingActions.findAll(
            {
                teacher_id,
                'calendar.start_time': start_time
            },
            {
                created_time: -1
            }
        );
        // kiểm tra xem booking có thời gian gần nhất có trạng thái đạt điều kiện hay không
        if (
            teacherBookings.length > 0 &&
            ![
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CHANGE_TIME
            ].includes(teacherBookings[0].status)
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teacher_has_booked_at_time')
            );
        }

        const orderPackages = await OrderedPackageActions.findAll({
            type: EnumPackageOrderType.TRIAL,
            user_id: student_user.id,
            activation_date: { $lte: new Date().getTime() },
            is_expired: false,
            number_class: { $gt: 0 }
        });

        if (orderPackages.length === 0) {
            const orderPackagesByCrm = await OrderedPackageModel.find({
                user_id: student_user.id,
                admin_note: admin_note_crm
            }).sort({ created_time: -1 });

            if (orderPackagesByCrm.length > 0) {
                const bookings = await BookingActions.findAll(
                    {
                        ordered_package_id: orderPackagesByCrm[0].id
                    },
                    {
                        created_time: -1
                    }
                );

                if (
                    bookings.length > 0 &&
                    ![
                        EnumBookingStatus.CANCEL_BY_STUDENT,
                        EnumBookingStatus.CHANGE_TIME
                    ].includes(bookings[0].status)
                ) {
                    throw new BadRequestError(
                        req.t('errors.order.trial_only_one_order')
                    );
                }
            }

            const trialPackageId = 1;

            req.body.package_list = [
                {
                    amount: 1,
                    id: trialPackageId,
                    number_class: 1,
                    ordered_package_id: trialPackageId,
                    package_id: trialPackageId,
                    activation_date: new Date()
                }
            ];

            const admin_set_field = {
                status: 1,
                admin_note: admin_note_crm
            };
            const order = await OrderController.createOrder(
                req,
                student_user.id,
                admin_set_field
            );

            const ordered_package = await OrderedPackageActions.findOne({
                order_id: parseInt(order.id as string)
            });

            if (!ordered_package) {
                throw new BadRequestError(req.t('errors.order.no_package'));
            }

            req.body.ordered_package_id = ordered_package.id;
        } else {
            req.body.ordered_package_id = orderPackages[0].id;
        }

        req.body.isCrm = true;
        logger.info('end handleTrialBookingCreationForCrm <<');
        return {
            req,
            res
        };
    }

    public static async createTrialBookingForCrm(
        req: ProtectedRequest,
        res: Response
    ) {
        const data =
            await TrialBookingController.handleTrialBookingCreationForCrm(
                req,
                res
            );

        return await TrialBookingController.createTrialBooking(
            data.req,
            data.res
        );

        // return new SuccessResponse(req.t('common.success'), 'ok').send(res,req);
    }

    public static async editTrialBookingByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const booking_id = parseInt(req.params.booking_id as string);
        const memo: IOriginMemo = req.body;
        const trial_booking = await TrialBookingActions.findOne({
            booking_id
        });
        if (!trial_booking) {
            throw new BadRequestError(req.t('errors.trial_booking.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TrialBookingModel',
            trial_booking,
            pickUpData
        );
        if (trial_booking.recommendation_letter_link) {
            throw new BadRequestError(
                req.t('errors.trial_booking.memo_confirmed')
            );
        }
        const booking = trial_booking.booking;
        if (!booking) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        let data_update_memo = {};
        if (trial_booking.memo && trial_booking.memo?.created_time) {
            data_update_memo = {
                memo: {
                    ...memo,
                    created_time: trial_booking.memo?.created_time
                }
            };
        } else {
            data_update_memo = {
                memo: {
                    ...memo,
                    created_time: new Date()
                }
            };
        }

        const testResult = {
            ...booking.test_result
        };

        memo?.note.forEach(async (element) => {
            if (element?.keyword == 'listening') {
                testResult.listening = element?.point;
            } else if (element?.keyword == 'speaking') {
                testResult.speaking = element?.point;
                // neu unit la type IELTS thi luu diem speaking tu memo vào bảng result
                if (
                    booking?.unit?.unit_type == EnumUnitType.IELTS_GRAMMAR ||
                    booking?.unit?.unit_type == EnumUnitType.IELTS_4_SKILLS
                ) {
                    const TrialTestIeltsResult =
                        await TrialTestIeltsResultActions.findOne({
                            booking_id: booking_id
                        });
                    if (TrialTestIeltsResult) {
                        await TrialTestIeltsResultActions.update(
                            TrialTestIeltsResult._id,
                            {
                                test_result_speaking: {
                                    score: element?.point
                                }
                            }
                        );
                    }
                }
            }
        });

        const data_update_memo_booking = {
            ...data_update_memo,
            test_result: {
                ...testResult
            }
        };

        await BookingActions.update(
            trial_booking.booking._id,
            data_update_memo_booking as Booking
        );

        const newTrialBooking = await TrialBookingActions.update(
            trial_booking._id,
            data_update_memo as TrialBooking
        );

        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'TrialBookingModel',
            newTrialBooking,
            pickUpData
        );
        const res_payload = {
            ok: true
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * All of trial booking status change request have to go through here
     * to update trial booking status, no exception
     * @param trial_booking Trial Booking MongoDB object
     * @param new_status new status to update on the trial booking
     */
    public static async onTrialBookingStatusChange(
        trial_booking: TrialBooking,
        new_status: EnumTrialBookingStatus
    ) {
        const status_change = {
            status: new_status
        };
        await TrialBookingActions.update(
            trial_booking._id,
            status_change as TrialBooking
        );
        let record_link = trial_booking.booking.record_link;
        if (new_status == EnumTrialBookingStatus.SUCCESS && !record_link) {
            /** CRM needs record_link to change trial booking to success */
            record_link = 'youtube.com/khong-co-video-hoc-thu';
        }
    }

    public static async createMemoByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const booking_id = parseInt(req.params.booking_id as string);

        const trial_booking = await TrialBookingActions.findOne({
            booking_id
        });

        if (!trial_booking) {
            throw new BadRequestError(req.t('errors.trial_booking.not_found'));
        }
        if (trial_booking.recommendation_letter_link) {
            throw new BadRequestError(
                req.t('errors.trial_booking.memo_confirmed')
            );
        }

        const booking = trial_booking.booking;
        if (!booking || booking.teacher_id != req.user.id) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        if (
            ![EnumBookingStatus.TEACHING, EnumBookingStatus.COMPLETED].includes(
                booking.status
            )
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teaching_or_completed_required')
            );
        }

        const memo = req.body.memo;
        let data_update_memo_trial = {};
        let data_update_memo = {};
        const late_memo = BookingController.checkBookingMemoTime(
            trial_booking.booking,
            true
        );
        if (trial_booking.memo && trial_booking.memo?.created_time) {
            data_update_memo_trial = {
                memo: {
                    ...memo,
                    created_time: trial_booking.memo?.created_time
                }
            };
            data_update_memo = data_update_memo_trial;
        } else {
            data_update_memo_trial = {
                memo: {
                    ...memo,
                    created_time: new Date()
                }
            };
            data_update_memo = {
                memo: {
                    ...memo,
                    created_time: new Date()
                },
                late_memo
            };
        }
        await TrialBookingActions.update(
            trial_booking._id,
            data_update_memo_trial as TrialBooking
        );

        const testResult = {
            ...booking.test_result
        };

        memo?.note.forEach(async (element: any) => {
            if (element?.keyword == 'listening') {
                testResult.listening = element?.point;
            } else if (element?.keyword == 'speaking') {
                testResult.speaking = element?.point;
                if (
                    booking?.unit?.unit_type == EnumUnitType.IELTS_GRAMMAR ||
                    booking?.unit?.unit_type == EnumUnitType.IELTS_4_SKILLS
                ) {
                    const TrialTestIeltsResult =
                        await TrialTestIeltsResultActions.findOne({
                            booking_id: booking_id
                        });
                    if (TrialTestIeltsResult) {
                        await TrialTestIeltsResultActions.update(
                            TrialTestIeltsResult._id,
                            {
                                test_result_speaking: {
                                    score: element?.point
                                }
                            }
                        );
                    }
                }
            }
        });

        data_update_memo = {
            ...data_update_memo,
            test_result: {
                ...testResult
            }
        };
        await BookingActions.update(
            trial_booking.booking._id,
            data_update_memo as Booking
        );

        // bắn data tới API CRM để nhận được memo của buổi học trial
        await CrmApiServices.sendMemoTrialBooking(booking, memo);
        // notify zalo
        // if (booking && memo && !req.user.isAdmin) {
        //     const findData = (keyword: string, keyArr: string, key: string) => {
        //         try {
        //             return (
        //                 memo[keyArr].find((e: any) => e.keyword === keyword)[
        //                     key
        //                 ] || 'Chưa có đánh giá'
        //             );
        //         } catch (error) {
        //             console.log('findData', error);
        //         }
        //         return 'Chưa có đánh giá';
        //     };
        //     const dataPayload = {
        //         teacher_name: req.user.name,
        //         class_time: moment(booking.calendar.start_time).format(
        //             'HH:mm DD/MM/YYYY'
        //         ),
        //         listening_point: findData('listening', 'note', 'point'),
        //         speaking_point: findData('speaking', 'note', 'point'),
        //         vocabulary_point: findData('vocabulary', 'note', 'point'),
        //         grammar_point: findData('grammar', 'note', 'point'),
        //         strength_point: findData('strength', 'other', 'comment'),
        //         weakness_point: findData('weakness', 'other', 'comment'),
        //         comment: findData('another_comment', 'other', 'comment'),
        //         level_of_attention: findData('attention', 'other', 'comment'),
        //         level_of_comprehension: findData(
        //             'comprehension',
        //             'other',
        //             'comment'
        //         ),
        //         in_class_performance: findData(
        //             'performance',
        //             'other',
        //             'comment'
        //         ),
        //         student_name: booking.student.full_name,
        //         student_username: booking.student.username,
        //         student_id: booking.student.id
        //     };
        //     await natsClient.publishEventZalo(
        //         booking.student_id,
        //         ZaloOANotification.TEACHER_WRITE_MEMO,
        //         dataPayload
        //     );
        // }

        const res_payload = {
            ok: true,
            late_memo
        };

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateRecordBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const booking_id = parseInt(req.params.booking_id as string);

        const { record_link } = req.body;
        const booking = await BookingActions.findOne({
            id: booking_id
        });
        if (!booking || booking.teacher_id != req.user.id) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        if (
            ![EnumBookingStatus.TEACHING, EnumBookingStatus.COMPLETED].includes(
                booking.status
            )
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teaching_or_completed_required')
            );
        }
        await BookingActions.update(booking._id, {
            record_link: [record_link]
        } as Booking);

        const res_payload = {
            ok: true,
            record_link
        };

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTrialBookings(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search, best_memo, memo_status } =
            req.query;

        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            best_memo,
            $or: [] as any
        } as any;
        if (memo_status) {
            filter.memo_status = Number(memo_status);
        }
        if (isString(search)) {
            const searchRegexStr = escapeRegExp(search);
            filter.$or = [
                {
                    'booking.teacher.full_name': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    'booking.teacher.username': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    'booking.student.full_name': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    'booking.student.username': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                }
            ];
        }
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const res_agg = await TrialBookingActions.findAllAndPaginated(filter);
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTrialStudentList(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, status, search } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string
        };
        if (status) {
            // filter.is_active = (status === 'active');
        }
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const res_agg = await TrialBookingActions.getTrialStudents(filter);
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createAdviceLetter(req: ProtectedRequest, res: any) {
        const { id, student_id, file_name, file } = req.body;
        const booking = await UserActions.getUsersWithTrialBooking(student_id);
        const student = await UserActions.findOne({ id: student_id });
        const dataPost: any = {
            booking_id: booking[0]?.bookings?.id,
            student_id: student_id,
            file_name: file_name,
            file: file,
            student: student
        };
        const create = await AdviceLetterActions.create(dataPost);
        if (create) {
            return new SuccessResponse(req.t('common.success'), create).send(
                res,
                req
            );
        }
    }
}
