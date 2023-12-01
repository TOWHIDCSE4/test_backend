import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import moment from 'moment';
import config from 'config';
import _ from 'lodash';

import { SuccessResponse, ResponseStatus } from './../core/ApiResponse';
import { BadRequestError, InternalError } from '../core/ApiError';

import BookingActions from '../actions/booking';
import CalendarActions from '../actions/calendar';
import CounterActions from '../actions/counter';
import CourseActions from '../actions/course';
import OrderedPackageActions from '../actions/ordered-package';
import RegularCalendarActions from '../actions/regular-calendar';
import ScheduledMemoActions from '../actions/scheduled-memo';
import StudentReservationRequestActions from '../actions/student-reservation-request';
import UserActions from '../actions/user';
import UnitActions from '../actions/unit';
import TeacherActions from '../actions/teacher';
import TrialBookingActions from '../actions/trial-booking';
import AdminActions from '../actions/admin';
import TemplateActions from '../actions/template';
import OperationIssueActions from '../actions/operation-issue';

import CourseController from './course.controller';
import CalendarController from './calendar.controller';
import OrderedPackageController from './ordered-package.controller';
import ScheduledMemoController from './scheduled-memo.controller';
import TeacherController from '../controllers/teacher.controller';
import TrialBookingController from './trial-booking.controller';

import Booking, {
    BookingModel,
    EnumBookingMediumType,
    EnumBookingStatus
} from '../models/booking';
import { EnumScheduledMemoType, SegmentPoint } from '../models/scheduled-memo';
import { EnumStudentReservationRequestStatus } from '../models/student-reservation-request';
import Teacher, { TeacherModel } from '../models/teacher';
import TrialBooking, { EnumTrialBookingStatus } from '../models/trial-booking';
import User, { linkHMPType } from '../models/user';

import JobQueueServices from '../services/job-queue';
import * as natsClient from '../services/nats/nats-client';
import SkypeApiServices from '../services/skype';

import {
    each7DaysInRange,
    enumerateDaysBetweenDates,
    getTimestampInWeek
} from '../utils/datetime-utils';

import {
    BackEndNotification,
    PopUpEndBookingEvent,
    ZaloOANotification,
    ZNS_TEMPLATE
} from '../const/notification';
import { MAX_LIMIT, PIVOT_HOUR_FOR_AVG } from '../const';
import {
    MINUTE_TO_MS,
    HOUR_TO_MS,
    MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR,
    ALLOWED_TIME_TO_REPORT_ABSENCE,
    NORMAL_LATE_TIME_TO_REPORT_ABSENCE,
    CIRCLE_START_DATES,
    DAY_TO_MS,
    MAX_DAYS_QUERY_REPORT,
    WEEK_TO_MS
} from '../const/date-time';
import { DEFAULT_TRIAL_COURSE_ID } from '../const/default-id';
import {
    LESSON_STATUS,
    OverTime,
    TYPE,
    MIN_LEARNT_UNITS_RATE_TO_CREATE_COURSE_MEMO,
    LEARNT_UNITS_RATE_FOR_LATE_COURSE_MEMO,
    RECENT_COMPLETED_BOOKINGS_MINUTES,
    IELTS_TEACHER_FAKE_ID,
    OverTimeFinish
} from '../const/booking';
import { eachMonthOfInterval, endOfMonth } from 'date-fns';
import { EmailTemplate, EMAIL_ADDRESS_EXCEPTION } from '../const/notification';
import {
    IOriginMemo,
    MAX_BEST_MEMO_EACH_DAY,
    NORMAL_MEMO_LATE_HOUR,
    TRIAL_MEMO_LATE_HOUR
} from './../const/memo';
import { EnumPackageOrderType } from '../const/package';
import { RoleCode, roleString } from '../const/role';
import { getMeetAccessToken } from '../auth/auth-utils';
import axios from 'axios';
import https from 'https';
import { CODE_DEPARTMENT } from '../const/department';
import { DepartmentModel, EnumRole } from '../models/department';
import { AdminModel } from '../models/admin';
import { StudentModel } from '../models/student';
import StudentActions from '../actions/student';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import MergedPackageActions from '../actions/merged-package';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';
import TrialTeacherActions from '../actions/trial-teacher';
import CsCallManagementController from './cs-call-management.controller';
import TrialTestServices from '../services/trial-test';
import SkypeMeetingPoolActions from '../actions/skype-meeting-pool';
import { EnumStatus } from '../models/skype-meeting-pool';
import { EnumUnitType, UnitModel } from '../models/unit';
import TrialTestIeltsResultActions from '../actions/trial-test-ielts-result';
import { EnumTestType } from '../models/trial-test-ielts-result';
import PackageActions from '../actions/package';
import { EnumFrequencyType } from '../models/package';
import DepartmentActions from '../actions/department';
import TrialTestIeltsResultController from './trial-test-ielts-result.controller';
import CMSHamiaMeetPlusSDKController, {
    RoleHMPType,
    RoomRoleID
} from './cms-hmp-sdk.controller';
import CMSHamiaMeetPlusInfoActions from '../actions/cms-hamia-meet-plus-info';
import TeacherAbsentRequest, {
    EnumCreatorType,
    EnumTeacherAbsentRequestStatus
} from '../models/teacher-absent-request';
import TeacherAbsentRequestActions from '../actions/teacher-absent-request';
import CMSHamiaMeetPlusInfoController from './cms-hamia-meet-plus-info.controller';
import StudentLeaveRequestActions from '../actions/student-leave-request';
import { EnumStudentLeaveRequestStatus } from '../models/student-leave-request';

const logger = require('dy-logger');

const HAMIA_MEET_URL = config.get('services.hamia_meet.url');
const KEY = config.get('services.quiz_svc.key');
const TRIAL_TEST_API_URL: any = config.get('services.trial_test.url');
const HAMIA_MEET_PLUS_URL =
    process.env.HAMIA_MEET_PLUS_URI ||
    config.get('services.hamia_meet_plus.url');
const CMS_SERVER_NAME: any =
    process.env.CMS_SERVER_NAME ||
    config.get('services.cms_directus.server_name');

const pickUpData = [
    '_id',
    'id',
    'course_id',
    'teacher_id',
    'calendar_id',
    'unit_id',
    'student_id',
    'status',
    'reason',
    'student_note',
    'teacher_note',
    'admin_note',
    'cskh_note',
    'started_at',
    'finished_at',
    'reported_absence_at',
    'student_rating',
    'memo',
    'record_link',
    'best_memo',
    'is_regular_booking',
    'substitute_for_teacher_id',
    'admin_unit_lock'
];
export default class BookingController {
    /**
     * This is temporary for name search, check later to see if there's a
     * better way
     */
    public static async buildNameSearchQueryForBooking(
        search: string,
        search_field: any
    ) {
        const name_query: Array<any> = [];
        if (!search || search.length <= 0) {
            return name_query;
        }
        const user_id_list = new Array<number>();
        if (
            search_field.hasOwnProperty('student_id') ||
            search_field.hasOwnProperty('teacher_id')
        ) {
            const user_list = await UserActions.findAll({ name: search });
            for (const user of user_list) {
                user_id_list.push(user.id);
            }
        }
        if (search_field.hasOwnProperty('student_id')) {
            name_query.push({
                student_id: { $in: user_id_list }
            });
        }
        if (search_field.hasOwnProperty('teacher_id')) {
            name_query.push({
                teacher_id: { $in: user_id_list }
            });
        }
        if (search_field.hasOwnProperty('course_id')) {
            const course_list = await CourseActions.findAll({ search });
            const course_id_list = new Array<number>();
            for (const course of course_list) {
                course_id_list.push(course.id);
            }
            name_query.push({
                course_id: { $in: course_id_list }
            });
        }
        if (search_field.hasOwnProperty('ordered_package_id')) {
            const package_list = await OrderedPackageActions.findAll(
                { search },
                { id: 1 }
            );
            const package_id_list = new Array<number>();
            for (const pack of package_list) {
                package_id_list.push(pack.id);
            }
            name_query.push({
                ordered_package_id: { $in: package_id_list }
            });
        }
        return name_query;
    }

    public static async getAllBookingsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            status,
            student_id,
            teacher_id,
            course_id,
            ordered_package_id,
            start_time,
            search,
            sort,
            type,
            max_end_time,
            min_start_time,
            recorded,
            is_subclass,
            id,
            staff_id
        } = req.query;
        // if (parseInt(page_size as string) > MAX_LIMIT)
        //     throw new InternalError(req.t('errors.common.large_query'));
        let filter: any = {
            status: new Array<number>(),
            student_id: student_id ? parseInt(student_id as string) : 0,
            teacher_id: teacher_id ? parseInt(teacher_id as string) : 0,
            course_id: course_id ? parseInt(course_id as string) : 0,
            ordered_package_id: ordered_package_id
                ? parseInt(ordered_package_id as string)
                : 0,
            'calendar.start_time': start_time
                ? parseInt(start_time as string)
                : 0,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            $or: []
        };
        if (id) {
            filter.id = Number(id);
        }
        if (is_subclass == 'true') {
            filter.substitute_for_teacher_id = { $ne: null };
        } else if (is_subclass == 'false') {
            filter.substitute_for_teacher_id = { $eq: null };
        }
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                for (const element of status) {
                    const element_int = parseInt(element as string);
                    if (!isNaN(element_int)) {
                        filter.status.push(element_int);
                    }
                }
            } else {
                const status_int = parseInt(status as string);
                if (!isNaN(status_int)) {
                    filter.status.push(status_int);
                }
            }
        }
        if (min_start_time) {
            filter.min_start_time = parseInt(min_start_time as string);
        }
        if (max_end_time) {
            filter.max_end_time = parseInt(max_end_time as string);
        }
        if (recorded == 'true') {
            filter.record_link = { $regex: '.+' }; /** Exists and not empty */
        } else if (recorded == 'false') {
            filter.record_link = {
                $not: { $regex: '.+' }
            };
        }
        const date = new Date();
        const valid_date = date.setMonth(date.getMonth() - 6);

        if (
            parseInt(min_start_time as string) >
                parseInt(max_end_time as string) ||
            parseInt(start_time as string) < new Date(valid_date).getTime() ||
            parseInt(min_start_time as string) < new Date(valid_date).getTime()
        ) {
            const res_payload = {
                data: [],
                pagination: {
                    total: 0
                }
            };
            return new SuccessResponse('success', res_payload).send(res, req);
        }
        let name_query_list = [];
        let student_query_list = [];
        const studentQuery = [];
        if (staff_id) {
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
            student_query_list =
                await BookingController.buildNameSearchAndStaffSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    },
                    staff_id as string
                );

            for (const query of student_query_list) {
                studentQuery.push(query);
            }
        }
        if (search) {
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
        }
        console.log(name_query_list)
        const nameQuery = [];
        for (const query of name_query_list) {
            nameQuery.push(query);
        }
        const orderTrials = await OrderedPackageActions.findAll({
            type: [EnumPackageOrderType.TRIAL]
        });
        const package_ids = orderTrials.map((e) => e.id);
        const orQuery = [];

        if (Array.isArray(type)) {
            for (const e of type) {
                if (parseInt(e as string) === TYPE.TRIAL) {
                    orQuery.push({
                        is_regular_booking: false,
                        ordered_package_id: { $in: package_ids }
                    });
                } else if (parseInt(e as string) === TYPE.REGULAR) {
                    orQuery.push({
                        is_regular_booking: true,
                        ordered_package_id: { $nin: package_ids }
                    });
                } else if (parseInt(e as string) === TYPE.FLEXIBLE) {
                    orQuery.push({
                        is_regular_booking: false,
                        ordered_package_id: { $nin: package_ids }
                    });
                }
            }
            if (search || staff_id) {
                filter.$and = [];
            }
            if (search) filter.$and.push({ $or: orQuery }, { $or: nameQuery });
            if (!search && staff_id) filter.$and.push({ $or: orQuery });
            if (staff_id && studentQuery && studentQuery.length > 0)
                filter.$and.push({ $and: studentQuery });
            if (!search && !staff_id) filter.$or = orQuery;
        } else {
            switch (parseInt(type as string)) {
                case TYPE.TRIAL: {
                    filter = {
                        ...filter,
                        ...{
                            is_regular_booking: false,
                            ordered_package_id: { $in: package_ids }
                        }
                    };
                    break;
                }
                case TYPE.REGULAR: {
                    filter = {
                        ...filter,
                        ...{
                            is_regular_booking: true,
                            ordered_package_id: { $nin: package_ids }
                        }
                    };
                    break;
                }
                case TYPE.FLEXIBLE: {
                    filter = {
                        ...filter,
                        ...{
                            is_regular_booking: false,
                            ordered_package_id: { $nin: package_ids }
                        }
                    };
                    break;
                }
                default:
                    break;
            }
            filter.$or = nameQuery;
            if (staff_id && studentQuery && studentQuery.length > 0)
                filter.$and = studentQuery;
        }
        const sort_field: any = {};
        switch (sort) {
            case 'prev': {
                sort_field['calendar.start_time'] = -1;
                sort_field['created_time'] = -1;
                break;
            }
            case 'upcoming': {
                sort_field['calendar.end_time'] = 1;
                sort_field['created_time'] = -1;
                break;
            }
            case 'created_time_desc': {
                sort_field['created_time'] = -1;
                break;
            }
            default: {
                sort_field['calendar.start_time'] = 1;
                break;
            }
        }
        const bookings = await BookingActions.findAllAgg(
            filter,
            sort_field
        );
        const count = await BookingActions.count(filter);
        const res_payload = {
            data: bookings,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllCompleteBookingsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            student_id,
            course_id,
            ordered_package_id,
            memo_type,
            best_memo,
            search,
            range_search,
            is_subclass,
            memo_status
        } = req.query;
        if (parseInt(page_size as string) > MAX_LIMIT)
            throw new InternalError(req.t('errors.common.large_query'));
        let arr = [];
        // @ts-ignore
        arr = range_search;

        const filter: any = {
            status: [EnumBookingStatus.COMPLETED],
            student_id: student_id ? parseInt(student_id as string) : 0,
            course_id: course_id ? parseInt(course_id as string) : 0,
            ordered_package_id: ordered_package_id
                ? parseInt(ordered_package_id as string)
                : 0,
            page_size: parseInt(page_size as string),
            'calendar.start_time': {},
            page_number: parseInt(page_number as string),
            $or: []
        };
        if (is_subclass == 'true') {
            filter.substitute_for_teacher_id = { $ne: null };
        } else if (is_subclass == 'false') {
            filter.substitute_for_teacher_id = { $eq: null };
        }
        if (memo_status) {
            filter.memo_status = Number(memo_status);
        }
        if (range_search != null && arr?.length > 0) {
            filter['calendar.start_time'] = {
                $gte: parseInt(arr[0] as string),
                $lte: parseInt(arr[1] as string)
            };
        } else {
            filter['calendar.start_time'] = null;
        }
        if (best_memo) {
            if (parseInt(best_memo as string)) {
                filter.best_memo = true;
            } else {
                filter.best_memo = false;
            }
        }
        const name_query_list =
            await BookingController.buildNameSearchQueryForBooking(
                search as string,
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
        if (memo_type == 'NORMAL_MEMO') {
            const orderTrials = await OrderedPackageActions.findAll({
                type: [EnumPackageOrderType.TRIAL]
            });
            const package_ids = orderTrials.map((e) => e.id);
            filter.ordered_package_id = { $nin: package_ids };
        }
        const bookings = await BookingActions.findAllAndPaginated(filter, {
            'calendar.start_time': -1
        });

        const count = await BookingActions.count(filter);
        const res_payload = {
            data: bookings,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllBookingsByIds(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const booking_ids: any = req.query.booking_ids;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        const res_payload: any = {
            data: null
        };
        if (booking_ids) {
            const listBooking: any = [];
            await Promise.all(
                booking_ids.map(async (item: any) => {
                    listBooking.push(parseInt(item as string));
                })
            );
            filter.booking_ids = listBooking;
        }
        const bookings = await BookingActions.findAllNotPopulate(filter, {
            id: 1
        });
        if (bookings) {
            res_payload.data = bookings;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay danh sach cac buoi booking cua 1 hoc vien
     * Request type: GET
     * Parameters: - student_id  :       : ma id cua hoc vien
     *             - page_size   : query : so booking get duoc cho trang nay
     *             - page_number : query : so trang cho lan get nay
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad request
     */
    public static async getBookingsByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const {
            page_size,
            page_number,
            status,
            student_rated,
            sort,
            min_start_time,
            max_end_time,
            search,
            exclude_status,
            ordered_package_id
        } = req.query;
        const filter: any = {
            student_id: id,
            status: new Array<number>(),
            student_rating: null,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            $and: [{}]
        };
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                for (const element of status) {
                    const element_int = parseInt(element as string);
                    if (!isNaN(element_int)) {
                        filter.status.push(element_int);
                    }
                }
            } else {
                const status_int = parseInt(status as string);
                if (!isNaN(status_int)) {
                    filter.status.push(status_int);
                }
            }
        }
        if (min_start_time) {
            filter.min_start_time = parseInt(min_start_time as string);
        }
        if (max_end_time) {
            filter.max_end_time = parseInt(max_end_time as string);
        }
        if (student_rated == 'true') {
            filter.report = { $ne: null };
        } else if (student_rated == 'false') {
            filter.report = { $eq: null };
        }
        if (parseInt(page_size as string) > MAX_LIMIT)
            throw new InternalError(req.t('errors.common.large_query'));
        const name_query_list =
            await BookingController.buildNameSearchQueryForBooking(
                search as string,
                {
                    teacher_id: 1,
                    course_id: 1,
                    ordered_package_id: 1
                }
            );
        for (const query of name_query_list) {
            filter.$and.push(query);
        }
        if (exclude_status) {
            filter.$and.push({
                status: {
                    $nin: exclude_status
                }
            });
        }
        const filter_sort: any = {};
        switch (sort) {
            case 'student_rating_asc': {
                filter_sort['student_rating'] = 1;
                filter_sort['calendar.start_time'] = -1;
                break;
            }
            case 'upcoming': {
                filter_sort['calendar.start_time'] = 1;
                break;
            }
            case 'prev': {
                filter_sort['calendar.start_time'] = -1;
                break;
            }
            default: {
                filter_sort['calendar.start_time'] = -1;
                break;
            }
        }
        if (ordered_package_id) {
            filter.ordered_package_id = parseInt(ordered_package_id as string);
        }
        const bookings = await BookingActions.findAllAndPaginated(
            filter,
            filter_sort
        );
        const cloneBookings = new Array<any>();
        const arrBookingIds = new Array<any>();
        const cloneBookingsNew = new Array<any>();
        await Promise.all(
            bookings.map(async (booking: any) => {
                arrBookingIds.push(booking.id);
                const trialTestIeltsResult =
                    await TrialTestIeltsResultActions.findOne({
                        booking_id: booking.id,
                        student_id: booking.student_id
                    });
                const teacherData = await TeacherActions.findOne({
                    user_id: booking.teacher_id
                });
                const teacherInfo = {
                    id: booking.teacher_id,
                    location_id: teacherData?.location_id,
                    cancel_time: teacherData?.location?.cancel_time
                };

                cloneBookings.push({
                    ...booking.toJSON(),
                    trial_test_ielts_result: trialTestIeltsResult,
                    teacher_info: teacherInfo || null
                });
            })
        );
        await Promise.all(
            arrBookingIds.map(async (booking_id: any) => {
                const filterBooking = cloneBookings.filter(
                    (clone_booking) => clone_booking.id === booking_id
                );
                if (filterBooking && filterBooking[0]) {
                    cloneBookingsNew.push(filterBooking[0]);
                }
            })
        );

        const count = await BookingActions.count(filter);
        const res_payload = {
            data: cloneBookingsNew,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay danh sach cac buoi booking den 1 giao vien
     * Request type: GET
     * Parameters: - teacher_id  :       : ma id cua giao vien
     *             - page_size   : query : so booking get duoc cho trang nay
     *             - page_number : query : so trang cho lan get nay
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad request
     */
    private static async getBookingsByTeacher(
        req: ProtectedRequest,
        teacher_id: number,
        type_get: string
    ) {
        const {
            page_size,
            page_number,
            status,
            upcoming,
            prev,
            memo,
            search,
            recorded
        } = req.query;

        const filter: any = {
            teacher_id,
            status: new Array<number>(),
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            $and: [{}]
        };
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                for (const element of status) {
                    const element_int = parseInt(element as string);
                    if (!isNaN(element_int)) {
                        filter.status.push(element_int);
                    }
                }
            } else {
                const status_int = parseInt(status as string);
                if (!isNaN(status_int)) {
                    filter.status.push(status_int);
                }
            }
        }
        if (upcoming && !isNaN(Number(upcoming))) {
            const now = moment();
            filter.$and.push(
                {
                    'calendar.start_time': {
                        $lte: now.clone().endOf('day').add(7, 'day').valueOf()
                    }
                },
                {
                    'calendar.start_time': {
                        $gte: now.clone().startOf('day').valueOf()
                    }
                }
            );
            filter.status = [
                EnumBookingStatus.PENDING,
                EnumBookingStatus.TEACHING,
                EnumBookingStatus.CONFIRMED
            ];
        }
        if (prev && !isNaN(Number(prev))) {
            const now = moment();
            delete filter.status;
            filter.$and.push(
                {
                    'calendar.start_time': {
                        $gte: now.clone().endOf('day').add(-2, 'day').valueOf()
                    }
                },
                {
                    'calendar.start_time': { $lte: now.valueOf() }
                }
            );
            filter.status = [
                EnumBookingStatus.COMPLETED,
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CANCEL_BY_ADMIN,
                EnumBookingStatus.CANCEL_BY_TEACHER,
                EnumBookingStatus.STUDENT_ABSENT,
                EnumBookingStatus.TEACHER_ABSENT
            ];
        }
        if (recorded == 'true') {
            filter.record_link = { $regex: '.+' }; /** Exists and not empty */
        } else if (recorded == 'false') {
            filter.record_link = {
                $not: { $regex: '.+' }
            };
        }
        if (memo) {
            delete filter.$and;
            filter.status = [EnumBookingStatus.COMPLETED];
            filter.memo = null;
        }
        let name_query_list = [];
        if (type_get == 'history') {
            // page teacher - teaching history: filter booking by student in teacher history
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1
                    }
                );
        } else {
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
        }
        for (const query of name_query_list) {
            filter.$and.push(query);
        }
        const sort: any = {};
        if (upcoming) {
            sort['calendar.start_time'] = 1;
            sort['created_time'] = -1;
        }
        if (prev) {
            sort['calendar.start_time'] = -1;
            sort['created_time'] = -1;
        }
        if (parseInt(page_size as string) > MAX_LIMIT)
            throw new InternalError(req.t('errors.common.large_query'));
        const bookings = await BookingActions.findAllAndPaginated(filter, sort);
        const count = await BookingActions.count(filter);
        const res_payload = {
            data: bookings,
            pagination: {
                total: count,
                page_number: Number(page_number)
            }
        };
        return res_payload;
    }

    public static async getCountBookingTeaching(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const filter: any = {
            $or: [
                {
                    teacher_id: id
                },
                {
                    student_id: id
                }
            ],
            status: [EnumBookingStatus.TEACHING, EnumBookingStatus.CONFIRMED]
        };
        const filterNoRate: any = {
            $or: [
                {
                    teacher_id: id
                },
                {
                    student_id: id
                }
            ],
            status: [EnumBookingStatus.COMPLETED],
            report: { $exists: false }
        };
        const count = await BookingActions.count(filter);
        const countNoRate = await BookingActions.count(filterNoRate);

        const res_payload = {
            data: {
                countTeaching: count,
                countNoRate: countNoRate
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Admin lay danh sach cac buoi booking den 1 giao vien
     * Request type: GET
     * Role: Admin
     * Parameters: - teacher_id  : params : ma id cua giao vien
     *             - page_size   : query  : so booking get duoc cho trang nay
     *             - page_number : query  : so trang cho lan get nay
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad request
     */
    public static async getBookingsByTeacherForAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const res_payload = await BookingController.getBookingsByTeacher(
            req,
            parseInt(teacher_id as string),
            'normal'
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Giao vien tu lay danh sach cac buoi booking den 1 chinh ho
     * Request type: GET
     * Role: Teacher
     * Parameters: - page_size   : query : so booking get duoc cho trang nay
     *             - page_number : query : so trang cho lan get nay
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad request
     */
    public static async getBookingsByTeacherForThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const res_payload = await BookingController.getBookingsByTeacher(
            req,
            id,
            'history'
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay danh sach cac buoi booking da hoan thanh o thoi diem gan
     *          day cua mot hoc vien
     * Request type: GET
     * Parameters: - student_id: : ma id cua hoc vien
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad request
     */
    private static async getRecentLearntLessonsByStudent(
        req: ProtectedRequest,
        student_id: number
    ) {
        const { page_size, page_number } = req.query;
        const filter = {
            student_id,
            is_regular_booking: false,
            status: [EnumBookingStatus.COMPLETED],
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        const bookings = await BookingActions.findAllAndPaginated(filter, {
            'calendar.start_time': -1
        });
        const count = await BookingActions.count(filter);
        const res_payload = {
            data: bookings,
            pagination: {
                total: count
            }
        };
        return res_payload;
    }

    /*
     * Summary: Admin lay danh sach 3 buoi booking da hoan thanh o thoi diem
     *          gan day cua mot hoc vien
     * Request type: GET
     * Role: Admin
     * Parameters: - student_id: params: ma id cua hoc vien
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad Request
     */
    public static async getRecentLearntLessonsByStudentForAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        const res_payload =
            await BookingController.getRecentLearntLessonsByStudent(
                req,
                parseInt(student_id as string)
            );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Hoc vien lay danh sach 3 buoi booking da hoan thanh o thoi
     *          diem gan day cua chinh ho
     * Request type: GET
     * Role: Student
     * Parameters: <None>
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad Request
     */
    public static async getRecentLearntLessonsByStudentForThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        req.query.page_size = '3';
        req.query.page_number = '1';
        const res_payload =
            await BookingController.getRecentLearntLessonsByStudent(req, id);
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay danh sach cac buoi booking da hoan thanh cua mot hoc vien
     * Request type: GET
     * Parameters: student_id: : ma id cua hoc vien
     * Response: - 200: OK, lay duoc danh sach
     *           - 400: Bad Request
     */
    private static async getCompletedBookingsByStudent(
        req: ProtectedRequest,
        student_id: number
    ) {
        const filter = {
            status: [EnumBookingStatus.COMPLETED],
            student_id
        };
        const bookings = await BookingActions.findAllAndPaginated(filter);
        const count = await BookingActions.count(filter);
        const res_payload = {
            data: bookings,
            pagination: {
                total: count
            }
        };
        return res_payload;
    }

    public static async updateAllUnitBookingConfirmedToUnbooked(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id, ordered_package_id } = req.body;
        let time = moment().add(3, 'day');
        const filter = {
            student_id: parseInt(student_id as string),
            ordered_package_id,
            status: EnumBookingStatus.CONFIRMED,
            $or: [
                {
                    admin_unit_lock: false
                },
                {
                    admin_unit_lock: { $exists: false }
                }
            ],
            'calendar.start_time': {
                $gte: moment().valueOf(),
                $lte: time.valueOf()
            }
        };
        const bookings = await BookingModel.find(filter);

        await Promise.all(
            bookings.map(async (e) => {
                // e.unit_id = -1;
                e.updated_time = moment().subtract(10, 'minute').toDate();
                await e.save();
            })
        );
        return new SuccessResponse('success', []).send(res, req);
    }

    public static async getUnitToBookFunc(
        student_id: number,
        course_id: number,
        ordered_package_id: number,
        unit_id?: any
    ) {
        let availableUnits = new Array<any>();
        let units = await UnitActions.findAll(
            {
                course_id: course_id,
                is_active: true
            },
            { display_order: 1, id: 1 }
        );
        const isMergedPackage = await MergedPackageActions.findOne({
            student_id: Number(student_id),
            $or: [
                {
                    package_one_id: Number(ordered_package_id)
                },
                {
                    package_two_id: Number(ordered_package_id)
                }
            ]
        });
        const filterBookingDone = {
            student_id: student_id,
            ordered_package_id,
            course_id: Number(course_id),
            status: EnumBookingStatus.COMPLETED
        } as any;
        if (isMergedPackage) {
            const lastBookingDoneA = await BookingActions.findOne(
                {
                    student_id: student_id,
                    ordered_package_id: isMergedPackage.package_one_id,
                    status: EnumBookingStatus.COMPLETED
                },
                { __v: 0 },
                {
                    'calendar.start_time': -1
                }
            );
            const lastBookingDoneB = await BookingActions.findOne(
                {
                    student_id: student_id,
                    ordered_package_id: isMergedPackage.package_two_id,
                    status: EnumBookingStatus.COMPLETED
                },
                { __v: 0 },
                {
                    'calendar.start_time': -1
                }
            );
            filterBookingDone.ordered_package_id = {
                $in: [
                    isMergedPackage.package_one_id,
                    isMergedPackage.package_two_id
                ]
            };
            if (
                lastBookingDoneA &&
                lastBookingDoneB &&
                lastBookingDoneA.course_id !== lastBookingDoneB.course_id &&
                !(
                    (lastBookingDoneA.ordered_package_id !==
                        ordered_package_id &&
                        lastBookingDoneA.course_id === course_id) ||
                    (lastBookingDoneB.ordered_package_id !==
                        ordered_package_id &&
                        lastBookingDoneB.course_id === course_id)
                )
            ) {
                filterBookingDone.ordered_package_id = ordered_package_id;
            }
        }
        const lastBookingDone = await BookingActions.findOne(
            filterBookingDone,
            { __v: 0 },
            {
                'calendar.start_time': -1
            }
        );

        if (lastBookingDone) {
            let unit = lastBookingDone.unit_id;
            const index = units.findIndex((e) => e.id === unit);
            if (index !== -1) {
                units.splice(0, index + 1);
            }
        }
        let timeLt = moment().subtract(5, 'minute');
        const lastUnitUpdated = await BookingActions.findOne(
            {
                student_id: student_id,
                ordered_package_id: filterBookingDone.ordered_package_id,
                status: EnumBookingStatus.CONFIRMED
            },
            { __v: 0 },
            {
                updated_time: -1
            }
        );
        if (
            lastUnitUpdated &&
            moment(lastUnitUpdated.updated_time).valueOf() > timeLt.valueOf()
        ) {
            let unit = lastUnitUpdated.unit_id;
            const index = units.findIndex((e) => e.id === unit);
            if (index !== -1) {
                units.splice(0, index + 1);
            }
            if (
                lastUnitUpdated.ordered_package_id !== ordered_package_id &&
                course_id !== lastUnitUpdated.course_id
            ) {
                units = [];
            }
        }
        logger.info('getUnitToBookFunc - unit_id', unit_id);
        // Nếu package chưa có booking upcoming/completed nào thì booking đầu tiên sẽ đặt vào unit đã chọn lúc tạo schedule
        if (unit_id && !lastBookingDone && !lastUnitUpdated) {
            const unitData = await UnitActions.findOne({
                id: Number(unit_id),
                course_id: Number(course_id),
                is_active: true
            });
            logger.info(
                'getUnitToBookFunc - unit_id',
                JSON.stringify(unitData)
            );
            if (unitData) {
                availableUnits = [
                    {
                        id: unit_id,
                        display_order: unitData.display_order
                    }
                ];
            } else {
                availableUnits = [
                    {
                        id: units[0].id,
                        display_order: units[0].display_order
                    }
                ];
            }
        } else {
            if (units.length) {
                availableUnits = [
                    {
                        id: units[0].id,
                        display_order: units[0].display_order
                    }
                ];
            }
        }
        logger.info(
            'getUnitToBookFunc - unit_id',
            JSON.stringify(availableUnits)
        );
        const res_payload = {
            data: availableUnits,
            count: availableUnits.length
        };
        return res_payload;
    }

    public static async getUnitToBook(req: ProtectedRequest, res: Response) {
        const { student_id, course_id } = req.params;
        const { unit_id, ordered_package_id } = req.query;
        logger.info('getUnitToBook - unit_id', unit_id);
        const availableUnits = await BookingController.getUnitToBookFunc(
            Number(student_id),
            Number(course_id),
            Number(ordered_package_id),
            unit_id ? Number(unit_id) : null
        );
        const res_payload = {
            data: availableUnits.data,
            count: availableUnits?.count || 0
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay danh sach nhung bai hoc da hoc cua hoc vien trong 1 khoa
     * Request type: GET
     * Parameters: - student_id :        : ma id cua hoc vien
     *             - course_id  : params : ma id cua khoa hoc
     * Response: - 200: OK, lay duoc danh sach ca khoa hoc cung id cac bai da hoc
     *           - 400: Bad Request
     */
    private static async getLearntUnitsInCourseByStudent(
        req: ProtectedRequest,
        student_id: number,
        sort?: any
    ) {
        const { course_id } = req.params;

        const learntUnits = new Array<number>();

        const units = await UnitActions.findAll(
            {
                course_id: parseInt(course_id as string),
                is_active: true
            },
            sort
        );
        const totalUnits = await UnitActions.count({
            course_id: parseInt(course_id as string),
            is_active: true
        });

        await Promise.all(
            units.map(async (item: any) => {
                const count = await BookingActions.count({
                    student_id,
                    unit_id: item.id,
                    status: [EnumBookingStatus.COMPLETED]
                });
                if (count > 0) {
                    learntUnits.push(item.id);
                }
            })
        );

        const res_payload = {
            data: {
                learntUnits: learntUnits,
                allUnits: units
            },
            pagination: {
                learntCount: learntUnits.length,
                totalCount: totalUnits
            }
        };

        return res_payload;
    }

    /*
     * Summary: Admin lay danh sach nhung bai hoc da hoc cua hoc vien trong 1 khoa
     * Request type: GET
     * Role: Admin
     * Parameters: - student_id : params : ma id cua hoc vien
     *             - course_id  : params : ma id cua khoa hoc
     * Response: - 200: OK, lay duoc danh sach ca khoa hoc cung id cac bai da hoc
     *           - 400: Bad Request
     */
    public static async getLearntUnitsInCourseByStudentForAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        const sort = {
            id: 1 /* Assume that this is the sort of units in a course */
        };
        const res_payload =
            await BookingController.getLearntUnitsInCourseByStudent(
                req,
                parseInt(student_id as string),
                sort
            );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Hoc vien lay danh sach nhung bai hoc da hoc cua chinh hoc trong 1 khoa
     * Request type: GET
     * Parameters: - course_id  : params : ma id cua khoa hoc
     * Response: - 200: OK, lay duoc danh sach ca khoa hoc cung id cac bai da hoc
     *           - 400: Bad Request
     */
    public static async getLearntUnitsInCourseByStudentForThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;

        const sort = {
            display_order: 1
        };

        const res_payload =
            await BookingController.getLearntUnitsInCourseByStudent(
                req,
                id,
                sort
            );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay chi tiet mot buoi booking
     * Request type: GET
     * Role: All
     * Parameters: - id: params: ma id cua buoi hoc
     * Response: - 200: OK, lay duoc buoi hoc
     *          - 400: khong ton tai buoi hoc
     */
    public static async getDetailLesson(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        let lesson: Booking | null = null;
        const select_fields: any = {};
        if (req.user) {
            const user_id = req.user.id;
            if (req.user.role.includes(RoleCode.TEACHER)) {
                lesson = await BookingActions.findOne({
                    id: parseInt(id),
                    teacher_id: user_id
                });
                select_fields.admin_assessment = 0;
            }
            if (req.user.role.includes(RoleCode.STUDENT)) {
                lesson = await BookingActions.findOne({
                    id: parseInt(id),
                    student_id: user_id
                });
            }
            if (req.user.isAdmin) {
                lesson = await BookingActions.findOne({
                    id: parseInt(id)
                });
            }
        }
        if (!lesson)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        const res_payload: any = lesson;
        if (
            lesson.ordered_package &&
            lesson.ordered_package.type == EnumPackageOrderType.TRIAL
        ) {
            /** For trial booking, give the whole record of trial booking instead */
            const trial_booking = await TrialBookingActions.findOne(
                {
                    booking_id: parseInt(id)
                },
                select_fields
            );
            if (!trial_booking) {
                throw new BadRequestError(
                    req.t('errors.trial_booking.not_found')
                );
            }
            // res_payload = trial_booking.booking;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Lay chi tiet buoi hoc ma hoc vien hoc gan day nhat
     * Request type: GET
     * Parameters: - student_id: : ma id cua hoc vien
     * Response: - 200: OK, lay duoc buoi hoc
     *           - 400: Bad Request
     */
    private static async getLatestLearntLessonByStudent(student_id: number) {
        const lesson = await BookingActions.findOneWithLatestCalendar({
            student_id
        });
        return lesson;
    }

    /*
     * Summary: Lay chi tiet khoa hoc ma hoc vien hoc gan day nhat
     * Request type: GET
     * Parameters: - student_id: : ma id cua hoc vien
     * Response: - 200: OK, lay duoc khoa hoc
     *           - 400: Bad Request
     */
    private static async getLatestLearntCourseAndPackageOfStudent(
        student_id: number
    ) {
        const lesson = await BookingController.getLatestLearntLessonByStudent(
            student_id
        );
        if (!lesson) return null;
        const recent_learnt = {
            course: lesson.course,
            package_id: lesson.ordered_package.package_id,
            package_name: lesson.ordered_package.package_name,
            ordered_package_id: lesson.ordered_package_id
        };
        return recent_learnt;
    }

    /*
     * Summary: Lay chi tiet khoa hoc ma hoc vien hoc gan day nhat + total lessons of course
     * Request type: GET
     * Parameters: - student_id: : ma id cua hoc vien
     * Response: - 200: OK, lay duoc khoa hoc
     *           - 400: Bad Request
     */
    private static async getLatestLearntCourseAndPackageAndTotalLessonsOfStudent(
        student_id: number
    ) {
        const lesson = await BookingController.getLatestLearntLessonByStudent(
            student_id
        );
        if (!lesson) return null;

        let totalUnits = 0;
        if (lesson.course) {
            totalUnits = await UnitActions.count({
                course_id: parseInt(lesson.course.id as unknown as string),
                is_active: true
            });
        }

        const recent_learnt = {
            course: lesson.course,
            total_lessons: totalUnits,
            package_id: lesson.ordered_package.package_id,
            package_name: lesson.ordered_package.package_name,
            ordered_package_id: lesson.ordered_package_id
        };
        return recent_learnt;
    }

    /*
     * Summary: Admin lay chi tiet khoa hoc ma hoc vien hoc gan day nhat
     * Request type: GET
     * Role: Admin
     * Parameters: - student_id: params: ma id cua hoc vien
     * Response: - 200: OK, lay duoc khoa hoc
     *           - 400: Bad Request
     */
    public static async getLatestLearntCourseAndPackageOfStudentForAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        const recent_learnt =
            await BookingController.getLatestLearntCourseAndPackageOfStudent(
                parseInt(student_id as string)
            );
        return new SuccessResponse('success', recent_learnt).send(res, req);
    }

    /*
     * Summary: Hoc vien lay chi tiet khoa hoc gan day nhat ma ban than ho da hoc
     * Request type: GET
     * Role: Student
     * Parameters: <None>
     * Response: - 200: OK, lay duoc khoa hoc
     *           - 400: Bad Request
     */
    public static async getLatestLearntCourseAndPackageOfStudentByThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const recent_learnt =
            await BookingController.getLatestLearntCourseAndPackageAndTotalLessonsOfStudent(
                id
            );
        return new SuccessResponse('success', recent_learnt).send(res, req);
    }

    /*
     * Summary: Tao mot booking
     * Request type: POST
     * Parameters: - student_id:     :     : ma id cua hoc vien
     *             - status          :     : trang thai cua booking, gia tri
     *                                       trong khoang [2-3] va duoc
     *                                       validate boi middleware
     *             - course_id       : body: ma id cua khoa hoc
     *             - teacher_id      : body: ma id cua giao vien
     *             - calendar_id     : body: ma id cua thoi gian hoc
     *             - unit_id         : body: ma id cua khoa hoc
     *             - student_note    : body: note cua hoc vien
     *             - teacher_note    : body: note cua giao vien
     *             - admin_note      : body: note cua hoc vien
     * Response: - 200: OK, tao thanh cong lich dat
     *           - 400: Bad Request
     */
    public static async createBooking(
        req: ProtectedRequest,
        student_id: number,
        status: number,
        dontValidate?: any,
        oldBooking?: any
    ) {
        const {
            course_id,
            ordered_package_id,
            teacher_id,
            calendar_id,
            unit_id,
            student_note,
            teacher_note,
            admin_note,
            is_regular_booking,
            substitute_for_teacher_id,
            ispeak_booking_id,
            source,
            admin_unit_lock,
            schedule_teacher_id
        } = req.body;

        const teacher = await UserActions.findOne({
            id: teacher_id,
            is_active: true
        });
        const teacher_info = await TeacherActions.findOne({
            user_id: teacher_id
        });
        if (!teacher || !teacher_info)
            throw new BadRequestError(req.t('errors.teacher.not_found'));

        if (!teacher.is_active) {
            throw new BadRequestError(req.t('errors.teacher.inactive'));
        }

        const calendar = await CalendarActions.findOne({
            id: calendar_id,
            teacher_id,
            is_active: true
        });
        if (!calendar)
            throw new BadRequestError(req.t('errors.calendar.not_found'));
        if (calendar.start_time) {
            const sub_time = calendar.start_time - new Date().getTime();
            // thêm điều kiện check ko phải booking của lớp học IELTS
            if (sub_time <= 0 && teacher_id !== IELTS_TEACHER_FAKE_ID) {
                throw new BadRequestError();
            }
        }
        // check student tạo booking có trùng time xin nghỉ hay không
        if (source === 'student' || source === 'admin') {
            const check_request_filter = {
                student_id,
                start_time: { $lt: calendar?.start_time },
                end_time: { $gt: calendar?.start_time },
                status: {
                    $in: [
                        EnumStudentLeaveRequestStatus.APPROVED,
                        EnumStudentLeaveRequestStatus.PENDING
                    ]
                }
            };
            const check_request = await StudentLeaveRequestActions.findOne(
                check_request_filter
            );
            if (check_request) {
                throw new BadRequestError(
                    req.t('errors.booking.duplicate_student_leave_schedule')
                );
            }
        }
        const existsBooking = await BookingActions.findOne({
            'calendar.start_time': calendar.start_time,
            status: {
                $in: [
                    EnumBookingStatus.PENDING,
                    EnumBookingStatus.CONFIRMED,
                    EnumBookingStatus.TEACHER_CONFIRMED,
                    EnumBookingStatus.TEACHING
                ]
            },
            $or: [
                {
                    student_id: student_id
                },
                {
                    teacher_id: teacher_id
                }
            ]
        });
        // thêm điều kiện check ko phải booking của lớp học IELTS
        if (existsBooking && teacher_id !== IELTS_TEACHER_FAKE_ID) {
            throw new BadRequestError(
                req.t(
                    'errors.booking.booked',
                    existsBooking.id,
                    existsBooking.student.full_name,
                    existsBooking.teacher.full_name
                )
            );
        }
        if (req.user && substitute_for_teacher_id) {
            if (substitute_for_teacher_id == teacher_id) {
                throw new BadRequestError(
                    req.t('errors.booking.replaced_with_same_teacher')
                );
            }
            if (calendar.end_time < new Date().getTime()) {
                throw new BadRequestError(req.t('errors.booking.start_late'));
            }
        } else {
            if (
                (!dontValidate || !dontValidate.accept_time) &&
                teacher_info.location.accept_time
            ) {
                const sub_time = calendar.start_time - new Date().getTime();
                const minute = sub_time / MINUTE_TO_MS;
                if (minute < teacher_info.location.accept_time) {
                    throw new BadRequestError(
                        req.t(
                            'errors.booking.need_to_be_earlier',
                            teacher_info.location.accept_time
                        )
                    );
                }
            }
        }
        const student = await UserActions.findOne({
            id: student_id,
            is_active: true
        });
        if (!student)
            throw new BadRequestError(req.t('errors.student.not_found'));
        const availableCourses =
            await CourseController.getAllAvailableCoursesByStudent(
                req,
                student_id
            );

        if (!availableCourses.has(parseInt(course_id as string))) {
            throw new BadRequestError(req.t('errors.course.not_bought'));
        }

        if (is_regular_booking) {
            const timestamp_in_week = getTimestampInWeek(calendar.start_time);
            if (!student.regular_times) {
                throw new BadRequestError(
                    req.t('errors.booking.not_on_regular')
                );
            }
            if (
                !student.regular_times.includes(timestamp_in_week) &&
                !student.regular_times.includes(calendar.start_time)
            ) {
                throw new BadRequestError(
                    req.t('errors.booking.not_on_regular')
                );
            }
        }
        const course = await CourseActions.findOne({
            id: course_id,
            is_active: true
        });
        if (!course)
            throw new BadRequestError(req.t('errors.course.not_found'));
        const ordered_package = await OrderedPackageActions.findOne({
            id: ordered_package_id,
            user_id: student_id,
            number_class: { $gt: 0 }
        });
        if (!ordered_package || !ordered_package.activation_date) {
            throw new BadRequestError(req.t('errors.ordered_package.inactive'));
        }
        if (ordered_package.paid_number_class) {
            /** Student just paid a part of the package */
            if (
                ordered_package.number_class +
                    ordered_package.paid_number_class <=
                ordered_package.original_number_class
            ) {
                throw new BadRequestError(req.t('errors.order.unavailable'));
            }
        }
        const packageData = await PackageActions.findOne({
            id: ordered_package.package_id
        });
        if (
            packageData &&
            packageData.learning_frequency_type == EnumFrequencyType.DAILY
        ) {
            const current_date_start_time = moment().startOf('day').valueOf();
            const current_date_end_time = moment().endOf('day').valueOf();
            if (
                calendar.start_time > current_date_start_time &&
                calendar.start_time < current_date_end_time
            ) {
                const checkBookingDaily = await BookingActions.findOne({
                    ordered_package_id: ordered_package.id,
                    student_id: student_id,
                    'calendar.start_time': {
                        $gt: current_date_start_time,
                        $lt: current_date_end_time
                    },
                    status: {
                        $in: [
                            EnumBookingStatus.COMPLETED,
                            EnumBookingStatus.PENDING,
                            EnumBookingStatus.CONFIRMED,
                            EnumBookingStatus.TEACHER_CONFIRMED,
                            EnumBookingStatus.TEACHING,
                            EnumBookingStatus.STUDENT_ABSENT
                        ]
                    }
                });
                if (checkBookingDaily) {
                    throw new BadRequestError(
                        req.t('errors.booking.exists_booking_of_package_daily')
                    );
                }
            } else {
                throw new BadRequestError(
                    req.t('errors.booking.time_invalid_of_package_daily')
                );
            }
        }

        const current_moment = new Date().getTime();
        if (
            ordered_package.activation_date +
                ordered_package.day_of_use * DAY_TO_MS <
            current_moment
        ) {
            throw new BadRequestError(req.t('errors.ordered_package.expired'));
        }
        if (ordered_package.type == EnumPackageOrderType.TRIAL) {
            if (status != EnumBookingStatus.CONFIRMED) {
                throw new BadRequestError(
                    req.t('errors.trial_booking.invalid_status')
                );
            }
        }
        if (req.user && req.user.role.includes(RoleCode.STUDENT)) {
            /** This is a request from flexible student */
            if (ordered_package.type != EnumPackageOrderType.STANDARD) {
                throw new BadRequestError(
                    req.t('errors.ordered_package.unavailable')
                );
            }
        }

        const check_reservation =
            await StudentReservationRequestActions.findOne({
                student_id,
                ordered_package_id,
                status: [
                    EnumStudentReservationRequestStatus.APPROVED,
                    EnumStudentReservationRequestStatus.PAID
                ],
                start_time: { $lte: calendar.end_time },
                end_time: { $gte: calendar.start_time }
            });
        if (check_reservation) {
            throw new BadRequestError(
                req.t('errors.booking.student_in_reservation')
            );
        }

        const unit = await UnitActions.findOne({
            id: Number(unit_id),
            course_id: Number(course_id),
            is_active: true
        });
        if (!unit) {
            throw new BadRequestError(req.t('errors.unit.not_found'));
        }

        const test_topic_id = unit.test_topic_id;
        const test_topic_name = unit.test_topic?.topic || '';

        // tìm tất cả booking của student tại time này
        const userBookings = await BookingActions.findAll(
            {
                student_id: ordered_package.user_id,
                calendar_id
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
                calendar_id
            },
            {
                created_time: -1
            }
        );
        // kiểm tra xem booking có thời gian gần nhất có trạng thái đạt điều kiện hay không
        // thêm điều kiện check ko phải booking của lớp học IELTS
        if (
            teacherBookings.length > 0 &&
            teacher_id !== IELTS_TEACHER_FAKE_ID &&
            ![
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CHANGE_TIME
            ].includes(teacherBookings[0].status)
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teacher_has_booked_at_time')
            );
        }

        let total_lesson = teacher_info.total_lesson || 0;
        let total_lesson_english_plus =
            teacher_info.total_lesson_english_plus || 0;
        let total_lesson_this_level = teacher_info.total_lesson_this_level || 0;
        if (EnumBookingStatus.COMPLETED == status) {
            total_lesson_english_plus++;
            total_lesson++;
            total_lesson_this_level++;
        }
        await TeacherActions.update(teacher_info._id, {
            total_lesson_english_plus,
            total_lesson,
            total_lesson_this_level
        } as Teacher);

        const counter = await CounterActions.findOne({});
        const booking_id = counter.booking_id;
        const booking_info: any = {
            id: booking_id,
            course_id: parseInt(course_id as string),
            ordered_package_id: parseInt(ordered_package_id as string),
            teacher_id: parseInt(teacher_id as string),
            calendar_id: parseInt(calendar_id as string),
            unit_id: parseInt(unit_id as string),
            student_id,
            calendar,
            teacher,
            course,
            ordered_package,
            student,
            unit,
            status,
            student_note: student_note ? student_note.toString() : '',
            teacher_note: teacher_note ? teacher_note.toString() : '',
            admin_note: admin_note ? admin_note.toString() : '',
            is_regular_booking,
            substitute_for_teacher_id: req.user ? substitute_for_teacher_id : 0,
            learning_medium: {
                medium_type: EnumBookingMediumType.HAMIA_MEET
            },
            source,
            ispeak_booking_id,
            test_topic_id,
            test_topic_name,
            admin_unit_lock: admin_unit_lock || false
        };
        //  lưu lại teacher chính của job schedule tạo booking
        if (source == 'cronjob') {
            booking_info.schedule_teacher_id = schedule_teacher_id;
        }

        const booking = await BookingActions.create({
            ...booking_info
        } as Booking);

        const templatePayload: any = {
            student_name: `${student.first_name} ${student.last_name}`,
            teacher_name: `${teacher.first_name} ${teacher.last_name}`,
            course_name: course.name,
            unit_name: unit.name,
            start_time: calendar.start_time,
            teacher_avatar: teacher?.avatar as string,
            join_url: '',
            course_preview: course?.image as string,
            teacher_skype: teacher?.skype_account as string,
            student_skype: student?.skype_account as string,
            student_avatar: student?.avatar as string,
            new_teacher_name: `${teacher.first_name} ${teacher.last_name}`,
            new_booking_start_time: calendar.start_time,
            old_teacher_name: oldBooking
                ? `${oldBooking?.teacher?.first_name} ${oldBooking?.teacher?.last_name}`
                : '',
            old_booking_start_time: oldBooking
                ? oldBooking?.calendar?.start_time
                : ''
        };

        // Xử lý khi Hệ thống book
        if (source == 'cronjob') {
            const conjobTemplatePayload = {
                student_name: `${student.full_name} - ${student.username}`,
                teacher_name: `${teacher.full_name} - ${teacher.username}`,
                course_name: course.name,
                unit_name: unit.name,
                start_time: calendar.start_time,
                teacher_avatar: teacher?.avatar as string,
                join_url: '',
                course_preview: course?.image as string,
                teacher_skype: teacher?.skype_account as string,
                student_skype: student?.skype_account as string,
                student_avatar: student?.avatar as string
            };

            const lastUnitOfCourse = await UnitModel.findOne({
                course_id: Number(course_id),
                is_active: true
            }).sort({ display_order: -1 });

            if (lastUnitOfCourse?.id == unit.id) {
                let issueDescription = 'Last unit of course';
                let notiCsAdminTemplate: any = null;
                // Khi hệ thống book vào unit cuối cùng của course cuối cùng thì notify (ko phải hệ thống book thì ko gửi)
                const listCourses = await CourseActions.findAll(
                    {
                        curriculum_id: course.curriculum_id
                    },
                    {
                        display_order: 1,
                        id: 1
                    },
                    { id: 1, display_order: 1 }
                );
                const index = listCourses.findIndex(
                    (e) => e.id === Number(course_id)
                );
                let nextCourse = null;
                if (index !== -1 && index + 1 < listCourses.length) {
                    nextCourse = listCourses[index + 1];
                }

                if (!nextCourse) {
                    notiCsAdminTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.FINISH_CURRICULUM
                    });
                    issueDescription = 'Last unit of last course';
                } else {
                    // Khi hệ thống book vào unit cuối cùng của course thì notify (ko phải hệ thống book thì ko gửi)
                    notiCsAdminTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.NEXT_COURSE
                    });
                }

                if (notiCsAdminTemplate) {
                    // Thông báo cho admin
                    const adminOwner = await AdminActions.findOne({
                        username: 'admin'
                    });
                    if (adminOwner) {
                        natsClient.publishEventWithTemplate({
                            template: notiCsAdminTemplate.content,
                            data: conjobTemplatePayload,
                            receiver: adminOwner._id,
                            template_obj_id: notiCsAdminTemplate._id
                        });
                    }

                    // thông báo cho cs
                    const operationIssue = await OperationIssueActions.create({
                        booking_id: booking.id,
                        issue_description: issueDescription,
                        resolved_staff_id: null
                    } as any);
                    const operationIssueId = operationIssue?._id;

                    const cskhDepartment = await DepartmentModel.findOne({
                        unsignedName: CODE_DEPARTMENT.CSKH
                    });
                    if (cskhDepartment) {
                        const managerCskh = await AdminModel.findOne({
                            department: {
                                department: cskhDepartment._id,
                                isRole: EnumRole.Manager
                            }
                        });
                        if (managerCskh) {
                            natsClient.publishEventWithTemplate({
                                template: notiCsAdminTemplate.content,
                                data: conjobTemplatePayload,
                                receiver: managerCskh._id,
                                template_obj_id: notiCsAdminTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        }
                        const listDeputy = await AdminModel.find({
                            'department.department': cskhDepartment._id,
                            'department.isRole': EnumRole.Deputy_manager
                        });

                        if (listDeputy.length) {
                            listDeputy.forEach((element) => {
                                natsClient.publishEventWithTemplate({
                                    template: notiCsAdminTemplate.content,
                                    data: conjobTemplatePayload,
                                    receiver: element._id,
                                    template_obj_id: notiCsAdminTemplate._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        const listLeader = await AdminModel.find({
                            'department.department': cskhDepartment._id,
                            'department.isRole': EnumRole.Leader
                        });

                        if (listLeader.length) {
                            listLeader.forEach((element) => {
                                natsClient.publishEventWithTemplate({
                                    template: notiCsAdminTemplate.content,
                                    data: conjobTemplatePayload,
                                    receiver: element._id,
                                    template_obj_id: notiCsAdminTemplate._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        // thông báo cho nhân viên quản lý
                        const student = await StudentModel.findOne({
                            user_id: booking.student_id
                        }).populate('staff');
                        const checkExits = listLeader.find(
                            (e) => e.id === student?.staff?.id
                        );
                        if (student && student?.staff && !checkExits) {
                            natsClient.publishEventWithTemplate({
                                template: notiCsAdminTemplate.content,
                                data: conjobTemplatePayload,
                                receiver: student.staff._id,
                                template_obj_id: notiCsAdminTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        }
                    }
                }
            }
        }

        // check tạo trước bản ghi ielts result cho booking có bài thi IELTS 4 skills (unit thuộc type IELTS)
        if (booking) {
            const unit_type = booking?.unit.unit_type;
            if (
                unit_type == EnumUnitType.IELTS_GRAMMAR ||
                unit_type == EnumUnitType.IELTS_4_SKILLS
            ) {
                const dataIeltsResult = {
                    student_user: booking?.student,
                    booking,
                    unit: booking?.unit,
                    course: booking?.course
                };
                await TrialTestIeltsResultController.createTrialTestIeltsResult(
                    unit_type,
                    dataIeltsResult
                );
            }
        }

        // Nếu student có type learning là HMP thì dùng sdk call tạo bên cms thông tin để generate link HMP
        // logger.info('create booking: check connect and create cms HMP');
        // await BookingController.createLinkHMPForBooking(req, booking);

        if (EnumBookingStatus.COMPLETED == booking_info.status) {
            await BookingController.checkForEndOfCourse(
                req,
                booking_info.student_id,
                booking_info.course_id
            );
        }
        await OrderedPackageController.learnALessonInOrderedPackage(
            booking,
            ordered_package,
            booking_info.student,
            true,
            true
        );
        const studentTemplate = await TemplateActions.findOne({
            code: EmailTemplate.NEW_BOOKING_FOR_STUDENT
        });
        if (studentTemplate) {
            const student_create_booking_req = {
                user: booking.student
            };
            // const join_url = await BookingController.generateBookingJoinUrl(
            //     student_create_booking_req as ProtectedRequest,
            //     booking
            // );
            // if (join_url) {
            //     templatePayload.join_url = join_url as unknown as string;
            // }
            if (!ispeak_booking_id) {
                if(student.is_verified_email === true && student.is_enable_receive_mail){
                    JobQueueServices.sendMailWithTemplate({
                        to: student.email,
                        subject: studentTemplate.title,
                        body: studentTemplate.content,
                        data: templatePayload
                    });
                }
                // Send to Email Exception
                Promise.all(
                    EMAIL_ADDRESS_EXCEPTION.map(async (item) => {
                        JobQueueServices.sendMailWithTemplate({
                            to: item,
                            subject: studentTemplate.title,
                            body: studentTemplate.content,
                            data: templatePayload
                        });
                    })
                );
                //
            }
        }

        const teacherTemplate = await TemplateActions.findOne({
            code: EmailTemplate.NEW_BOOKING_FOR_TEACHER
        });
        if (teacherTemplate)
            if (!ispeak_booking_id) {
                JobQueueServices.sendMailWithTemplate({
                    to: teacher.email,
                    subject: teacherTemplate.title,
                    body: teacherTemplate.content,
                    data: templatePayload
                });
            }
        const notiTeacherTemplate = await TemplateActions.findOne({
            code: BackEndNotification.CREATE_BOOKING_FOR_TEACHER
        });
        if (notiTeacherTemplate) {
            await natsClient.publishEventWithTemplate({
                template: notiTeacherTemplate.content,
                data: templatePayload,
                receiver: booking.teacher_id,
                template_obj_id: notiTeacherTemplate._id
            });
        }

        const student_noti_code = booking.substitute_for_teacher_id
            ? BackEndNotification.SUBSTITUTE_BOOKING_FOR_STUDENT
            : BackEndNotification.CREATE_BOOKING_FOR_STUDENT;
        const notiStudentTemplate = await TemplateActions.findOne({
            code: student_noti_code
        });
        if (notiStudentTemplate) {
            await natsClient.publishEventWithTemplate({
                template: notiStudentTemplate.content,
                data: templatePayload,
                receiver: booking.student_id,
                template_obj_id: notiStudentTemplate._id
            });
        }

        const admin_noti_code = booking.substitute_for_teacher_id
            ? BackEndNotification.SUBSTITUTE_BOOKING_FOR_ADMIN
            : BackEndNotification.CREATE_BOOKING_FOR_ADMIN;
        const notiAdminTemplate = await TemplateActions.findOne({
            code: admin_noti_code
        });
        const adminOwner = await AdminActions.findOne({ username: 'admin' });
        if (adminOwner && notiAdminTemplate) {
            await natsClient.publishEventWithTemplate({
                template: notiAdminTemplate.content,
                data: templatePayload,
                receiver: adminOwner._id,
                template_obj_id: notiAdminTemplate._id
            });
        }

        if (booking.substitute_for_teacher_id && notiAdminTemplate) {
            // thông báo cho cs
            let issueDescription = 'Create booking';
            if (booking.substitute_for_teacher_id) {
                issueDescription = 'Admin change GV';
            }
            const operationIssue = await OperationIssueActions.create({
                booking_id: booking.id,
                issue_description: issueDescription,
                resolved_staff_id: null
            } as any);
            const operationIssueId = operationIssue?._id;

            const cskhDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.CSKH
            });
            if (cskhDepartment) {
                const managerCskh = await AdminModel.findOne({
                    department: {
                        department: cskhDepartment._id,
                        isRole: EnumRole.Manager
                    }
                });
                if (managerCskh) {
                    natsClient.publishEventWithTemplate({
                        template: notiAdminTemplate.content,
                        data: templatePayload,
                        receiver: managerCskh._id,
                        template_obj_id: notiAdminTemplate._id,
                        operation_issue_id: operationIssueId
                    });
                }
                const listDeputy = await AdminModel.find({
                    'department.department': cskhDepartment._id,
                    'department.isRole': EnumRole.Deputy_manager
                });

                if (listDeputy.length) {
                    listDeputy.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiAdminTemplate.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiAdminTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
                const listLeader = await AdminModel.find({
                    'department.department': cskhDepartment._id,
                    'department.isRole': EnumRole.Leader
                });

                if (listLeader.length) {
                    listLeader.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiAdminTemplate.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiAdminTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
                // thông báo cho nhân viên quản lý
                const student = await StudentModel.findOne({
                    user_id: booking.student_id
                }).populate('staff');
                const checkExits = listLeader.find(
                    (e) => e.id === student?.staff?.id
                );
                if (student && student?.staff && !checkExits) {
                    natsClient.publishEventWithTemplate({
                        template: notiAdminTemplate.content,
                        data: templatePayload,
                        receiver: student.staff._id,
                        template_obj_id: notiAdminTemplate._id,
                        operation_issue_id: operationIssueId
                    });
                }
            }

            // thông báo cho all nhân viên phòng TNG
            const tngDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.TNG
            });
            if (tngDepartment) {
                const allStaffTNG = await AdminModel.find({
                    'department.department': tngDepartment._id
                });
                if (allStaffTNG.length) {
                    allStaffTNG.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiAdminTemplate.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiAdminTemplate._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
            }
        }

        //Zalo create booking notication
        try {
            await natsClient.publishEvent(BackEndNotification.CREATE_BOOKING, {
                student_id: student?.id,
                student_name: student?.full_name,
                teacher_id: teacher?.id,
                teacher_name: teacher?.full_name,
                course_name: course?.name,
                unit_name: unit?.name,
                start_time: calendar?.start_time
            });
        } catch (e) {}

        return booking;
    }

    /*
     * Summary: Admin tao mot booking cho hoc vien
     * Request type: POST
     * Role: Admin
     * Parameters: - student_id:     : params: ma id cua hoc vien
     *             - status          : body  : trang thai cua booking
     *             - course_id       : body  : ma id cua khoa hoc
     *             - teacher_id      : body  : ma id cua giao vien
     *             - calendar_id     : body  : ma id cua thoi gian hoc
     *             - unit_id         : body  : ma id cua khoa hoc
     *             - student_note    : body  : note cua hoc vien
     *             - teacher_note    : body  : note cua giao vien
     *             - admin_note      : body  : note cua hoc vien
     * Response: - 200: OK, tao thanh cong lich dat
     *           - 400: Bad Request
     */
    public static async createBookingByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        const { status, teacher_id } = req.body;
        /** If no calendar in body, find a calendar or create a calendar */
        if (!req.body.calendar_id) {
            const { start_time } = req.body;

            if (!start_time || isNaN(start_time)) {
                throw new BadRequestError(req.t('errors.calendar.not_found'));
            }
            const calendar = await CalendarActions.findOne({
                teacher_id,
                start_time,
                end_time: start_time + 30 * MINUTE_TO_MS,
                is_active: true
            });
            if (calendar) {
                req.body.calendar_id = calendar.id;
            } else {
                const regular_time = getTimestampInWeek(start_time);
                const teacher = await UserActions.findOne({ id: teacher_id });
                if (!teacher) {
                    throw new BadRequestError(
                        req.t('errors.teacher.not_found')
                    );
                }
                if (
                    !teacher.regular_times ||
                    !teacher.regular_times.includes(regular_time)
                ) {
                    throw new BadRequestError(
                        req.t('errors.calendar.not_found')
                    );
                }
                req.body.end_time = start_time + 30 * MINUTE_TO_MS;
                req.body.calendar_id = await CalendarController.createSchedule(
                    req,
                    teacher_id,
                    {
                        accept_time: true
                    }
                );
            }
        }

        req.body.source = 'admin';
        const booking = await BookingController.createBooking(
            req,
            parseInt(student_id as string),
            status ? status : EnumBookingStatus.PENDING,
            {
                accept_time: true
            }
        );

        const res_payload = _.pick(booking, [
            'id',
            'student_id',
            'teacher_id',
            'status',
            'calendar',
            'course_id',
            'unit_id',
            'substitute_for_teacher_id'
        ]);
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createBookingByCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        req.body.is_regular_booking = true;
        req.body.source = 'cronjob';
        const booking = await BookingController.createBooking(
            req,
            parseInt(student_id as string),
            EnumBookingStatus.CONFIRMED,
            {
                accept_time: true
            }
        );
        return new SuccessResponse('success', booking).send(res, req);
    }

    /*
     * Summary: Hoc vien tu tao mot booking cho chinh ho
     * Request type: POST
     * Role: Student
     * Parameters: - course_id       : body: ma id cua khoa hoc
     *             - teacher_id      : body: ma id cua giao vien
     *             - calendar_id     : body: ma id cua thoi gian hoc
     *             - unit_id         : body: ma id cua khoa hoc
     *             - student_note    : body: note cua hoc vien
     * Response: - 200: OK, tao thanh cong lich dat
     *           - 400: Bad Request
     */
    public static async createBookingByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id, regular_times } = req.user;
        req.body.is_regular_booking = false;

        if (regular_times) {
            const { calendar_id } = req.body;
            const calendar = await CalendarActions.findOne({ id: calendar_id });
            if (calendar) {
                const timestamp_in_week = getTimestampInWeek(
                    calendar.start_time
                );
                const booking = await BookingActions.findOne({
                    calendar_id: calendar_id,
                    $or: [
                        {
                            status: EnumBookingStatus.CHANGE_TIME
                        },
                        {
                            status: EnumBookingStatus.CANCEL_BY_STUDENT
                        }
                    ]
                });
                if (!booking && regular_times.includes(timestamp_in_week)) {
                    throw new BadRequestError(
                        req.t('errors.booking.manual_book_on_regular')
                    );
                }
            }
        }
        req.body.source = 'student';
        const booking = await BookingController.createBooking(
            req,
            id,
            EnumBookingStatus.CONFIRMED
        ); //pending status

        return new SuccessResponse('success', booking).send(res, req);
    }

    /**
     * @description GET request from student to create a booking for a regular
     *              time that has been registered by teachers but hasn't been
     *              matched with students yet
     * @bodyParam course_id <number> - ID of the course
     * @bodyParam teacher_id <number> - ID of the teacher
     * @bodyParam start_time <number|Date|string> - Start time
     * @bodyParam end_time <number|Date|string> - End time
     * @bodyParam unit_id <number> - ID of the unit
     * @bodyParam student_note <string> - Note of the student about the lesson
     * @returns SuccessResponse with booking details or BadRequestError
     */
    public static async createBookingForTeacherUnmatchedRegularByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        let start_time = req.body.start_time;
        const teacher_id = parseInt(req.body.teacher_id as string);
        const teacher_user = await UserActions.findOne({
            id: teacher_id
        });
        if (!teacher_user) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }
        if (!teacher_user.regular_times) {
            throw new BadRequestError(req.t('errors.teacher.no_calendar'));
        }
        start_time = new Date(start_time).getTime();
        const current_moment = new Date().getTime();
        if (
            start_time - current_moment >=
            MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR
        ) {
            throw new BadRequestError(
                req.t('errors.calendar.invalid_time_regular_unmatch')
            );
        }
        const start_time_in_week = getTimestampInWeek(start_time);
        if (!teacher_user.regular_times.includes(start_time_in_week)) {
            throw new BadRequestError(req.t('errors.teacher.no_calendar'));
        }
        const checked_regular_calendar = await RegularCalendarActions.findOne({
            teacher_id,
            regular_start_time: start_time_in_week,
            status: [
                EnumRegularCalendarStatus.ACTIVE,
                EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                EnumRegularCalendarStatus.EXPIRED
            ]
        });
        if (checked_regular_calendar) {
            throw new BadRequestError(
                req.t(
                    'errors.calendar.regular_booked',
                    req.user.name,
                    teacher_user.full_name
                )
            );
        }
        const calendar_id = await CalendarController.createSchedule(
            req,
            teacher_id
        );
        if (!calendar_id) {
            throw new InternalError(req.t('errors.unknown'));
        }
        req.body.calendar_id = calendar_id;
        await BookingController.createBookingByStudent(req, res);
    }

    /**
     * @description Call whenever there's a status change in a booking
     *              The function contains 3 parts:
     *              - Update the ordered package's number_class accordingly
     *                (this update is only if there's no change in booking order)
     *              - If it's trial booking, update the corresponding
     *                trial booking status
     *              - Notify users about status change
     * @param lesson The old booking record before change
     * @param new_status The new status
     */
    public static async onBookingStatusChange(
        req: ProtectedRequest,
        lesson: Booking,
        new_status: number,
        lesson_change?: Booking
    ) {
        if (lesson.status == new_status) {
            return;
        }

        const cancel_for_student_status = [
            EnumBookingStatus.TEACHER_ABSENT,
            EnumBookingStatus.CHANGE_TIME,
            EnumBookingStatus.CANCEL_BY_STUDENT,
            EnumBookingStatus.CANCEL_BY_TEACHER,
            EnumBookingStatus.CANCEL_BY_ADMIN
        ];

        if (lesson.ordered_package) {
            /**
             * If the status is changed from cancel to non-cancel or non-cancel
             * to cancel, update number_class of the order for student
             */
            if (
                cancel_for_student_status.includes(new_status) &&
                !cancel_for_student_status.includes(lesson.status)
            ) {
                // get ordered_package để lấy lại count lesson mới nhất, để tăng giảm số buổi. Còn "lesson.ordered_package" có thể là data cũ
                const ordered_package = await OrderedPackageActions.findOne({
                    id: lesson.ordered_package_id
                });
                // TODO: order package ko duoc cap nhat => cho nay can fix trong tuong lai khi chay dong thoi
                if (ordered_package) {
                    await OrderedPackageController.learnALessonInOrderedPackage(
                        { ...lesson.toJSON(), status: new_status } as Booking,
                        ordered_package,
                        lesson.student,
                        false,
                        false
                    );
                }
            }
            if (
                cancel_for_student_status.includes(lesson.status) &&
                !cancel_for_student_status.includes(new_status)
            ) {
                // get ordered_package để lấy lại count lesson mới nhất, để tăng giảm số buổi. Còn "lesson.ordered_package" có thể là data cũ
                const ordered_package = await OrderedPackageActions.findOne({
                    id: lesson.ordered_package_id
                });
                // TODO: order package ko duoc cap nhat => cho nay can fix trong tuong lai khi chay dong thoi
                if (ordered_package) {
                    await OrderedPackageController.learnALessonInOrderedPackage(
                        { ...lesson.toJSON(), status: new_status } as Booking,
                        ordered_package,
                        lesson.student,
                        true,
                        false
                    );
                }
            }

            /** Update trial booking status accordingly */
            if (lesson.ordered_package.type == EnumPackageOrderType.TRIAL) {
                const trial_booking = await TrialBookingActions.findOne({
                    booking_id: lesson.id
                });
                /* Don't know why crash app when BadRequestError
                // if (!trial_booking) {
                //     // Don't know why crash app when BadRequestError
                //     // throw new BadRequestError(
                //     //     req.t('errors.trial_booking.not_found')
                //     // )
                // }
                */
                if (trial_booking) {
                    let trial_status = trial_booking.status;
                    switch (new_status) {
                        case EnumBookingStatus.CONFIRMED: {
                            /* fall through */
                        }
                        case EnumBookingStatus.TEACHING: {
                            /* fall through */
                        }
                        case EnumBookingStatus.TEACHER_CONFIRMED: {
                            trial_status =
                                EnumTrialBookingStatus.CREATED_FOR_LEARNING;
                            break;
                        }
                        case EnumBookingStatus.COMPLETED: {
                            trial_status = EnumTrialBookingStatus.SUCCESS;
                            break;
                        }
                        case EnumBookingStatus.STUDENT_ABSENT: {
                            /* fall through */
                        }
                        case EnumBookingStatus.CANCEL_BY_STUDENT: {
                            trial_status =
                                EnumTrialBookingStatus.FAIL_BY_STUDENT;
                            break;
                        }
                        case EnumBookingStatus.TEACHER_ABSENT: {
                            /* fall through */
                        }
                        case EnumBookingStatus.CANCEL_BY_TEACHER: {
                            trial_status =
                                EnumTrialBookingStatus.FAIL_BY_TEACHER;
                            break;
                        }
                        case EnumBookingStatus.CANCEL_BY_ADMIN: {
                            trial_status =
                                EnumTrialBookingStatus.FAIL_BY_TECHNOLOGY;
                            break;
                        }
                        case EnumBookingStatus.CHANGE_TIME: {
                            trial_status = EnumTrialBookingStatus.CHANGE_TIME;
                            break;
                        }
                        default: {
                            /**
                             * Consider all other booking status not allowed for
                             * trial bookings
                             */
                            throw new BadRequestError(
                                req.t('errors.trial_booking.invalid_status')
                            );
                        }
                    }
                    if (trial_status != trial_booking.status) {
                        await TrialBookingController.onTrialBookingStatusChange(
                            trial_booking,
                            trial_status
                        );
                    }
                }
            }
        }

        /**
         * Notify users on status change
         */
        try {
            if (!lesson.ispeak_booking_id) {
                const oldStatus = LESSON_STATUS.find(
                    (s) => s.id == lesson.status
                );
                const newStatus = LESSON_STATUS.find((s) => s.id == new_status);
                const mailPayload = {
                    student_name: `${lesson?.student?.first_name} ${lesson?.student?.last_name}`,
                    teacher_name: `${lesson?.teacher?.first_name} ${lesson?.teacher?.last_name}`,
                    old_status: oldStatus?.name,
                    new_status: newStatus?.name,
                    start_time: lesson.calendar.start_time,
                    teacher_skype: lesson?.teacher?.skype_account,
                    student_skype: lesson?.student?.skype_account,
                    booking_id: lesson.id,
                    student_avatar: lesson?.student?.avatar,
                    teacher_avatar: lesson?.teacher?.avatar,
                    course_name: lesson?.course?.name,
                    course_preview: lesson.course?.image,
                    unit_name: lesson.unit?.name
                };
                const teacherTemplate = await TemplateActions.findOne({
                    code: EmailTemplate.UPDATE_STATUS_BOOKING_FOR_TEACHER
                });
                if (teacherTemplate)
                    JobQueueServices.sendMailWithTemplate({
                        to: lesson.teacher.email,
                        subject: teacherTemplate.title,
                        body: teacherTemplate.content,
                        data: mailPayload
                    });
                const studentTemplate = await TemplateActions.findOne({
                    code: EmailTemplate.UPDATE_STATUS_BOOKING_FOR_STUDENT
                });
                if (studentTemplate) {
                    if(lesson?.student?.is_verified_email === true && lesson?.student?.is_enable_receive_mail){
                        JobQueueServices.sendMailWithTemplate({
                            to: lesson.student.email,
                            subject: studentTemplate.title,
                            body: studentTemplate.content,
                            data: mailPayload
                        });
                    }
                    // Send to Email Exception
                    Promise.all(
                        EMAIL_ADDRESS_EXCEPTION.map(async (item) => {
                            JobQueueServices.sendMailWithTemplate({
                                to: item,
                                subject: studentTemplate.title,
                                body: studentTemplate.content,
                                data: mailPayload
                            });
                        })
                    );
                    //
                }

                const notiTemplate = await TemplateActions.findOne({
                    code: BackEndNotification.UPDATE_STATUS_BOOKING
                });
                if (!notiTemplate) {
                    throw new BadRequestError(
                        req.t('errors.noti_template.not_found')
                    );
                }

                const data = {
                    booking: {
                        id: lesson.id,
                        teacher: {
                            full_name: lesson.teacher.full_name,
                            _id: lesson.teacher.id,
                            id: lesson.teacher.id
                        },
                        student: {
                            full_name: lesson.student.full_name,
                            _id: lesson.student.id,
                            id: lesson.student.id
                        },
                        calendar: {
                            start_time: lesson.calendar.start_time,
                            end_time: lesson.calendar.end_time
                        },
                        old_status: oldStatus,
                        new_status: newStatus,
                        status: new_status,
                        type:
                            lesson.ordered_package.type ===
                            EnumPackageOrderType.TRIAL
                                ? '- Trial'
                                : ''
                    }
                };

                let notiTemplateCs_TNG_Admin: any = notiTemplate;
                let notiTemplate_student: any = {};

                if (new_status === EnumBookingStatus.CANCEL_BY_TEACHER) {
                    notiTemplateCs_TNG_Admin = await TemplateActions.findOne({
                        code: BackEndNotification.UPDATE_STATUS_BOOKING_TEACHER_CANCEL
                    });
                } else if (new_status === EnumBookingStatus.CANCEL_BY_STUDENT) {
                    notiTemplateCs_TNG_Admin = await TemplateActions.findOne({
                        code: BackEndNotification.UPDATE_STATUS_BOOKING_STUDENT_CANCEL
                    });
                    notiTemplate_student = await TemplateActions.findOne({
                        code: BackEndNotification.UPDATE_STATUS_BOOKING_STUDENT_CANCEL_FOR_STUDENT
                    });
                } else if (new_status === EnumBookingStatus.STUDENT_ABSENT) {
                    notiTemplateCs_TNG_Admin = await TemplateActions.findOne({
                        code: BackEndNotification.UPDATE_STATUS_BOOKING_STUDENT_ABSENT
                    });
                    notiTemplate_student = await TemplateActions.findOne({
                        code: BackEndNotification.UPDATE_STATUS_BOOKING_STUDENT_ABSENT_FOR_STUDENT
                    });
                } else if (new_status === EnumBookingStatus.TEACHER_ABSENT) {
                    notiTemplateCs_TNG_Admin = await TemplateActions.findOne({
                        code: BackEndNotification.UPDATE_STATUS_BOOKING_TEACHER_ABSENT
                    });
                }

                if (!notiTemplateCs_TNG_Admin) {
                    throw new BadRequestError(
                        req.t('errors.noti_template.not_found')
                    );
                }

                // thông báo cho admin, học viên, giáo viên
                natsClient.publishEventWithTemplate({
                    template: notiTemplate.content,
                    data,
                    receiver: lesson.teacher_id,
                    template_obj_id: notiTemplate._id
                });
                if (notiTemplate_student) {
                    const data = {
                        booking_id: lesson.id,
                        teacher_name: lesson.teacher.full_name,
                        start_time: lesson.calendar.start_time,
                        old_status: oldStatus?.name
                    };
                    natsClient.publishEventWithTemplate({
                        template: notiTemplate_student.content,
                        data,
                        receiver: lesson.student_id,
                        template_obj_id: notiTemplate_student._id
                    });
                }
                const adminOwner = await AdminActions.findOne({
                    username: 'admin'
                });
                if (adminOwner) {
                    natsClient.publishEventWithTemplate({
                        template: notiTemplateCs_TNG_Admin.content,
                        data,
                        receiver: adminOwner._id,
                        template_obj_id: notiTemplateCs_TNG_Admin._id
                    });
                }
                // thông báo cho học thuật
                if (
                    new_status === EnumBookingStatus.CANCEL_BY_TEACHER ||
                    // new_status === EnumBookingStatus.CANCEL_BY_STUDENT ||
                    new_status === EnumBookingStatus.TEACHER_ABSENT
                ) {
                    let notiTemplateHT: any = null;

                    if (new_status === EnumBookingStatus.CANCEL_BY_TEACHER) {
                        notiTemplateHT = await TemplateActions.findOne({
                            code: BackEndNotification.UPDATE_STATUS_BOOKING_TEACHER_CANCEL
                        });
                    } else if (
                        new_status === EnumBookingStatus.TEACHER_ABSENT
                    ) {
                        notiTemplateHT = await TemplateActions.findOne({
                            code: BackEndNotification.UPDATE_STATUS_BOOKING_TEACHER_ABSENT
                        });
                    }

                    if (!notiTemplateHT) {
                        throw new BadRequestError(
                            req.t('errors.noti_template.not_found')
                        );
                    }

                    const operationIssue = await OperationIssueActions.create({
                        booking_id: lesson.id,
                        issue_description: `Changed from ${oldStatus?.name} to ${newStatus?.name}`,
                        resolved_staff_id: null
                    } as any);
                    const operationIssueId = operationIssue?._id;

                    // thông báo cho trưởng phòng - phó nhóm
                    const hocThuatDepartment = await DepartmentModel.findOne({
                        unsignedName: CODE_DEPARTMENT.HOC_THUAT
                    });
                    if (hocThuatDepartment) {
                        const managerHocThuat = await AdminModel.findOne({
                            department: {
                                department: hocThuatDepartment._id,
                                isRole: EnumRole.Manager
                            }
                        });
                        if (managerHocThuat) {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplateHT.content,
                                data,
                                receiver: managerHocThuat._id,
                                template_obj_id: notiTemplateHT._id,
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
                                    template: notiTemplateHT.content,
                                    data,
                                    receiver: element._id,
                                    template_obj_id: notiTemplateHT._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        // const listLeader = await AdminModel.find({
                        //     'department.department': hocThuatDepartment._id,
                        //     'department.isRole': EnumRole.Leader
                        // });
                        // if (listLeader.length) {
                        //     listLeader.forEach((element) => {
                        //         natsClient.publishEventWithTemplate({
                        //             template: notiTemplate.content,
                        //             data,
                        //             receiver: element._id
                        //         });
                        //     });
                        // }
                    }
                    // thông báo cho nhân viên quản lý
                    const teacher = (await TeacherModel.findOne({
                        user_id: lesson.teacher_id
                    }).populate('staff')) as any;

                    if (teacher && teacher?.staff) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplateHT.content,
                            data,
                            receiver: teacher.staff._id,
                            template_obj_id: notiTemplateHT._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                }
                // thông báo cho cs
                let operationIssueId: any = null;
                // if (
                //     new_status === EnumBookingStatus.CANCEL_BY_TEACHER ||
                //     new_status === EnumBookingStatus.CANCEL_BY_STUDENT ||
                //     new_status === EnumBookingStatus.STUDENT_ABSENT ||
                //     new_status === EnumBookingStatus.TEACHER_ABSENT ||
                //     (lesson.status === EnumBookingStatus.CONFIRMED &&
                //         new_status === EnumBookingStatus.TEACHING) ||
                //     (lesson.status === EnumBookingStatus.CONFIRMED &&
                //         new_status === EnumBookingStatus.CHANGE_TIME)
                // ) {

                const operationIssue = await OperationIssueActions.create({
                    booking_id: lesson.id,
                    issue_description: `Changed from ${oldStatus?.name} to ${newStatus?.name}`,
                    resolved_staff_id: null
                } as any);
                operationIssueId = operationIssue?._id;

                const cskhDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.CSKH
                });
                if (cskhDepartment) {
                    const managerCskh = await AdminModel.findOne({
                        department: {
                            department: cskhDepartment._id,
                            isRole: EnumRole.Manager
                        }
                    });
                    if (managerCskh) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplateCs_TNG_Admin.content,
                            data,
                            receiver: managerCskh._id,
                            template_obj_id: notiTemplateCs_TNG_Admin._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                    const listDeputy = await AdminModel.find({
                        'department.department': cskhDepartment._id,
                        'department.isRole': EnumRole.Deputy_manager
                    });

                    if (listDeputy.length) {
                        listDeputy.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplateCs_TNG_Admin.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplateCs_TNG_Admin._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                    const listLeader = await AdminModel.find({
                        'department.department': cskhDepartment._id,
                        'department.isRole': EnumRole.Leader
                    });

                    if (listLeader.length) {
                        listLeader.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplateCs_TNG_Admin.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplateCs_TNG_Admin._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                    // thông báo cho nhân viên quản lý
                    const student = await StudentModel.findOne({
                        user_id: lesson.student_id
                    }).populate('staff');
                    const checkExits = listLeader.find(
                        (e) => e.id === student?.staff?.id
                    );
                    if (student && student?.staff && !checkExits) {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplateCs_TNG_Admin.content,
                            data,
                            receiver: student.staff._id,
                            template_obj_id: notiTemplateCs_TNG_Admin._id,
                            operation_issue_id: operationIssueId
                        });
                    }
                }
                // }

                // thông báo cho all nhân viên phòng TNG
                const tngDepartment = await DepartmentModel.findOne({
                    unsignedName: CODE_DEPARTMENT.TNG
                });
                if (tngDepartment) {
                    const allStaffTNG = await AdminModel.find({
                        'department.department': tngDepartment._id
                    });
                    if (allStaffTNG.length) {
                        if (!operationIssueId) {
                            const operationIssue =
                                await OperationIssueActions.create({
                                    booking_id: lesson.id,
                                    issue_description: `Changed from ${oldStatus?.name} to ${newStatus?.name}`,
                                    resolved_staff_id: null
                                } as any);
                            operationIssueId = operationIssue?._id;
                        }

                        allStaffTNG.forEach((element) => {
                            natsClient.publishEventWithTemplate({
                                template: notiTemplateCs_TNG_Admin.content,
                                data,
                                receiver: element._id,
                                template_obj_id: notiTemplateCs_TNG_Admin._id,
                                operation_issue_id: operationIssueId
                            });
                        });
                    }
                }

                // noti cho học viên nhắc đánh giá giáo viên khi completed class
                if (lesson && new_status === EnumBookingStatus.COMPLETED) {
                    const dataSend = {
                        student_name: lesson.student.full_name,
                        start_time: moment(lesson.calendar.start_time).format(
                            'HH:mm DD/MM/YYYY'
                        ),
                        teacher_name: lesson.teacher.full_name
                    };
                    logger.info(
                        'send zalo noti remind teacher evalution: ' +
                            lesson.student_id
                    );
                    natsClient.publishEventZalo(
                        lesson.student,
                        ZaloOANotification.REMIND_TEACHER_EVALUATION_FOR_STUDENT,
                        dataSend
                    );
                }

                //Zalo status booking notication
                try {
                    await natsClient.publishEvent(
                        BackEndNotification.UPDATE_STATUS_BOOKING,
                        {
                            student_id: lesson?.student?.id,
                            student_name: lesson?.student?.full_name,
                            teacher_id: lesson?.teacher?.id,
                            teacher_name: lesson?.teacher?.full_name,
                            course_name: lesson?.course?.name,
                            unit_name: lesson?.unit?.name,
                            old_status: oldStatus?.name,
                            new_status: newStatus?.name,
                            start_time: lesson.calendar.start_time
                        }
                    );
                } catch (e) {}
            }
        } catch (err) {
            // Exception when send notification, This will not cause an error when changing the Booking Status
            logger.error(
                `Send notification when update booking status: ${err}`
            );
        }

        /**
         * Add data to the cs_call_management table when the lesson is done
         */
        if (
            (new_status == EnumBookingStatus.COMPLETED ||
                new_status == EnumBookingStatus.STUDENT_ABSENT) &&
            ((!lesson_change &&
                lesson.ordered_package.type != EnumPackageOrderType.TRIAL) ||
                (lesson_change &&
                    lesson_change.ordered_package &&
                    lesson.ordered_package.type != EnumPackageOrderType.TRIAL))
        ) {
            logger.info(`start check insert cs call management`);
            try {
                await CsCallManagementController.insertCsCallManagement(
                    lesson,
                    lesson_change,
                    new_status
                );
            } catch (err) {
                logger.error(
                    `Add data to the cs_call_management table when the lesson is done, err: ${err}`
                );
            }
        }
    }

    /*
     * Summary: chinh sua 1 booking
     * Request type: PUT/POST
     * Parameters: - id              :     : ma id cua buoi hoc
     *             - unit_id         : body: ma id cua khoa hoc
     *             - status          : body: trang thai cua buoi hoc
     *             - reason          : body: ly do nghi hoc/day hoac huy buoi hoc
     *             - student_note    : body: Note cua hoc vien ve buoi hoc
     *             - teacher_note    : body: Note cua giao vien ve buoi hoc
     *             - admin_note      : body: Note cua admin ve buoi hoc
     * Response: - 200: OK, chinh sua thanh cong
     *           - 400: Bad Request
     */
    public static async editBooking(req: ProtectedRequest, id: number) {
        const {
            course_id,
            ordered_package_id,
            unit_id,
            status,
            reason,
            student_note,
            teacher_note,
            admin_note,
            started_at,
            best_memo,
            finished_at,
            reported_absence_at,
            cskh_note,
            record_link,
            requester
        } = req.body;
        let course;
        let ordered_package;
        let unit;
        const arrStatusBeforeCompletion = [
            EnumBookingStatus.PENDING,
            EnumBookingStatus.CONFIRMED,
            EnumBookingStatus.TEACHING
        ];

        const booking = await BookingActions.findOne({ id });
        if (!booking)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'BookingModel',
            booking,
            pickUpData
        );
        let testTopicId = booking?.test_topic_id || null;
        let testTopicName = booking?.test_topic_name || '';
        // neu new status = student absent do cs change thì check time server giong page hv
        const checkStatus = parseInt(status as string);
        const teacherData = await TeacherActions.findOne({
            user_id: booking.teacher_id
        });
        const cancelTime = teacherData?.location?.cancel_time ?? 180;
        if (
            [
                EnumBookingStatus.STUDENT_ABSENT,
                EnumBookingStatus.CANCEL_BY_STUDENT
            ].includes(checkStatus)
        ) {
            const csDepartment = await DepartmentActions.findOne({
                filter: {
                    unsignedName: CODE_DEPARTMENT.CSKH
                }
            });
            const tngDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.TNG
            });

            // neu là nhân viên cs(không phải trưởng phòng, phó phòng) hoặc là tng
            if (
                req.user.username !== 'admin' &&
                req.user.department.isRole !== EnumRole.Manager &&
                req.user.department.isRole !== EnumRole.Deputy_manager &&
                (req.user.department.id == csDepartment?.id ||
                    req.user.department.id == tngDepartment?.id)
            ) {
                const currentTime = moment().valueOf();
                const minute =
                    (booking.calendar.start_time - currentTime) / MINUTE_TO_MS;
                if (
                    checkStatus == EnumBookingStatus.CANCEL_BY_STUDENT &&
                    (![
                        EnumBookingStatus.PENDING,
                        EnumBookingStatus.CONFIRMED
                    ].includes(booking.status) ||
                        moment(booking.calendar.start_time) <= moment() ||
                        minute < cancelTime)
                ) {
                    throw new BadRequestError(
                        req.t(
                            'errors.booking.condition_cs_change_status_cancel_by_student'
                        )
                    );
                }
                if (
                    checkStatus == EnumBookingStatus.STUDENT_ABSENT &&
                    (![
                        EnumBookingStatus.PENDING,
                        EnumBookingStatus.CONFIRMED
                    ].includes(booking.status) ||
                        moment(booking.calendar.start_time) <= moment() ||
                        minute >= cancelTime)
                ) {
                    throw new BadRequestError(
                        req.t(
                            'errors.booking.condition_cs_change_status_student_absent'
                        )
                    );
                }
            }
        }
        const newStatus = checkStatus ?? booking.status;
        const orderedPackageId = ordered_package_id
            ? parseInt(ordered_package_id as string)
            : booking.ordered_package_id;

        let admin_unit_lock = booking.admin_unit_lock;
        let is_regular_booking = booking.is_regular_booking;

        if (req.user && req.body.hasOwnProperty('admin_unit_lock')) {
            admin_unit_lock = !!req.body.admin_unit_lock;
        }
        if (req.user && req.body.hasOwnProperty('is_regular_booking')) {
            is_regular_booking = !!req.body.is_regular_booking;
        }

        const teacherUser = await UserActions.findOne({
            id: booking.teacher_id
        });
        const teacher = await TeacherActions.findOne({
            user_id: booking.teacher_id
        });
        if (!teacher || !teacherUser)
            throw new BadRequestError(req.t('errors.teacher.not_found'));

        if (!teacherUser.is_active) {
            throw new BadRequestError(req.t('errors.teacher.inactive'));
        }

        if (
            booking.status == EnumBookingStatus.COMPLETED &&
            (!teacher.total_lesson || teacher.total_lesson < 0)
        ) {
            /*
             * Something is wrong here, a completed booking means that the
             * teacher has at least taught 1 lesson
             */
            throw new InternalError(
                req.t('errors.booking.teacher_info_not_matched')
            );
        }

        if (course_id && course_id != booking.course_id) {
            course = await CourseActions.findOne({
                id: parseInt(course_id as string)
            });
            if (!course)
                throw new BadRequestError(req.t('errors.course.not_found'));
        } else {
            course = booking.course;
        }
        if (!course.is_active) {
            throw new BadRequestError(req.t('errors.course.inactive'));
        }
        if (
            ordered_package_id &&
            ordered_package_id != booking.ordered_package_id
        ) {
            ordered_package = await OrderedPackageActions.findOne({
                id: ordered_package_id,
                user_id: booking.student_id,
                type: booking.ordered_package.type,
                number_class: { $gt: 0 }
            });
            if (!ordered_package || !ordered_package.activation_date) {
                throw new BadRequestError(req.t('errors.order.unavailable'));
            }
            if (ordered_package.paid_number_class) {
                /** Student just paid a part of the package */
                if (
                    ordered_package.number_class +
                        ordered_package.paid_number_class <=
                    ordered_package.original_number_class
                ) {
                    throw new BadRequestError(
                        req.t('errors.order.unavailable')
                    );
                }
            }
            const current_moment = new Date().getTime();
            if (
                ordered_package.activation_date +
                    ordered_package.day_of_use * DAY_TO_MS <
                current_moment
            ) {
                throw new BadRequestError(req.t('errors.order.unavailable'));
            }
        } else {
            ordered_package = booking.ordered_package;
        }

        if (unit_id && unit_id != booking.unit_id) {
            unit = await UnitActions.findOne({
                id: parseInt(unit_id as string)
            });
            if (!unit)
                throw new BadRequestError(req.t('errors.unit.not_found'));

            if (arrStatusBeforeCompletion.includes(newStatus)) {
                const orderTrials = await OrderedPackageActions.findAll({
                    type: [EnumPackageOrderType.TRIAL]
                });
                const package_ids = orderTrials.map((e) => e.id);

                if (package_ids.includes(orderedPackageId)) {
                    const testResultExists =
                        await BookingController.checkTestResultTrialTest(
                            booking
                        );
                    if (testResultExists) {
                        throw new BadRequestError(
                            req.t(
                                'errors.unit.test_has_been_completed_unit_cannot_be_changed'
                            )
                        );
                    }

                    if (unit.test_topic_id) {
                        testTopicId = unit.test_topic_id;
                    }
                    if (unit.test_topic?.topic) {
                        testTopicName = unit.test_topic.topic;
                    }
                }
            }
        } else {
            unit = booking.unit;
        }
        if (!unit.is_active) {
            throw new BadRequestError(req.t('errors.unit.inactive'));
        }

        if (status && status != booking.status) {
            if (status == EnumBookingStatus.COMPLETED) {
                if (booking.calendar.start_time > new Date().getTime()) {
                    throw new BadRequestError(
                        req.t('errors.booking.not_started')
                    );
                }
            }
            if (
                status == EnumBookingStatus.PENDING ||
                status == EnumBookingStatus.CONFIRMED
            ) {
                // thêm điều kiện check ko phải booking của lớp học IELTS
                if (
                    booking.calendar.start_time < new Date().getTime() &&
                    booking.teacher_id !== IELTS_TEACHER_FAKE_ID
                ) {
                    throw new BadRequestError(
                        req.t('errors.booking.started_cant_confirm')
                    );
                }
                const existsBooking = await BookingActions.findOne({
                    'calendar.start_time': booking.calendar.start_time,
                    status: [
                        EnumBookingStatus.PENDING,
                        EnumBookingStatus.CONFIRMED
                    ],
                    $or: [
                        {
                            student_id: booking.student_id
                        },
                        {
                            teacher_id: booking.teacher_id
                        }
                    ]
                });
                // thêm điều kiện check ko phải booking của lớp học IELTS
                if (
                    existsBooking &&
                    booking.teacher_id !== IELTS_TEACHER_FAKE_ID
                ) {
                    throw new BadRequestError(
                        req.t(
                            'errors.booking.booked',
                            existsBooking.id,
                            existsBooking.student.full_name,
                            existsBooking.teacher.full_name
                        )
                    );
                }
            }

            /* Absent or cancel status requires a reason */
            if (
                status >= EnumBookingStatus.STUDENT_ABSENT &&
                status <= EnumBookingStatus.CANCEL_BY_ADMIN
            ) {
                if (!reason)
                    throw new BadRequestError(
                        req.t('errors.booking.empty_reason')
                    );

                if (
                    status == EnumBookingStatus.STUDENT_ABSENT ||
                    status == EnumBookingStatus.CANCEL_BY_STUDENT ||
                    status == EnumBookingStatus.TEACHER_ABSENT
                ) {
                    if (!booking.reported_absence_at && reported_absence_at) {
                        throw new BadRequestError(
                            req.t('errors.booking.need_absence_time')
                        );
                    }
                }
            }
            if (
                status == EnumBookingStatus.CANCEL_BY_TEACHER &&
                booking.calendar.start_time > new Date().getTime()
            ) {
                logger.info(
                    'check create leave request gv when admin change status cancel by teacher'
                );
                const startTimeAbsent = booking.calendar.start_time;
                const endTimeAbsent = booking.calendar.end_time;
                const check_request_filter = {
                    teacher_id: booking.teacher_id,
                    start_time: { $lte: startTimeAbsent },
                    end_time: { $gte: endTimeAbsent },
                    status: [
                        EnumTeacherAbsentRequestStatus.PENDING,
                        EnumTeacherAbsentRequestStatus.APPROVED
                    ]
                };
                const check_request = await TeacherAbsentRequestActions.findOne(
                    check_request_filter
                );
                const teacherAbsent = await TeacherActions.findOne({
                    user_id: booking.teacher_id
                });
                if (!check_request && teacher) {
                    logger.info('create leave request gv');
                    const counter = await CounterActions.findOne();
                    const id = counter.teacher_absent_request_id;
                    const requestAbsentData = {
                        id,
                        teacher_id: booking.teacher_id,
                        status: EnumTeacherAbsentRequestStatus.APPROVED,
                        start_time: startTimeAbsent,
                        end_time: endTimeAbsent,
                        teacher: teacherAbsent,
                        teacher_note: '',
                        list_regular_absent: [] as any,
                        creator_type: EnumCreatorType.SYSTEM
                    };
                    await TeacherAbsentRequestActions.create(
                        requestAbsentData as TeacherAbsentRequest
                    );
                } else {
                    logger.info('leave request is exists');
                }
            }
        }

        if (finished_at && reported_absence_at) {
            throw new BadRequestError(
                req.t('errors.booking.finish_but_absence')
            );
        }

        // Validate only 3 best memo each day
        if (_.isBoolean(best_memo) && best_memo === true) {
            const countBestMemo = await BookingActions.findAllAndPaginated({
                best_memo: true,
                min_start_time: moment(booking.calendar.start_time)
                    .startOf('day')
                    .valueOf(),
                max_end_time: moment(booking.calendar.start_time)
                    .endOf('day')
                    .valueOf()
            });
            if (countBestMemo.length >= MAX_BEST_MEMO_EACH_DAY)
                throw new BadRequestError(
                    req.t('errors.booking.reach_limited_best_memo')
                );
        }
        let newRecordLink = [];
        if (record_link) {
            if (typeof record_link === 'string') {
                newRecordLink.push(record_link);
            } else {
                newRecordLink = record_link;
            }
        }

        const booking_change = {
            course_id: course_id
                ? parseInt(course_id as string)
                : booking.course_id,
            ordered_package_id: ordered_package_id
                ? parseInt(ordered_package_id as string)
                : booking.ordered_package_id,
            unit_id: unit_id ? parseInt(unit_id as string) : booking.unit_id,
            reason:
                status >= EnumBookingStatus.STUDENT_ABSENT &&
                status <= EnumBookingStatus.CANCEL_BY_ADMIN
                    ? reason
                    : '',
            status: status ? parseInt(status as string) : booking.status,
            student_note: student_note
                ? student_note.toString()
                : booking.student_note,
            teacher_note: teacher_note
                ? teacher_note.toString()
                : booking.teacher_note,
            admin_note: admin_note ? admin_note.toString() : booking.admin_note,
            cskh_note: cskh_note ? cskh_note.toString() : booking.cskh_note,
            started_at: started_at
                ? parseInt(started_at as string)
                : booking.started_at,
            finished_at: finished_at
                ? parseInt(finished_at as string)
                : booking.finished_at,
            reported_absence_at: reported_absence_at
                ? reported_absence_at
                : booking.reported_absence_at,
            admin_unit_lock,
            best_memo,
            is_regular_booking,
            record_link: record_link ? newRecordLink : booking.record_link,
            course,
            ordered_package,
            unit,
            test_topic_id: testTopicId,
            test_topic_name: testTopicName
        };

        /*
         * After the booking status has been updated, check if it's complete
         * teaching to update teacher info
         */

        if (booking_change.status != booking.status) {
            await BookingController.onBookingStatusChange(
                req,
                booking,
                booking_change.status,
                booking_change as Booking
            );
            let total_lesson = teacher.total_lesson || 0;
            let total_lesson_this_level = teacher.total_lesson_this_level || 0;
            let total_lesson_english_plus =
                teacher.total_lesson_english_plus || 0;
            if (status == EnumBookingStatus.COMPLETED) {
                total_lesson++;
                total_lesson_this_level++;
            } else {
                if (booking.status == EnumBookingStatus.COMPLETED) {
                    total_lesson_english_plus--;
                    total_lesson--;
                    total_lesson_this_level--;
                }
            }
            await TeacherActions.update(teacher._id, {
                total_lesson_english_plus,
                total_lesson,
                total_lesson_this_level
            } as Teacher);
        }
        const newBooking = await BookingActions.update(
            booking._id,
            booking_change as Booking
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'BookingModel',
            newBooking,
            pickUpData
        );

        // Xử lý khi Hệ thống book
        if (requester == 'cronjob' && unit_id != booking.unit_id) {
            const teacherUserInformation = await UserActions.findOne({
                id: booking.teacher_id
            });
            const templatePayload = {
                student_name: `${booking.student?.full_name} - ${booking.student?.username}`,
                teacher_name: `${teacherUserInformation?.full_name} - ${teacherUserInformation?.username}`,
                course_name: course.name,
                unit_name: unit.name,
                start_time: booking.calendar.start_time,
                teacher_avatar: teacherUserInformation?.avatar as string,
                join_url: '',
                course_preview: course?.image as string,
                teacher_skype: teacherUserInformation?.skype_account as string,
                student_skype: booking.student?.skype_account as string,
                student_avatar: booking.student?.avatar as string
            };

            const lastUnitOfCourse = await UnitModel.findOne({
                course_id: Number(course_id),
                is_active: true
            }).sort({ display_order: -1 });

            if (lastUnitOfCourse?.id == unit.id) {
                let issueDescription = 'Last unit of course';
                let notiCsTemplate: any = null;

                // Khi hệ thống book vào unit cuối cùng của course cuối cùng thì notify (ko phải hệ thống book thì ko gửi)
                const listCourses = await CourseActions.findAll(
                    {
                        curriculum_id: course.curriculum_id
                    },
                    {
                        display_order: 1,
                        id: 1
                    },
                    { id: 1, display_order: 1 }
                );
                const index = listCourses.findIndex(
                    (e) => e.id === Number(course_id)
                );
                let nextCourse = null;
                if (index !== -1 && index + 1 < listCourses.length) {
                    nextCourse = listCourses[index + 1];
                }

                if (!nextCourse) {
                    notiCsTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.FINISH_CURRICULUM
                    });
                    issueDescription = 'Last unit of last course';
                } else {
                    // Khi hệ thống book vào unit cuối cùng của course thì notify (ko phải hệ thống book thì ko gửi)
                    notiCsTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.NEXT_COURSE
                    });
                }

                if (notiCsTemplate) {
                    // Thông báo cho admin
                    const adminOwner = await AdminActions.findOne({
                        username: 'admin'
                    });
                    if (adminOwner) {
                        natsClient.publishEventWithTemplate({
                            template: notiCsTemplate.content,
                            data: templatePayload,
                            receiver: adminOwner._id,
                            template_obj_id: notiCsTemplate._id
                        });
                    }

                    // thông báo cho cs
                    const operationIssue = await OperationIssueActions.create({
                        booking_id: booking.id,
                        issue_description: issueDescription,
                        resolved_staff_id: null
                    } as any);
                    const operationIssueId = operationIssue?._id;

                    const cskhDepartment = await DepartmentModel.findOne({
                        unsignedName: CODE_DEPARTMENT.CSKH
                    });
                    if (cskhDepartment) {
                        const managerCskh = await AdminModel.findOne({
                            department: {
                                department: cskhDepartment._id,
                                isRole: EnumRole.Manager
                            }
                        });
                        if (managerCskh) {
                            natsClient.publishEventWithTemplate({
                                template: notiCsTemplate.content,
                                data: templatePayload,
                                receiver: managerCskh._id,
                                template_obj_id: notiCsTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        }
                        const listDeputy = await AdminModel.find({
                            'department.department': cskhDepartment._id,
                            'department.isRole': EnumRole.Deputy_manager
                        });

                        if (listDeputy.length) {
                            listDeputy.forEach((element) => {
                                natsClient.publishEventWithTemplate({
                                    template: notiCsTemplate.content,
                                    data: templatePayload,
                                    receiver: element._id,
                                    template_obj_id: notiCsTemplate._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        const listLeader = await AdminModel.find({
                            'department.department': cskhDepartment._id,
                            'department.isRole': EnumRole.Leader
                        });

                        if (listLeader.length) {
                            listLeader.forEach((element) => {
                                natsClient.publishEventWithTemplate({
                                    template: notiCsTemplate.content,
                                    data: templatePayload,
                                    receiver: element._id,
                                    template_obj_id: notiCsTemplate._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        // thông báo cho nhân viên quản lý
                        const student = await StudentModel.findOne({
                            user_id: booking.student_id
                        }).populate('staff');
                        const checkExits = listLeader.find(
                            (e) => e.id === student?.staff?.id
                        );
                        if (student && student?.staff && !checkExits) {
                            natsClient.publishEventWithTemplate({
                                template: notiCsTemplate.content,
                                data: templatePayload,
                                receiver: student.staff._id,
                                template_obj_id: notiCsTemplate._id,
                                operation_issue_id: operationIssueId
                            });
                        }
                    }
                }
            }
        }

        if (booking_change.status == EnumBookingStatus.COMPLETED) {
            await BookingController.checkForEndOfCourse(
                req,
                booking.student_id,
                booking_change.course_id
            );
        }

        return { message: 'Success' };
    }

    public static async studentAbsentByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id, reason } = req.body;
        const status = EnumBookingStatus.STUDENT_ABSENT;

        const booking = await BookingActions.findOne({ id });
        if (!booking)
            throw new BadRequestError(req.t('errors.booking.not_found'));

        if (booking.status !== EnumBookingStatus.TEACHING) {
            throw new BadRequestError(req.t('errors.booking.invalid_status'));
        }

        if (!reason)
            throw new BadRequestError(req.t('errors.booking.empty_reason'));

        await BookingController.onBookingStatusChange(req, booking, status);
        booking.status = status;
        booking.reason = reason;
        await booking.save();
        new SuccessResponse('success', booking).send(res, req);
    }

    /*
     * Summary: Admin chinh sua 1 booking
     * Request type: PUT
     * Role: Admin
     * Parameters: - booking_id  : params: ma id cua buoi hoc
     *             - unit_id     : body  : ma id cua khoa hoc
     *             - status      : body  : trang thai cua buoi hoc
     *             - reason      : body  : ly do nghi hoc/day hoac huy buoi hoc
     *             - student_note: body  : Note cua hoc vien ve buoi hoc
     *             - teacher_note: body  : Note cua giao vien ve buoi hoc
     *             - admin_note  : body  : Note cua admin ve buoi hoc
     * Response: - 200: OK, chinh sua thanh cong
     *           - 400: Bad Request
     */
    public static async editBookingByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { booking_id } = req.params;
        const message = await BookingController.editBooking(
            req,
            parseInt(booking_id as string)
        );
        new SuccessResponse('success', message).send(res, req);
    }

    public static async editBookingTimeByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { booking_id } = req.params;
        const start_time = req.body.date;
        const teacher_id = req.body.teacher;
        const end_time = start_time + 30 * MINUTE_TO_MS;
        const booking = await BookingActions.findOne({ _id: booking_id });
        if (!booking)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'BookingModel',
            booking,
            pickUpData
        );
        const teacherNew = await UserActions.findOne({
            id: parseInt(teacher_id as string),
            is_active: true
        });
        if (!teacherNew) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }
        if (
            teacher_id &&
            booking.ordered_package &&
            booking.ordered_package.type == EnumPackageOrderType.TRIAL
        ) {
            const trial_profile = await TrialTeacherActions.findOne({
                teacher_id: parseInt(teacher_id as string)
            });
            if (!trial_profile) {
                throw new BadRequestError(
                    req.t('errors.trial_teacher.not_found')
                );
            }
        }

        // check điều kiện được change time theo giờ quy định của hệ thống
        const checkStatus = parseInt(booking.status as unknown as string);
        // const teacherData = await TeacherActions.findOne({
        //     user_id: booking.teacher_id
        // });
        // 15-6 fix cứng lại thời gian change time là 100 phút trước giờ học
        const cancelTime = 80;
        if (
            [
                EnumBookingStatus.CONFIRMED,
                EnumBookingStatus.STUDENT_ABSENT,
                EnumBookingStatus.TEACHER_ABSENT,
                EnumBookingStatus.COMPLETED
            ].includes(checkStatus)
        ) {
            const csDepartment = await DepartmentActions.findOne({
                filter: {
                    unsignedName: CODE_DEPARTMENT.CSKH
                }
            });
            const tngDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.TNG
            });

            // nếu là nhân viên cs hoặc là tng
            if (
                req.user.username !== 'admin' &&
                req.user.department.isRole !== EnumRole.Manager &&
                req.user.department.isRole !== EnumRole.Deputy_manager &&
                (req.user.department.id == csDepartment?.id ||
                    req.user.department.id == tngDepartment?.id)
            ) {
                const currentTime = moment().valueOf();
                const minute =
                    (booking.calendar.start_time - currentTime) / MINUTE_TO_MS;

                if (
                    checkStatus == EnumBookingStatus.CONFIRMED &&
                    minute < cancelTime
                ) {
                    throw new BadRequestError(
                        req.t('errors.change_time_booking.need_to_be_earlier')
                    );
                } else if (
                    [
                        EnumBookingStatus.STUDENT_ABSENT,
                        EnumBookingStatus.TEACHER_ABSENT,
                        EnumBookingStatus.COMPLETED
                    ].includes(checkStatus)
                ) {
                    throw new BadRequestError(
                        req.t('errors.change_time_booking.status_valid')
                    );
                }
            }
        }
        const otherBooking = await BookingActions.findOne({
            student_id: booking.student_id,
            'calendar.start_time': Number(start_time),
            status: {
                $nin: [
                    EnumBookingStatus.CHANGE_TIME,
                    EnumBookingStatus.TEACHER_ABSENT,
                    EnumBookingStatus.CANCEL_BY_TEACHER
                ]
            }
        });

        if (otherBooking && booking.id !== otherBooking.id) {
            throw new BadRequestError(
                req.t(
                    'errors.calendar.booked',
                    otherBooking.id,
                    otherBooking.student.full_name,
                    otherBooking.teacher.full_name
                )
            );
        }

        //tạo booking mới
        let calendar_id = null;
        let calendar = await CalendarActions.findOne({
            teacher_id: teacher_id,
            start_time,
            is_active: true
        });
        if (!calendar) {
            // create new calendar
            const counter = await CounterActions.findOne({});
            const id = counter.calendar_id;
            req.body.start_time = start_time;
            req.body.end_time = end_time;
            calendar = await CalendarActions.create({
                id,
                teacher_id: teacher_id,
                start_time,
                end_time,
                is_active: true
            } as any);
        }
        calendar_id = calendar.id;
        req.body = {
            student_id: booking.student_id,
            course_id: booking.course_id,
            ordered_package_id: booking.ordered_package_id,
            unit_id: booking.unit_id,
            teacher_id: teacher_id,
            start_time: start_time,
            status: EnumBookingStatus.CONFIRMED
        };
        if (teacher_id !== booking.teacher_id) {
            req.body.substitute_for_teacher_id = booking.teacher_id;
        }
        req.body.calendar_id = calendar_id;
        req.body.source = 'admin';
        logger.info(
            `change time create new booking- student id: ${booking.student_id}`
        );
        const newBooking = await BookingController.createBooking(
            req,
            booking.student_id,
            EnumBookingStatus.CONFIRMED,
            {
                accept_time: true
            },
            booking
        );
        if (
            newBooking &&
            booking.ordered_package &&
            booking.ordered_package.type == EnumPackageOrderType.TRIAL
        ) {
            logger.info(`change time create new trial booking `);
            const new_trial_booking = {
                booking_id: newBooking.id,
                status: EnumTrialBookingStatus.CREATED_FOR_LEARNING,
                booking: newBooking,
                created_time: new Date(),
                updated_time: new Date()
            };
            await TrialBookingActions.create({
                ...new_trial_booking
            } as TrialBooking);
        }
        if (newBooking) {
            logger.info(`change time create new booking - id:${newBooking.id}`);
            await BookingController.onBookingStatusChange(
                req,
                booking,
                EnumBookingStatus.CHANGE_TIME
            );
            booking.status = EnumBookingStatus.CHANGE_TIME;
            await booking.save();
        } else {
            logger.info(`change time create new booking failed`);
            throw new BadRequestError(
                req.t('errors.booking.change_time_faild')
            );
        }

        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'BookingModel',
            booking,
            pickUpData
        );
        new SuccessResponse('success', booking).send(res, req);
    }

    /*
     * Summary: Giao vien bat dau buoi hoc truc tuyen qua zoom
     * Request type: POST
     * Role: Teacher
     * Parameters: - booking_id: params: ma id cua buoi hoc
     *             - password  : body  : mat khau cho zoom meeting
     * Response: 200: OK, tao meeting zoom, tra ve zoom id va url de join
     *           400: Bad Request
     */
    public static async startLessonByTeacherForThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { booking_id } = req.params;

        const { learning_medium } = req.body;

        const lesson = await BookingActions.findOne({
            id: parseInt(booking_id),
            teacher_id: id
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        const clone_lesson = {
            ...lesson.toJSON()
        };
        if (learning_medium) {
            if (
                Object.values(EnumBookingMediumType).includes(learning_medium)
            ) {
                if (lesson.learning_medium) {
                    clone_lesson.learning_medium.medium_type = learning_medium;
                } else {
                    clone_lesson.learning_medium = {
                        medium_type: learning_medium
                    };
                }
            }
        }
        const started_at = new Date().getTime();

        if (started_at < lesson.calendar.start_time) {
            const sub_time = lesson.calendar.start_time - started_at;
            if (sub_time > 10 * MINUTE_TO_MS) {
                throw new BadRequestError(req.t('errors.booking.start_early'));
            }
        } else {
            if (started_at > lesson.calendar.end_time) {
                throw new BadRequestError(req.t('errors.booking.start_late'));
            }
        }

        let join_url: any = '';
        let link_HMP_type = null;
        if (
            clone_lesson?.learning_medium?.medium_type ===
            EnumBookingMediumType.HAMIA_MEET
        ) {
            link_HMP_type = linkHMPType.TEACHER;
            if (
                !clone_lesson?.learning_medium?.info?.teacher_link &&
                !clone_lesson.is_show_hmp
            ) {
                clone_lesson.learning_medium = {
                    medium_type: EnumBookingMediumType.SKYPE
                };
            }
        }

        join_url = await BookingController.generateBookingJoinUrl(
            req,
            clone_lesson as Booking,
            link_HMP_type
        );

        await BookingController.onBookingStatusChange(
            req,
            lesson,
            EnumBookingStatus.TEACHING
        );

        await BookingActions.update(lesson._id, {
            status: EnumBookingStatus.TEACHING,
            started_at
        } as Booking);

        const res_payload = {
            join_url
        };

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async joinClassByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { booking_id } = req.params;

        const lesson = await BookingActions.findOne({
            id: parseInt(booking_id),
            student_id: id
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        if (
            !lesson.learning_medium ||
            (lesson.learning_medium?.medium_type ==
                EnumBookingMediumType.HAMIA_MEET &&
                !lesson?.learning_medium?.info?.teacher_link &&
                !lesson.is_show_hmp)
        ) {
            lesson.learning_medium = {
                medium_type: EnumBookingMediumType.SKYPE
            };
        }
        const join_url = await BookingController.generateBookingJoinUrl(
            req,
            lesson
        );
        const res_payload = {
            join_url
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async openClassMeetingByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { booking_id } = req.params;
        const { learning_medium } = req.body;

        const lesson = await BookingActions.findOne({
            id: parseInt(booking_id)
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        const clone_lesson = {
            ...lesson.toJSON()
        };
        if (learning_medium) {
            if (
                Object.values(EnumBookingMediumType).includes(learning_medium)
            ) {
                if (lesson.learning_medium) {
                    clone_lesson.learning_medium.medium_type = learning_medium;
                } else {
                    clone_lesson.learning_medium = {
                        medium_type: learning_medium
                    };
                }
            }
        }
        let link_HMP_type = null;
        if (
            clone_lesson?.learning_medium?.medium_type ===
            EnumBookingMediumType.HAMIA_MEET
        ) {
            link_HMP_type = linkHMPType.STUDENT;
            if (
                !clone_lesson?.learning_medium?.info?.teacher_link &&
                !clone_lesson.is_show_hmp
            ) {
                clone_lesson.learning_medium = {
                    medium_type: EnumBookingMediumType.SKYPE
                };
            }
        }

        const join_url = await BookingController.generateBookingJoinUrl(
            req,
            clone_lesson as Booking,
            link_HMP_type
        );
        const res_payload = {
            join_url
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /*
     * Summary: Giao vien note lai ve buoi hoc
     * Request type: PUT
     * Role: Teacher
     * Parameters: - booking_id : params: ma id cua buoi hoc
     *             - admin_note : body  : Note cua admin ve buoi hoc
     * Response: - 200: OK, note thanh cong
     *           - 400: Bad Request
     */
    public static async setBookingNoteByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { booking_id } = req.params;
        if (!req.body.hasOwnProperty('teacher_note')) {
            throw new BadRequestError(req.t('errors.booking.no_teacher_note'));
        }
        if (Object.keys(req.body).length > 1) {
            throw new BadRequestError(req.t('errors.booking.note_only'));
        }
        const message = await BookingController.editBooking(
            req,
            parseInt(booking_id as string)
        );
        new SuccessResponse('success', message).send(res, req);
    }

    /* User changes status */
    /*
     * Summary: Hoc vien chinh lai trang thai booking: bao nghi hoac huy buoi hoc
     *          Neu bao truoc thoi han thi se duoc tinh la bao nghi va khong bi tru tien
     *          Neu bao sau thoi han se bi tinh la bao huy va bi tru tien
     * Request type: PUT
     * Role: Student
     * Parameters: <None>
     * Response: - 200, OK, chinh trang thai thanh cong
     *           - 400: Bad request
     */
    public static async absentOrCancelLessonByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { lesson_id } = req.params;
        const { reason, new_calendar_id } = req.body;
        const lesson = await BookingActions.findOne({
            student_id: id,
            id: parseInt(lesson_id as string)
        });
        if (!lesson)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        if (!reason)
            throw new BadRequestError(req.t('errors.booking.empty_reason'));
        if (lesson.status === EnumBookingStatus.COMPLETED) {
            throw new BadRequestError(req.t('errors.booking.completed'));
        }
        const cancelStatus = [
            EnumBookingStatus.STUDENT_ABSENT,
            EnumBookingStatus.TEACHER_ABSENT,
            EnumBookingStatus.CHANGE_TIME,
            EnumBookingStatus.CANCEL_BY_STUDENT,
            EnumBookingStatus.CANCEL_BY_TEACHER,
            EnumBookingStatus.CANCEL_BY_ADMIN
        ];
        if (cancelStatus.includes(lesson.status))
            throw new BadRequestError(req.t('errors.booking.absent_or_cancel'));
        const teacher = await TeacherActions.findOne({
            user_id: lesson.teacher_id
        });
        if (!teacher) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }
        if (!teacher.location.cancel_time) teacher.location.cancel_time = 0;
        let status;
        let message = '';
        if (!lesson.calendar) {
            throw new InternalError(req.t('errors.calendar.not_found'));
        }

        const minutes =
            (lesson.calendar.start_time - new Date().getTime()) / MINUTE_TO_MS;
        if (minutes < teacher.location.cancel_time) {
            status = EnumBookingStatus.STUDENT_ABSENT; /* Absent by student */
            message = 'Student reported absent successfully';
        } else {
            status = EnumBookingStatus.CANCEL_BY_STUDENT;
            message = 'Student canceled lesson successfully';
        }
        await BookingController.onBookingStatusChange(req, lesson, status);
        await BookingActions.update(lesson._id, {
            reported_absence_at: new Date().getTime(),
            reason,
            status
        } as Booking);
        const res_payload: any = {};
        res_payload.message = message;

        new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Teacher change status of a booked lesson
     */
    public static async absentLessonByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { reason, lesson_id } = req.body;
        const lesson = await BookingActions.findOne({
            teacher_id: id,
            id: lesson_id
        });
        if (!lesson)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        if (!reason)
            throw new BadRequestError(req.t('errors.booking.empty_reason'));
        if (lesson.status === EnumBookingStatus.COMPLETED) {
            throw new BadRequestError(req.t('errors.booking.completed'));
        }
        const cancelStatus = [
            EnumBookingStatus.STUDENT_ABSENT,
            EnumBookingStatus.TEACHER_ABSENT,
            EnumBookingStatus.CHANGE_TIME,
            EnumBookingStatus.CANCEL_BY_STUDENT,
            EnumBookingStatus.CANCEL_BY_TEACHER,
            EnumBookingStatus.CANCEL_BY_ADMIN
        ];
        if (cancelStatus.includes(lesson.status))
            throw new BadRequestError(req.t('errors.booking.absent_or_cancel'));
        await BookingController.onBookingStatusChange(
            req,
            lesson,
            EnumBookingStatus.TEACHER_ABSENT
        );
        await BookingActions.update(lesson._id, {
            reported_absence_at: new Date().getTime(),
            reason,
            status: EnumBookingStatus.TEACHER_ABSENT
        } as Booking);
        new SuccessResponse('success', { message: 'Success' }).send(res, req);
    }

    public static async willTeach(req: ProtectedRequest, res: Response) {
        const { id } = req.user;
        const { lesson_id } = req.body;
        const lesson = await BookingActions.findOne({
            teacher_id: id,
            id: lesson_id
        });
        if (!lesson)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        if (lesson.status === EnumBookingStatus.COMPLETED) {
            throw new BadRequestError(req.t('errors.booking.completed'));
        }
        const cancelStatus = [
            EnumBookingStatus.STUDENT_ABSENT,
            EnumBookingStatus.TEACHER_ABSENT,
            EnumBookingStatus.CHANGE_TIME,
            EnumBookingStatus.CANCEL_BY_STUDENT,
            EnumBookingStatus.CANCEL_BY_TEACHER,
            EnumBookingStatus.CANCEL_BY_ADMIN
        ];
        if (cancelStatus.includes(lesson.status))
            throw new BadRequestError(req.t('errors.booking.absent_or_cancel'));
        if (lesson.calendar) {
            const hour =
                (lesson.calendar.start_time - new Date().getTime()) /
                HOUR_TO_MS;
            if (hour >= 0.5) {
                await BookingController.onBookingStatusChange(
                    req,
                    lesson,
                    EnumBookingStatus.CONFIRMED
                );
                await BookingActions.update(lesson._id, {
                    status: EnumBookingStatus.CONFIRMED
                } as Booking);
            } else {
                throw new BadRequestError(
                    req.t('errors.booking.time_limit_confirm')
                );
            }
        }
        return new SuccessResponse('success', {
            message: req.t('common.success')
        }).send(res, req);
    }

    public static async finishTeaching(req: ProtectedRequest, res: Response) {
        const { id } = req.user;
        const { lesson_id, status, teacher_note } = req.body;
        logger.info(`finishTeaching start, user_id ${id}`);
        const teacher = await TeacherActions.findOne({ user_id: id });
        if (!teacher)
            throw new BadRequestError(req.t('errors.teacher.not_found'));

        const lesson = await BookingActions.findOne({
            teacher_id: id,
            id: parseInt(lesson_id as string)
        });
        if (!lesson)
            throw new BadRequestError(req.t('errors.booking.not_found'));

        logger.info(
            `current booking info: id: ${lesson?.id}, status: ${lesson?.status}`
        );
        logger.info(
            `info booking request: ${lesson_id} ${status} ${teacher_note}`
        );

        if (
            ![
                EnumBookingStatus.TEACHING,
                EnumBookingStatus.TEACHER_CONFIRMED
            ].includes(lesson.status)
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teaching_required')
            );
        }

        try {
            switch (parseInt(status as string)) {
                case EnumBookingStatus.COMPLETED: {
                    const finished_at = new Date().getTime();

                    const diff: any = {
                        status: EnumBookingStatus.COMPLETED,
                        teacher_note: teacher_note
                            ? teacher_note
                            : lesson.teacher_note,
                        finished_at
                    };
                    // add more log for detect bug error when finish teaching
                    logger.info(
                        `new info booking update: ${diff.status} ${diff.teacher_note} ${diff.finished_at}`
                    );
                    await BookingController.onBookingStatusChange(
                        req,
                        lesson,
                        EnumBookingStatus.COMPLETED
                    );
                    logger.info(`done onBookingStatusChange`);
                    await BookingActions.update(lesson._id, diff as Booking);
                    await BookingController.checkForEndOfCourse(
                        req,
                        lesson.student_id,
                        lesson.course_id
                    );
                    logger.info(`done checkForEndOfCourse`);

                    if (!teacher.total_lesson) teacher.total_lesson = 0;
                    if (!teacher.total_lesson_this_level)
                        teacher.total_lesson_this_level = 0;
                    await TeacherActions.update(teacher._id, {
                        total_lesson: teacher.total_lesson + 1,
                        total_lesson_this_level:
                            teacher.total_lesson_this_level + 1
                    } as Teacher);
                    logger.info(`before natsClient.publishEvent`);
                    await natsClient.publishEvent(PopUpEndBookingEvent, {
                        data: {
                            booking_id: lesson.id,
                            student_id: lesson.student_id,
                            teacher_id: lesson.teacher_id,
                            status: diff.status
                        }
                    });
                    logger.info(`done natsClient.publishEvent`);
                    break;
                }
                case EnumBookingStatus.STUDENT_ABSENT: {
                    const reason = "Student doesn't show up";
                    const diff = {
                        reason,
                        teacher_note: teacher_note
                            ? teacher_note
                            : lesson.teacher_note,
                        status: EnumBookingStatus.STUDENT_ABSENT
                    };
                    await BookingController.onBookingStatusChange(
                        req,
                        lesson,
                        EnumBookingStatus.STUDENT_ABSENT
                    );
                    await BookingActions.update(lesson._id, diff as Booking);
                    break;
                }
                default: {
                    throw new BadRequestError(
                        req.t('errors.booking.invalid_status')
                    );
                    break;
                }
            }
        } catch (error) {
            logger.error('FINISH TEACHING ERROR:');
            logger.error(error);
            throw new BadRequestError(req.t('errors.unknown'));
        }

        return new SuccessResponse(req.t('common.success'), {
            message: 'Success'
        }).send(res, req);
    }

    public static async finishLessonBySystem(
        req: ProtectedRequest,
        res: Response
    ) {
        const booking_id = req.body.data;
        const teacher_id = req.body.user_id;
        const type = req.body.user_type;

        const res_payload = {
            message: ''
        };

        if (type != 'teacher') {
            res_payload.message = 'Teacher has not finished';
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }

        const teacher = await TeacherActions.findOne({
            user_id: _.toInteger(teacher_id)
        });
        if (!teacher) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }
        const lesson = await BookingActions.findOne({
            teacher_id: _.toInteger(teacher_id),
            id: _.toInteger(booking_id)
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }
        if (
            ![
                EnumBookingStatus.TEACHING,
                EnumBookingStatus.TEACHER_CONFIRMED
            ].includes(lesson.status)
        ) {
            res_payload.message = req.t('errors.booking.invalid_status');
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        const finished_at = new Date().getTime();

        const diff: any = {
            status: EnumBookingStatus.COMPLETED,
            finished_at
        };
        await BookingController.onBookingStatusChange(
            req,
            lesson,
            EnumBookingStatus.COMPLETED
        );
        await BookingActions.update(lesson._id, diff as Booking);
        await BookingController.checkForEndOfCourse(
            req,
            lesson.student_id,
            lesson.course_id
        );

        if (!teacher.total_lesson) teacher.total_lesson = 0;
        if (!teacher.total_lesson_this_level)
            teacher.total_lesson_this_level = 0;
        await TeacherActions.update(teacher._id, {
            total_lesson: teacher.total_lesson + 1,
            total_lesson_this_level: teacher.total_lesson_this_level + 1
        } as Teacher);
        await natsClient.publishEvent(PopUpEndBookingEvent, {
            data: {
                booking_id: lesson.id,
                student_id: lesson.student_id,
                teacher_id: lesson.teacher_id,
                status: diff.status
            }
        });
        return new SuccessResponse(req.t('common.success'), {
            message: 'Success'
        }).send(res, req);
    }

    public static async absentPeriodByTeacher(
        req: ProtectedRequest,
        teacher_id: number,
        start_time: number,
        end_time: number,
        reason?: string
    ) {
        const filter = {
            teacher_id,
            min_start_time: start_time,
            max_end_time: end_time,
            status: [EnumBookingStatus.PENDING, EnumBookingStatus.CONFIRMED]
        };
        const bookings = await BookingActions.findAll(filter);
        // update lần lượt từng booking, ko update đồng thời vì sẽ dẫn đến tăng lesson chưa học của HV sai
        for (const booking of bookings) {
            /**
             * We have to update each booking record because we need to
             * update each student's ordered package and send
             * notification to each students
             */
            await BookingController.onBookingStatusChange(
                req,
                booking,
                EnumBookingStatus.CANCEL_BY_TEACHER
            );
            const dataPayload = {
                student_name: booking.student.full_name,
                student_username: booking.student.username,
                student_id: booking.student.id,
                teacher_name: booking.teacher.full_name,
                start_time: moment(booking.calendar.start_time).format(
                    'HH:mm DD/MM/YYYY'
                )
            };
            natsClient.publishEventZalo(
                booking.student,
                ZaloOANotification.TEACHER_REQUEST_ABSENT,
                dataPayload
            );
            await BookingActions.update(booking._id, {
                reported_absence_at: new Date().getTime(),
                reason,
                status: EnumBookingStatus.CANCEL_BY_TEACHER
            } as Booking);
        }
    }

    /*
     * Summary: Student rate the lesson after finish the class
     *          With this rating, we can also update teacher rating
     */
    public static async rateLessonByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const { lesson_id } = req.params;
        const { rating } = req.body;
        let student_note;

        const lesson = await BookingActions.findOne({
            student_id: id,
            id: parseInt(lesson_id as string)
        });
        if (!lesson)
            throw new BadRequestError(req.t('errors.booking.not_found'));
        if (
            ![EnumBookingStatus.TEACHING, EnumBookingStatus.COMPLETED].includes(
                lesson.status
            )
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teaching_or_completed_required')
            );
        }

        if (req.body.hasOwnProperty('student_note')) {
            student_note = req.body.student_note;
        } else {
            student_note = lesson.student_note;
        }

        if (
            rating == lesson.student_rating &&
            student_note == lesson.student_note
        ) {
            /* No updates, just return right away */
            return new SuccessResponse('success', { message: 'Success' }).send(
                res
            );
        }

        const old_lesson_rating = lesson.student_rating
            ? lesson.student_rating
            : 0;

        const rated_filter = {
            status: [1],
            teacher_id: lesson.teacher_id,
            student_rating: [1, 2, 3, 4, 5]
        };
        const rated_lessons = await BookingActions.count(rated_filter);

        await TeacherController.updateTeacherRating(
            req,
            lesson.teacher_id,
            old_lesson_rating,
            parseInt(rating as string),
            rated_lessons
        );

        const diff = {
            student_rating: parseInt(rating as string),
            student_note
        };
        await BookingActions.update(lesson._id, diff as Booking);

        return new SuccessResponse('success', { message: 'Success' }).send(
            res,
            req
        );
    }

    public static async editHomeworkBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;

        const { lesson_id } = req.params;
        const { homework } = req.body;

        const lesson = await BookingActions.findOne({
            student_id: id,
            id: parseInt(lesson_id as string)
        });

        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }

        if (
            ![EnumBookingStatus.TEACHING, EnumBookingStatus.COMPLETED].includes(
                lesson.status
            )
        ) {
            throw new BadRequestError(
                req.t('errors.booking.teaching_or_completed_required')
            );
        }

        const diff = {
            homework
        };
        await BookingActions.update(lesson._id, diff as Booking);

        return new SuccessResponse('success', { message: 'Success' }).send(
            res,
            req
        );
    }

    public static async createMemoByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { memo } = req.body;
        const { booking_id } = req.params;
        const book = await BookingActions.findOne({ id: Number(booking_id) });
        if (!book) throw new BadRequestError(req.t('errors.booking.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'BookingModel',
            book,
            pickUpData
        );
        const late_memo = BookingController.checkBookingMemoTime(book, false);
        let data_update_memo = {};
        const testResult = {
            ...book.test_result
        };

        memo?.note.forEach(async (element: any) => {
            if (element?.keyword == 'listening') {
                testResult.listening = element?.point;
            } else if (element?.keyword == 'speaking') {
                testResult.speaking = element?.point;
                // neu unit la type IELTS thi luu diem speaking tu memo vào bảng result
                if (
                    book?.unit?.unit_type == EnumUnitType.IELTS_GRAMMAR ||
                    book?.unit?.unit_type == EnumUnitType.IELTS_4_SKILLS
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

        if (book.memo && book.memo?.created_time) {
            data_update_memo = {
                memo: {
                    ...memo,
                    created_time: book.memo?.created_time
                },
                test_result: {
                    ...testResult
                }
            };
        } else {
            data_update_memo = {
                memo: {
                    ...memo,
                    created_time: new Date()
                },
                late_memo,
                test_result: {
                    ...testResult
                }
            };
        }
        const newBooking = await BookingActions.update(
            book._id,
            data_update_memo as Booking
        );

        if (newBooking && newBooking.memo && !req.user.isAdmin) {
            const findData = async (
                keyword: string,
                keyArr: string,
                key: string
            ) => {
                try {
                    return (
                        (await memo[keyArr].find(
                            (e: any) => e.keyword === keyword
                        )[key]) || 'Chưa có đánh giá'
                    );
                } catch (error) {
                    console.log('findData', error);
                }
                return 'Chưa có đánh giá';
            };
            const strengthData = await findData('strength', 'other', 'comment');
            const weaknessData = await findData('weakness', 'other', 'comment');
            const commentData = await findData(
                'another_comment',
                'other',
                'comment'
            );
            const dataPayload = {
                teacher_name: req.user.name,
                class_time: moment(book.calendar.start_time).format(
                    'HH:mm DD/MM/YYYY'
                ),
                listening_point: await findData('listening', 'note', 'point'),
                speaking_point: await findData('speaking', 'note', 'point'),
                vocabulary_point: await findData('vocabulary', 'note', 'point'),
                grammar_point: await findData('grammar', 'note', 'point'),
                strength_point: strengthData,
                weakness_point: weaknessData,
                comment: commentData,
                level_of_attention: await findData(
                    'attention',
                    'other',
                    'comment'
                ),
                level_of_comprehension: await findData(
                    'comprehension',
                    'other',
                    'comment'
                ),
                in_class_performance: await findData(
                    'performance',
                    'other',
                    'comment'
                ),
                student_name: book.student.full_name,
                student_username: book.student.username,
                student_id: book.student.id
            };
            const dataCountWord =
                strengthData.trim().length +
                weaknessData.trim().length +
                commentData.trim().length;
                logger.info(`data count strenth: ${strengthData.trim().length}`);
                logger.info(`data count word: ${dataCountWord}`);
            if (dataCountWord < 1400) {
                logger.info(
                    `start send publishEventZalo write memo ${newBooking.student_id}`
                );
                await natsClient.publishEventZalo(
                    newBooking.student_id,
                    ZaloOANotification.TEACHER_WRITE_MEMO,
                    dataPayload
                );
            } else {
                logger.info(
                    `start send publishEventZalo remind view memo ${newBooking.student_id}`
                );
                await natsClient.publishEventZalo(
                    newBooking.student_id,
                    ZaloOANotification.REMIND_VIEW_MEMO_FOR_STUDENT,
                    dataPayload
                );
            }
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'BookingModel',
            newBooking,
            pickUpData
        );
        return new SuccessResponse('success', {
            message: req.t('common.success'),
            late_memo
        }).send(res, req);
    }

    public static async getTeacherBookingReport(
        req: ProtectedRequest,
        res: Response,
        teacher_id: number
    ) {
        const start_time = parseInt(req.query.start_time as string);
        const end_time = parseInt(req.query.end_time as string);
        const res_payload: any = {
            total_done: 0,
            total_pending: 0,
            total_open: 0,
            total_student_absent: 0,
            total_teacher_absent: 0,
            total_student_cancel: 0,
            total_teacher_cancel: 0,
            total_admin_cancel: 0
        };
        if (isNaN(start_time) || isNaN(end_time) || start_time > end_time) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        const filter = {
            teacher_id,
            $and: [
                { 'calendar.start_time': { $gte: start_time } },
                { 'calendar.end_time': { $lte: end_time } }
            ]
        };
        let bookings = await BookingActions.findAll(filter, { status: 1 });
        if (bookings.length == 0) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }

        let status = 1;
        for (const key of Object.keys(res_payload)) {
            if (key == 'total_open') {
                /* total_open is special because it contains 2 status: CONFIRMED and TEACHING */
                status += 2;
            } else {
                status += 1;
            }
            const new_status_index = bookings.findIndex(
                (x) => x.status >= status
            );
            if (new_status_index == -1) {
                res_payload[key] = bookings.length;
                break;
            } else {
                res_payload[key] = new_status_index;
                bookings = bookings.splice(new_status_index);
                if (bookings.length == 0) break;
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTeacherBookingReportByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        await BookingController.getTeacherBookingReport(
            req,
            res,
            parseInt(teacher_id as string)
        );
    }

    public static async getTeacherBookingReportByThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        await BookingController.getTeacherBookingReport(req, res, id);
    }

    public static async updateLessonTeachingOverTime(
        req: ProtectedRequest,
        res: Response
    ) {
        const bookings = await BookingActions.getLessonTeachingOverTime();
        bookings.forEach(async (booking) => {
            const currentTimestamp = moment().valueOf();
            const late_time = currentTimestamp - booking.calendar.end_time;
            const email = booking?.teacher?.email;
            const is_verified_email = booking?.teacher?.is_verified_email;

            if (email && is_verified_email && late_time > 0) {
                if (
                    booking.status == EnumBookingStatus.TEACHING &&
                    late_time > OverTime
                ) {
                    await BookingActions.update(booking._id, {
                        status: EnumBookingStatus.TEACHER_CONFIRMED
                    } as Booking);
                    const template = await TemplateActions.findOne({
                        code: EmailTemplate.LESSON_TEACHING_OVER_TIME
                    });
                    if (template && !booking.ispeak_booking_id)
                        JobQueueServices.sendMailWithTemplate({
                            to: email,
                            subject: template.title,
                            body: template.content,
                            data: {
                                teacher: booking.teacher,
                                student: booking.student,
                                course: booking.course,
                                unit: booking.unit
                            }
                        });
                    const notiPayload = {
                        student_name: `${booking.student.first_name} ${booking.student.last_name}`,
                        teacher_name: `${booking.teacher.first_name} ${booking.teacher.last_name}`,
                        start_time: booking.calendar.start_time
                    };
                    const notiTeacherTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.CREATE_BOOKING_FOR_TEACHER
                    });
                    if (notiTeacherTemplate)
                        await natsClient.publishEventWithTemplate({
                            template: notiTeacherTemplate.content,
                            data: notiPayload,
                            receiver: booking.teacher_id,
                            template_obj_id: notiTeacherTemplate._id
                        });
                    const notiStudentTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.CREATE_BOOKING_FOR_STUDENT
                    });
                    if (notiStudentTemplate)
                        await natsClient.publishEventWithTemplate({
                            template: notiStudentTemplate.content,
                            data: notiPayload,
                            receiver: booking.student_id,
                            template_obj_id: notiStudentTemplate._id
                        });
                    const adminOwner = await AdminActions.findOne({
                        username: 'admin'
                    });
                    const notiAdminTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.CREATE_BOOKING_FOR_ADMIN
                    });
                    if (adminOwner && notiAdminTemplate)
                        await natsClient.publishEventWithTemplate({
                            template: notiAdminTemplate.content,
                            data: notiPayload,
                            receiver: adminOwner._id,
                            template_obj_id: notiAdminTemplate._id
                        });
                } else if (
                    [
                        EnumBookingStatus.PENDING,
                        EnumBookingStatus.CONFIRMED
                    ].includes(booking.status)
                ) {
                    await BookingController.onBookingStatusChange(
                        req,
                        booking,
                        EnumBookingStatus.TEACHER_ABSENT
                    );
                    await BookingActions.update(booking._id, {
                        status: EnumBookingStatus.TEACHER_ABSENT
                    } as Booking);
                } else if (
                    booking.status == EnumBookingStatus.TEACHER_CONFIRMED &&
                    late_time >= OverTimeFinish
                ) {
                    LogServices.setChangeData(
                        req,
                        EnumTypeChangeData.old,
                        'BookingModel',
                        booking,
                        pickUpData
                    );
                    await BookingController.onBookingStatusChange(
                        req,
                        booking,
                        EnumBookingStatus.TEACHER_ABSENT
                    );
                    const newBooking = await BookingActions.update(
                        booking._id,
                        {
                            status: EnumBookingStatus.TEACHER_ABSENT
                        } as Booking
                    );
                    LogServices.setChangeData(
                        req,
                        EnumTypeChangeData.new,
                        'BookingModel',
                        newBooking,
                        pickUpData
                    );
                }
            }
        });

        return new SuccessResponse('success', { count: bookings.length }).send(
            res,
            req
        );
    }

    /**
     * @description Get the number of teacher's calendar that has been canceled
     *              by teachers and admins (invalid open calendar)
     * @param teacher_id ID of the teacher
     * @param start_time start of the time period
     * @param end_time end of the time period
     * @returns the number of cancel calendar
     */
    public static async getTotalCancelCalendarOfTeacher(
        teacher_id: number,
        start_time: number,
        end_time: number
    ): Promise<number> {
        const filter = {
            teacher_id,
            status: [
                EnumBookingStatus.CANCEL_BY_TEACHER,
                EnumBookingStatus.CANCEL_BY_ADMIN
            ],
            $and: [
                { 'calendar.start_time': { $gte: start_time } },
                { 'calendar.start_time': { $lt: end_time } }
            ]
        };
        const total_cancel = await BookingActions.count(filter);
        return total_cancel;
    }

    public static async getDetailFinesOfTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.user.id;
        const res_payload = {
            late_memo: new Array<Booking>(),
            absence_in_time: new Array<Booking>(),
            absence_report_late_normal: new Array<Booking>(),
            absence_report_late_nearly_missed: new Array<Booking>(),
            missed_class: new Array<Booking>()
        };

        const start_time = parseInt(req.query.start_time as string);
        const end_time = parseInt(req.query.end_time as string);
        if (!start_time || !end_time) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        const filter = {
            teacher_id,
            status: [EnumBookingStatus.TEACHER_ABSENT],
            $and: [
                { 'calendar.start_time': { $gte: start_time } },
                { 'calendar.start_time': { $lt: end_time } }
            ]
        };
        const bookings = await BookingActions.findAll(filter, {
            teacher: 0,
            ordered_package_id: 0,
            ordered_package: 0,
            admin_unit_lock: 0,
            created_time: 0,
            updated_time: 0
        });
        for (const booking of bookings) {
            booking.student = {
                id: booking.student.id,
                full_name: booking.student.full_name,
                avatar: booking.student.avatar,
                email: booking.student.email
            } as User;
            booking.course.packages = [];
            if (!booking.reported_absence_at) {
                res_payload.missed_class.push(booking);
            } else if (
                booking.calendar.start_time - booking.reported_absence_at >
                ALLOWED_TIME_TO_REPORT_ABSENCE
            ) {
                res_payload.absence_in_time.push(booking);
            } else if (
                booking.calendar.start_time - booking.reported_absence_at <=
                    ALLOWED_TIME_TO_REPORT_ABSENCE &&
                booking.calendar.start_time - booking.reported_absence_at >
                    NORMAL_LATE_TIME_TO_REPORT_ABSENCE
            ) {
                res_payload.absence_report_late_normal.push(booking);
            } else if (
                booking.calendar.start_time - booking.reported_absence_at <=
                    NORMAL_LATE_TIME_TO_REPORT_ABSENCE &&
                booking.calendar.start_time > booking.reported_absence_at
            ) {
                res_payload.absence_report_late_nearly_missed.push(booking);
            } else {
                res_payload.missed_class.push(booking);
            }
            if (booking.late_memo == true) {
                res_payload.late_memo.push(booking);
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async notiChangeTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const booking = req.body.booking;
        const oldTeacherId = req.body.old_teacher_id;
        logger.info('oldTeacherId: ' + oldTeacherId);
        // check điều kiện time booking không trùng với student leave request nào
        const studentLeaveData = await StudentLeaveRequestActions.findOne({
            start_time: { $lte: booking?.calendar.start_time },
            end_time: { $gt: booking?.calendar.start_time }
        });

        if (oldTeacherId && !studentLeaveData) {
            // thong bao cho hv job tao booking moi voi gv moi khi booking cu bi gv cancel
            const oldTeacher = await UserActions.findOne({ id: oldTeacherId });
            if (oldTeacher) {
                logger.info('old Teacher name: ' + oldTeacher?.full_name);
                const dataPayload = {
                    student_name: booking.student.full_name,
                    old_teacher_name: oldTeacher.full_name,
                    old_booking_start_time: moment(
                        booking.calendar.start_time
                    ).format('HH:mm DD/MM/YYYY'),
                    new_teacher_name: booking?.teacher?.full_name,
                    course_name: booking?.course?.name,
                    unit_name: booking?.unit?.name,
                    new_booking_start_time: moment(
                        booking.calendar.start_time
                    ).format('HH:mm DD/MM/YYYY')
                };
                natsClient.publishEventZalo(
                    booking.student,
                    ZaloOANotification.CHANGE_TEACHER,
                    dataPayload
                );

                // noti page hv
                const notiChangeTeacherforStudentTemplate =
                    await TemplateActions.findOne({
                        code: BackEndNotification.CHANGE_TEACHER_BY_CRONJOB_FOR_STUDENT
                    });
                if (notiChangeTeacherforStudentTemplate) {
                    const changeTeacherPayload = {
                        old_teacher_name: oldTeacher.full_name,
                        old_booking_start_time: moment(
                            booking.calendar.start_time
                        ).format('HH:mm DD/MM/YYYY'),
                        new_teacher_name: booking?.teacher?.full_name
                    };
                    natsClient.publishEventWithTemplate({
                        template: notiChangeTeacherforStudentTemplate.content,
                        data: changeTeacherPayload,
                        receiver: booking.student_id,
                        template_obj_id: notiChangeTeacherforStudentTemplate._id
                    });
                }
            }
        }
        const notiStudentTemplate = await TemplateActions.findOne({
            code: BackEndNotification.CHANGE_TEACHER_BY_CRONJOB
        });
        if (!notiStudentTemplate) {
            throw new BadRequestError();
        }
        const teacherToClasPayload = {
            student_name: `${booking.student.full_name} - ${booking.student.username}`,
            teacher_name: `${booking.teacher.full_name} - ${booking.teacher.username}`,
            start_time: booking.calendar.start_time
        };
        const adminOwner = await AdminActions.findOne({ username: 'admin' });
        if (!adminOwner) {
            throw new BadRequestError();
        }
        natsClient.publishEventWithTemplate({
            template: notiStudentTemplate.content,
            data: teacherToClasPayload,
            receiver: adminOwner._id,
            template_obj_id: notiStudentTemplate._id
        });

        // thông báo cho học thuật
        // thông báo cho trưởng phòng - trưởng nhóm
        const operationIssueForHT = await OperationIssueActions.create({
            booking_id: booking.id,
            issue_description: 'Change teacher',
            resolved_staff_id: null
        } as any);
        const operationIssueIdForHT = operationIssueForHT?._id;

        const hocThuatDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.HOC_THUAT
        });
        if (hocThuatDepartment) {
            const managerHocThuat = await AdminModel.findOne({
                department: {
                    department: hocThuatDepartment._id,
                    isRole: EnumRole.Manager
                }
            });
            if (managerHocThuat) {
                natsClient.publishEventWithTemplate({
                    template: notiStudentTemplate.content,
                    data: teacherToClasPayload,
                    receiver: managerHocThuat._id,
                    template_obj_id: notiStudentTemplate._id,
                    operation_issue_id: operationIssueIdForHT
                });
            }
            const listDeputyHT = await AdminModel.find({
                'department.department': hocThuatDepartment._id,
                'department.isRole': EnumRole.Deputy_manager
            });

            if (listDeputyHT.length) {
                listDeputyHT.forEach((element) => {
                    natsClient.publishEventWithTemplate({
                        template: notiStudentTemplate.content,
                        data: teacherToClasPayload,
                        receiver: element._id,
                        template_obj_id: notiStudentTemplate._id,
                        operation_issue_id: operationIssueIdForHT
                    });
                });
            }
            // const listLeader = await AdminModel.find({
            //     'department.department': hocThuatDepartment._id,
            //     'department.isRole': EnumRole.Leader
            // });
            // if (listLeader.length) {
            //     listLeader.forEach((element) => {
            //         natsClient.publishEventWithTemplate({
            //             template: notiTemplate.content,
            //             data,
            //             receiver: element._id
            //         });
            //     });
            // }
        }
        // thông báo cho nhân viên quản lý
        const teacher = (await TeacherModel.findOne({
            user_id: booking.teacher_id
        }).populate('staff')) as any;

        if (teacher && teacher?.staff) {
            natsClient.publishEventWithTemplate({
                template: notiStudentTemplate.content,
                data: teacherToClasPayload,
                receiver: teacher.staff._id,
                template_obj_id: notiStudentTemplate._id,
                operation_issue_id: operationIssueIdForHT
            });
        }

        // thông báo cho cs
        const operationIssue = await OperationIssueActions.create({
            booking_id: booking.id,
            issue_description: 'Change teacher',
            resolved_staff_id: null
        } as any);
        const operationIssueId = operationIssue?._id;

        const cskhDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.CSKH
        });
        if (cskhDepartment) {
            const managerCskh = await AdminModel.findOne({
                department: {
                    department: cskhDepartment._id,
                    isRole: EnumRole.Manager
                }
            });
            if (managerCskh) {
                natsClient.publishEventWithTemplate({
                    template: notiStudentTemplate.content,
                    data: teacherToClasPayload,
                    receiver: managerCskh._id,
                    template_obj_id: notiStudentTemplate._id,
                    operation_issue_id: operationIssueId
                });
            }
            const listDeputy = await AdminModel.find({
                'department.department': cskhDepartment._id,
                'department.isRole': EnumRole.Deputy_manager
            });

            if (listDeputy.length) {
                listDeputy.forEach((element) => {
                    natsClient.publishEventWithTemplate({
                        template: notiStudentTemplate.content,
                        data: teacherToClasPayload,
                        receiver: element._id,
                        template_obj_id: notiStudentTemplate._id,
                        operation_issue_id: operationIssueId
                    });
                });
            }
            const listLeader = await AdminModel.find({
                'department.department': cskhDepartment._id,
                'department.isRole': EnumRole.Leader
            });

            if (listLeader.length) {
                listLeader.forEach((element) => {
                    natsClient.publishEventWithTemplate({
                        template: notiStudentTemplate.content,
                        data: teacherToClasPayload,
                        receiver: element._id,
                        template_obj_id: notiStudentTemplate._id,
                        operation_issue_id: operationIssueId
                    });
                });
            }
            // thông báo cho nhân viên quản lý
            const student = await StudentModel.findOne({
                user_id: booking.student_id
            }).populate('staff');
            const checkExits = listLeader.find(
                (e) => e.id === student?.staff?.id
            );
            if (student && student?.staff && !checkExits) {
                natsClient.publishEventWithTemplate({
                    template: notiStudentTemplate.content,
                    data: teacherToClasPayload,
                    receiver: student.staff._id,
                    template_obj_id: notiStudentTemplate._id,
                    operation_issue_id: operationIssueId
                });
            }
        }

        // thông báo cho all nhân viên phòng TNG
        const tngDepartment = await DepartmentModel.findOne({
            unsignedName: CODE_DEPARTMENT.TNG
        });
        if (tngDepartment) {
            const allStaffTNG = await AdminModel.find({
                'department.department': tngDepartment._id
            });
            if (allStaffTNG.length) {
                allStaffTNG.forEach((element) => {
                    natsClient.publishEventWithTemplate({
                        template: notiStudentTemplate.content,
                        data: teacherToClasPayload,
                        receiver: element._id,
                        template_obj_id: notiStudentTemplate._id,
                        operation_issue_id: operationIssueId
                    });
                });
            }
        }

        return new SuccessResponse('success', booking).send(res, req);
    }

    public static async notificationForTeacherIsLateToClass(
        req: ProtectedRequest,
        res: Response
    ) {
        let startTime = moment().startOf('hour').valueOf();
        if (moment().minute() > 30) {
            startTime = moment().startOf('hour').add(30, 'minute').valueOf();
        }
        const endTime = moment(startTime).add(30, 'minute').valueOf();
        const filter = {
            status: [EnumBookingStatus.CONFIRMED],
            is_late: false,
            'calendar.start_time': {
                $gte: startTime,
                $lte: endTime
            }
        };
        const bookings = await BookingActions.findAll(filter);
        const adminOwner = await AdminActions.findOne({ username: 'admin' });
        const teacherTemplate = await TemplateActions.findOne({
            code: EmailTemplate.LATE_TO_CLASS_FOR_TEACHER
        });
        const studentTemplate = await TemplateActions.findOne({
            code: EmailTemplate.LATE_TO_CLASS_FOR_STUDENT
        });
        const adminTemplate = await TemplateActions.findOne({
            code: EmailTemplate.LATE_TO_CLASS_FOR_ADMIN
        });

        bookings.forEach(async (booking) => {
            try {
                const lateTime = moment().diff(
                    moment(booking.calendar.start_time),
                    'minutes'
                );

                if (lateTime > 3) {
                    booking.is_late = true;
                    booking.save();
                    const teacherToClasPayload = {
                        student_name: booking.student.full_name,
                        student_username: booking.student.username,
                        student_id: booking.student.id,
                        teacher_name: `${booking.teacher.full_name}`,
                        start_time: booking.calendar.start_time,
                        teacher_skype: booking.teacher.skype_account as string,
                        student_skype: booking.student.skype_account as string
                    };
                    if (teacherTemplate)
                        JobQueueServices.sendMailWithTemplate({
                            to: booking.teacher.email,
                            subject: teacherTemplate.title,
                            body: teacherTemplate.content,
                            data: teacherToClasPayload
                        });
                    if (studentTemplate && booking.student.is_verified_email === true && booking.student.is_enable_receive_mail)
                        JobQueueServices.sendMailWithTemplate({
                            to: booking.student.email,
                            subject: studentTemplate.title,
                            body: studentTemplate.content,
                            data: teacherToClasPayload
                        });
                    if (adminOwner?.email) {
                        if (adminTemplate)
                            JobQueueServices.sendMailWithTemplate({
                                to: adminOwner.email,
                                subject: adminTemplate.title,
                                body: adminTemplate.content,
                                data: teacherToClasPayload
                            });
                    }
                    const notiTeacherTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.TEACHER_LATE_TO_CLASS_FOR_TEACHER
                    });
                    if (notiTeacherTemplate)
                        natsClient.publishEventWithTemplate({
                            template: notiTeacherTemplate.content,
                            data: teacherToClasPayload,
                            receiver: booking.teacher_id,
                            template_obj_id: notiTeacherTemplate._id
                        });
                    // const notiStudentTemplate = await TemplateActions.findOne({
                    //     code: BackEndNotification.TEACHER_LATE_TO_CLASS_FOR_STUDENT
                    // });
                    // if (notiStudentTemplate)
                    //     natsClient.publishEventWithTemplate({
                    //         template: notiStudentTemplate.content,
                    //         data: teacherToClasPayload,
                    //         receiver: booking.student_id,
                    //         template_obj_id: notiStudentTemplate._id
                    //     });
                    const notiAdminTemplate = await TemplateActions.findOne({
                        code: BackEndNotification.TEACHER_LATE_TO_CLASS_FOR_ADMIN
                    });
                    if (adminOwner && notiAdminTemplate)
                        natsClient.publishEventWithTemplate({
                            template: notiAdminTemplate.content,
                            data: teacherToClasPayload,
                            receiver: adminOwner._id,
                            template_obj_id: notiAdminTemplate._id
                        });

                    if (notiAdminTemplate) {
                        // thông báo cho học thuật
                        // thông báo cho trưởng phòng - trưởng nhóm
                        const operationIssueHT =
                            await OperationIssueActions.create({
                                booking_id: booking.id,
                                issue_description:
                                    'Notification for teacher is late to class',
                                resolved_staff_id: null
                            } as any);
                        const operationIssueIdHT = operationIssueHT?._id;

                        const hocThuatDepartment =
                            await DepartmentModel.findOne({
                                unsignedName: CODE_DEPARTMENT.HOC_THUAT
                            });
                        if (hocThuatDepartment) {
                            const managerHocThuat = await AdminModel.findOne({
                                department: {
                                    department: hocThuatDepartment._id,
                                    isRole: EnumRole.Manager
                                }
                            });
                            if (managerHocThuat) {
                                natsClient.publishEventWithTemplate({
                                    template: notiAdminTemplate.content,
                                    data: teacherToClasPayload,
                                    receiver: managerHocThuat._id,
                                    template_obj_id: notiAdminTemplate._id,
                                    operation_issue_id: operationIssueIdHT
                                });
                            }
                            const listDeputyHT = await AdminModel.find({
                                'department.department': hocThuatDepartment._id,
                                'department.isRole': EnumRole.Deputy_manager
                            });

                            if (listDeputyHT.length) {
                                listDeputyHT.forEach((element) => {
                                    natsClient.publishEventWithTemplate({
                                        template: notiAdminTemplate.content,
                                        data: teacherToClasPayload,
                                        receiver: element._id,
                                        template_obj_id: notiAdminTemplate._id,
                                        operation_issue_id: operationIssueIdHT
                                    });
                                });
                            }
                            // const listLeader = await AdminModel.find({
                            //     'department.department': hocThuatDepartment._id,
                            //     'department.isRole': EnumRole.Leader
                            // });
                            // if (listLeader.length) {
                            //     listLeader.forEach((element) => {
                            //         natsClient.publishEventWithTemplate({
                            //             template: notiTemplate.content,
                            //             data,
                            //             receiver: element._id
                            //         });
                            //     });
                            // }
                        }
                        // thông báo cho nhân viên quản lý
                        const teacher = (await TeacherModel.findOne({
                            user_id: booking.teacher_id
                        }).populate('staff')) as any;

                        if (teacher && teacher?.staff) {
                            natsClient.publishEventWithTemplate({
                                template: notiAdminTemplate.content,
                                data: teacherToClasPayload,
                                receiver: teacher.staff._id,
                                template_obj_id: notiAdminTemplate._id,
                                operation_issue_id: operationIssueIdHT
                            });
                        }

                        const operationIssue =
                            await OperationIssueActions.create({
                                booking_id: booking.id,
                                issue_description:
                                    'Notification for teacher is late to class',
                                resolved_staff_id: null
                            } as any);
                        const operationIssueId = operationIssue?._id;

                        // thông báo cho cs
                        const cskhDepartment = await DepartmentModel.findOne({
                            unsignedName: CODE_DEPARTMENT.CSKH
                        });
                        if (cskhDepartment) {
                            const managerCskh = await AdminModel.findOne({
                                department: {
                                    department: cskhDepartment._id,
                                    isRole: EnumRole.Manager
                                }
                            });
                            if (managerCskh) {
                                natsClient.publishEventWithTemplate({
                                    template: notiAdminTemplate.content,
                                    data: teacherToClasPayload,
                                    receiver: managerCskh._id,
                                    template_obj_id: notiAdminTemplate._id,
                                    operation_issue_id: operationIssueId
                                });
                            }
                            const listDeputy = await AdminModel.find({
                                'department.department': cskhDepartment._id,
                                'department.isRole': EnumRole.Deputy_manager
                            });

                            if (listDeputy.length) {
                                listDeputy.forEach((element) => {
                                    natsClient.publishEventWithTemplate({
                                        template: notiAdminTemplate.content,
                                        data: teacherToClasPayload,
                                        receiver: element._id,
                                        template_obj_id: notiAdminTemplate._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                            const listLeader = await AdminModel.find({
                                'department.department': cskhDepartment._id,
                                'department.isRole': EnumRole.Leader
                            });

                            if (listLeader.length) {
                                listLeader.forEach((element) => {
                                    natsClient.publishEventWithTemplate({
                                        template: notiAdminTemplate.content,
                                        data: teacherToClasPayload,
                                        receiver: element._id,
                                        template_obj_id: notiAdminTemplate._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                            // thông báo cho nhân viên quản lý
                            const student = await StudentModel.findOne({
                                user_id: booking.student_id
                            }).populate('staff');
                            const checkExits = listLeader.find(
                                (e) => e.id === student?.staff?.id
                            );
                            if (student && student?.staff && !checkExits) {
                                natsClient.publishEventWithTemplate({
                                    template: notiAdminTemplate.content,
                                    data: teacherToClasPayload,
                                    receiver: student.staff._id,
                                    template_obj_id: notiAdminTemplate._id,
                                    operation_issue_id: operationIssueId
                                });
                            }
                        }

                        // thông báo cho all nhân viên phòng TNG
                        const tngDepartment = await DepartmentModel.findOne({
                            unsignedName: CODE_DEPARTMENT.TNG
                        });
                        if (tngDepartment) {
                            const allStaffTNG = await AdminModel.find({
                                'department.department': tngDepartment._id
                            });
                            if (allStaffTNG.length) {
                                allStaffTNG.forEach((element) => {
                                    natsClient.publishEventWithTemplate({
                                        template: notiAdminTemplate.content,
                                        data: teacherToClasPayload,
                                        receiver: element._id,
                                        template_obj_id: notiAdminTemplate._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                        }
                    }

                    natsClient.publishEventZalo(
                        booking.student,
                        ZaloOANotification.TEACHER_LATE_TO_CLASS,
                        teacherToClasPayload
                    );
                }
            } catch (error) {
                console.log(error);
            }
        });
        return new SuccessResponse('success', bookings).send(res, req);
    }

    public static async recordUploadByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { data, video } = req.body;
        const booking_id = parseInt(data as string);
        const record_link = [video];

        const booking = await BookingActions.findOne({
            id: booking_id
        });
        if (!booking) {
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
        await BookingActions.update(booking._id, { record_link } as Booking);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getStudentStudyingSummaryMonthly(
        student_id: number,
        month: number,
        year: number
    ) {
        const start_time = moment
            .utc()
            .year(year)
            .month(month - 1)
            .startOf('month')
            .valueOf();
        const end_time = moment
            .utc()
            .year(year)
            .month(month - 1)
            .startOf('month')
            .add(1, 'month')
            .valueOf();

        const sort = { updated_time: 1 };
        const select_fields = {
            id: 1,
            calendar: 1,
            memo: 1,
            status: 1
        };
        const registered_class_list = await BookingActions.findAll(
            {
                student_id,
                status: [
                    EnumBookingStatus.COMPLETED,
                    EnumBookingStatus.STUDENT_ABSENT
                ],
                min_start_time: start_time,
                max_end_time: end_time
            },
            sort,
            select_fields
        );
        const registered_class = registered_class_list.length;

        const completed_class_list = registered_class_list.filter(
            (b) => b.status === EnumBookingStatus.COMPLETED
        );
        const completed_class = completed_class_list.length;
        const attendance_point = registered_class
            ? _.round((completed_class / registered_class) * 10, 2)
            : 0;

        const weekIntervals = each7DaysInRange(start_time, end_time);
        const weeks: SegmentPoint[] = weekIntervals.map((week) => {
            return {
                start_time: week[0],
                end_time: week[1]
            };
        });
        for (const week of weeks) {
            const registered = registered_class_list.filter(
                (booking) =>
                    booking.calendar.start_time >= week.start_time &&
                    booking.calendar.end_time <= week.end_time
            ).length;
            const completed = completed_class_list.filter(
                (booking) =>
                    booking.calendar.start_time >= week.start_time &&
                    booking.calendar.end_time <= week.end_time
            ).length;
            week.attendance_point = registered
                ? _.round((completed / registered) * 10, 2)
                : 0;
        }

        const bookingWithMemos: Booking[] = [];
        let class_that_have_memo = 0;
        let attitude_point_sum = 0;
        for (const booking of completed_class_list) {
            if (booking.memo && booking.memo.note) {
                const assessments = booking.memo.note;
                if (assessments.length > 0) {
                    bookingWithMemos.push(booking);
                    class_that_have_memo++;
                    let sum = 0;
                    for (const assessment of assessments) {
                        sum += assessment.point;
                    }
                    const point = sum / assessments.length;
                    attitude_point_sum += point;
                    const week = weeks.find(
                        (w) =>
                            booking.calendar.start_time >= w.start_time &&
                            booking.calendar.end_time <= w.end_time
                    );
                    if (week) {
                        if (!week.attitude_point) week.attitude_point = 0;
                        week.attitude_point += point;
                    }
                }
            }
        }
        const attitude_point = class_that_have_memo
            ? _.round(attitude_point_sum / class_that_have_memo, 2)
            : 0;
        for (const week of weeks) {
            const classes = bookingWithMemos.filter(
                (booking) =>
                    booking.calendar.start_time >= week.start_time &&
                    booking.calendar.end_time <= week.end_time
            ).length;
            if (classes) {
                week.attitude_point = _.round(
                    (week.attitude_point as number) / classes,
                    2
                );
            }
        }

        const bookingWithHomeworks: Booking[] = [];
        const class_that_have_homework = 0;
        const homework_point_sum = 0;
        await Promise.all(
            completed_class_list.map(async (booking: Booking) => {
                const week = weeks.find(
                    (w) =>
                        booking.calendar.start_time >= w.start_time &&
                        booking.calendar.end_time <= w.end_time
                );
            })
        );
        for (const week of weeks) {
            const classes = bookingWithHomeworks.filter(
                (booking) =>
                    booking.calendar.start_time >= week.start_time &&
                    booking.calendar.end_time <= week.end_time
            ).length;
            if (classes) {
                week.homework_point = _.round(
                    (week.homework_point as number) / classes,
                    2
                );
            }
        }

        const summary = {
            registered_class,
            completed_class,
            attendance_point,
            attitude_point,
            segments: weeks
        };
        return summary;
    }

    public static async getStudentStudyingSummaryInCourse(
        student_id: number,
        course_id: number
    ) {
        const sort = { updated_time: 1 };
        const select_fields = {
            id: 1,
            calendar: 1,
            memo: 1,
            status: 1
        };
        const registered_class_list = await BookingActions.findAll(
            {
                student_id,
                status: [
                    EnumBookingStatus.COMPLETED,
                    EnumBookingStatus.STUDENT_ABSENT
                ],
                course_id
            },
            sort,
            select_fields
        );
        const registered_class = registered_class_list.length;

        const completed_class_list = registered_class_list.filter(
            (booking) => booking.status === EnumBookingStatus.COMPLETED
        );
        const completed_class = completed_class_list.length;
        const attendance_point = registered_class
            ? _.round((completed_class / registered_class) * 10, 2)
            : 0;

        const minStart = _.minBy(
            registered_class_list,
            (b) => b.calendar.start_time
        )?.calendar.start_time as number;
        const maxEnd = _.maxBy(
            registered_class_list,
            (b) => b.calendar.end_time
        )?.calendar.end_time as number;
        const monthStarts = eachMonthOfInterval({
            start: minStart,
            end: maxEnd
        });
        const months: SegmentPoint[] = monthStarts.map((start) => ({
            start_time: +start,
            end_time: +endOfMonth(start)
        }));
        for (const month of months) {
            const registered = registered_class_list.filter(
                (booking) =>
                    booking.calendar.start_time >= month.start_time &&
                    booking.calendar.end_time <= month.end_time
            ).length;
            const completed = completed_class_list.filter(
                (booking) =>
                    booking.calendar.start_time >= month.start_time &&
                    booking.calendar.end_time <= month.end_time
            ).length;
            month.attendance_point = registered
                ? _.round((completed / registered) * 10, 2)
                : 0;
        }

        const bookingWithMemos: Booking[] = [];
        let class_that_have_memo = 0;
        let attitude_point_sum = 0;
        for (const booking of completed_class_list) {
            if (booking.memo && booking.memo.note) {
                const assessments = booking.memo.note;
                if (assessments.length > 0) {
                    bookingWithMemos.push(booking);
                    class_that_have_memo++;
                    let sum = 0;
                    for (const assessment of assessments) {
                        sum += assessment.point;
                    }
                    const point = sum / assessments.length;
                    attitude_point_sum += point;
                    const month = months.find(
                        (m) =>
                            booking.calendar.start_time >= m.start_time &&
                            booking.calendar.end_time <= m.end_time
                    );
                    if (month) {
                        if (!month.attitude_point) month.attitude_point = 0;
                        month.attitude_point += point;
                    }
                }
            }
        }
        const attitude_point = class_that_have_memo
            ? _.round(attitude_point_sum / class_that_have_memo, 2)
            : 0;
        for (const month of months) {
            const classes = bookingWithMemos.filter(
                (booking) =>
                    booking.calendar.start_time >= month.start_time &&
                    booking.calendar.end_time <= month.end_time
            ).length;
            if (classes) {
                month.attitude_point = _.round(
                    (month.attitude_point as number) / classes,
                    2
                );
            }
        }

        const summary = {
            registered_class,
            completed_class,
            attendance_point,
            attitude_point,
            segments: months
        };
        return summary;
    }

    public static async getStudentsNeedingMonthlyMemo(
        req: ProtectedRequest,
        res: Response
    ) {
        const { month, year, page_size, page_number } = req.query;
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
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
        const filter = {
            status: [EnumBookingStatus.COMPLETED],
            min_start_time: request_month_start.valueOf(),
            max_end_time: request_month_start.add(1, 'month').valueOf(),
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        const results = await BookingActions.findStudentsNeedingMonthlyMemo(
            filter
        );
        if (results.length > 0) {
            res_payload.data = results[0].data;
            res_payload.pagination = results[0].pagination;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTeacherToCommentMonthlyMemo(
        student_id: number,
        month: number,
        year: number
    ) {
        const start_time = moment
            .utc()
            .year(year)
            .month(month - 1)
            .startOf('month')
            .valueOf();
        const end_time = moment
            .utc()
            .year(year)
            .month(month - 1)
            .startOf('month')
            .add(1, 'month')
            .valueOf();

        const complete_filter = {
            student_id,
            status: [EnumBookingStatus.COMPLETED],
            min_start_time: start_time,
            max_end_time: end_time
        };
        const booking_count = await BookingActions.count(complete_filter);
        if (booking_count < 2) {
            return null;
        }

        const teacher_results = await BookingActions.findTeacherToCommentOnMemo(
            complete_filter,
            booking_count / 2
        );
        if (teacher_results.length <= 0) {
            return null;
        }
        const teacher_info = {
            teacher_id: teacher_results[0]._id,
            teacher: teacher_results[0].teacher
        };
        return teacher_info;
    }

    public static async getTeacherToCommentCourseMemo(
        student_id: number,
        course_id: number
    ) {
        const complete_filter = {
            student_id,
            status: [EnumBookingStatus.COMPLETED],
            course_id
        };
        const booking_count = await BookingActions.count(complete_filter);
        if (booking_count < 2) {
            return null;
        }

        const teacher_results = await BookingActions.findTeacherToCommentOnMemo(
            complete_filter,
            booking_count / 2
        );
        if (teacher_results.length <= 0) {
            return null;
        }
        const teacher_info = {
            teacher_id: teacher_results[0]._id,
            teacher: teacher_results[0].teacher
        };
        return teacher_info;
    }

    /**
     * @description Call whenever a student finish a lesson.
     *              When the student learns enough units in a course,
     *              we need to create a course memo for them.
     *              Note that this needs to be called after booking
     *              status had been updated to COMPLETE
     * @param student_id ID of the student
     * @param course_id ID of the course
     */
    public static async checkForEndOfCourse(
        req: ProtectedRequest,
        student_id: number,
        course_id: number
    ) {
        logger.info('checkForEndOfCourse');
        if (DEFAULT_TRIAL_COURSE_ID == course_id) {
            logger.error(
                'Should not call checkForEndOfCourse() for trial course'
            );
            return;
        }
        const learnt_unit_list = await BookingActions.getLearntUnitIds({
            student_id,
            status: [EnumBookingStatus.COMPLETED],
            course_id
        });
        const learnt_units = learnt_unit_list.length;

        const units_in_course = await UnitActions.count({
            course_id,
            is_active: true
        });
        if (units_in_course <= 0) {
            logger.info(
                `Error after learning course id ${course_id}, no units in this course`
            );
            return;
        }

        const learnt_rate = (learnt_units / units_in_course) * 100;
        logger.info(`learn rate ${learnt_rate}`);
        if (learnt_rate >= MIN_LEARNT_UNITS_RATE_TO_CREATE_COURSE_MEMO) {
            //TODO create course memo
            // get final exam
            let increaseLevel = false;
            if (learnt_units == 100) {
                //get final exam of course
                const finalExam = await UnitActions.getUnitOfFinalExam(
                    course_id
                );
                if (finalExam) {
                    const route = `${config.get(
                        'services.quiz_svc.url'
                    )}/internal/quiz-sessions?user_id=${student_id}&quiz_id=${
                        finalExam.exam?.id
                    }`;
                    const options: any = {
                        method: 'get',
                        headers: {
                            'Content-Type': 'application/json; charset=utf-8',
                            'api-key': KEY
                        },
                        url: route
                    };
                    //get exam sessions
                    const response = await axios(options);
                    if (ResponseStatus.SUCCESS != response.status) {
                        throw new BadRequestError(
                            'Cannot make request to quiz svc'
                        );
                    }
                    if (response.data.data.data.length !== 0) {
                        //compare user score
                        const session = response.data.data.data[0];
                        increaseLevel =
                            session.user_score / session.score >= 0.5;
                    } else {
                    }
                }
            }

            const memo_create_request = {
                body: {
                    student_id,
                    type: EnumScheduledMemoType.COURSE,
                    course_id,
                    increaseLevel
                },
                t: req.t
            };
            const result = await ScheduledMemoController.createScheduledMemo(
                memo_create_request as ProtectedRequest
            );
            logger.info(`creat schedule memo resutl: ${result.created}`);

            if (result.created) {
                if (result.memo.teacher_id) {
                    const notification_template = await TemplateActions.findOne(
                        {
                            code: BackEndNotification.TEACHER_HAVE_NEW_COURSE_MEMO
                        }
                    );
                    if (
                        !result.memo.teacher ||
                        !result.memo.student ||
                        !result.memo.course
                    ) {
                        throw new InternalError(
                            req.t('errors.scheduled_memo.corrupted_data')
                        );
                    }
                    if (notification_template) {
                        const notification_payload = {
                            teacher_name: result.memo.teacher.full_name,
                            student_name: result.memo.student.full_name,
                            course_name: result.memo.course.name
                        };
                        natsClient.publishEventWithTemplate({
                            template: notification_template.content,
                            data: notification_payload,
                            receiver: result.memo.teacher_id,
                            template_obj_id: notification_template._id
                        });
                    }
                } else {
                    /** Generate comments on course memo without teachers */
                    const memo_edit_request = {
                        body: {},
                        t: req.t
                    };
                    const memo = await ScheduledMemoActions.findOne({
                        id: parseInt(result.memo.id as string)
                    });
                    if (!memo) {
                        throw new BadRequestError(
                            req.t('errors.scheduled_memo.not_found')
                        );
                    }
                    await ScheduledMemoController.editScheduledMemo(
                        memo_edit_request as ProtectedRequest,
                        memo
                    );
                }
            } else {
                if (result.exists) {
                    if (learnt_rate >= LEARNT_UNITS_RATE_FOR_LATE_COURSE_MEMO) {
                        const late_memo = await ScheduledMemoActions.findOne({
                            student_id,
                            course_id,
                            teacher_commented: false
                        });
                        if (late_memo) {
                            if (result.memo.teacher_id) {
                                const notification_template =
                                    await TemplateActions.findOne({
                                        code: BackEndNotification.TEACHER_HAVE_LATE_COURSE_MEMO
                                    });
                                if (
                                    !result.memo.teacher ||
                                    !result.memo.student ||
                                    !result.memo.course
                                ) {
                                    throw new InternalError(
                                        req.t(
                                            'errors.scheduled_memo.corrupted_data'
                                        )
                                    );
                                }
                                if (notification_template) {
                                    const notification_payload = {
                                        teacher_name:
                                            result.memo.teacher.full_name,
                                        student_name:
                                            result.memo.student.full_name,
                                        course_name: result.memo.course.name
                                    };
                                    natsClient.publishEventWithTemplate({
                                        template: notification_template.content,
                                        data: notification_payload,
                                        receiver: result.memo.teacher_id,
                                        template_obj_id:
                                            notification_template._id
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * @description Called whenever a student create/edit a reservation request
     *              or when admin approve these kinds of request
     * @param req HTTP request (used for translation messages)
     * @param student_id <number> - ID of the student
     * @param ordered_package_id <number> - ID of the ordered package in the
     *                           reservation request
     * @param start_time <number> - Start time of the study reservation
     * @param end_time <number> - End time of the study reservation
     * @param to_cancel_bookings <boolean> - Do we cancel these bookings right
     *                           away or leave it to students/admins?
     */
    public static async checkBookingsInStudentReservationPeriod(
        req: ProtectedRequest,
        student_id: number,
        ordered_package_id: number,
        start_time: number,
        end_time: number,
        to_cancel_bookings: boolean
    ) {
        const check_bookings = await BookingActions.findAll({
            min_start_time: start_time,
            max_end_time: end_time,
            student_id,
            ordered_package_id,
            status: [EnumBookingStatus.PENDING, EnumBookingStatus.CONFIRMED]
        });
        if (check_bookings.length > 0) {
            if (!to_cancel_bookings) {
                throw new BadRequestError(
                    req.t('errors.student_reservation_request.booking_exists')
                );
            }
            await Promise.all(
                check_bookings.map(async (booking) => {
                    await BookingController.onBookingStatusChange(
                        req,
                        booking,
                        EnumBookingStatus.CANCEL_BY_STUDENT
                    );
                    const diff = {
                        reported_absence_at: new Date().getTime(),
                        reason: 'Student reservation request',
                        status: EnumBookingStatus.CANCEL_BY_STUDENT
                    };
                    await BookingActions.update(booking._id, diff as Booking);
                    return;
                })
            );
        }
    }

    public static async checkRecentUnratedBookings(
        req: ProtectedRequest,
        res: Response
    ) {
        const check_moment =
            new Date().getTime() -
            RECENT_COMPLETED_BOOKINGS_MINUTES * MINUTE_TO_MS;
        const filter = {
            status: [EnumBookingStatus.COMPLETED],
            finished_at: { $gte: check_moment },
            student_rating: { $eq: null }
        };
        const sort = {
            student_id: 1
        };
        const select_fields = {
            student_id: 1,
            student: 1,
            course: 1,
            unit: 1,
            calendar: 1
        };
        const recent_unrated_bookings = await BookingActions.findAll(
            filter,
            sort,
            select_fields
        );
        Promise.all(
            recent_unrated_bookings.map(async (booking: Booking) => {
                const payload = {
                    unit_name: booking.unit.name,
                    start_time: booking.calendar.start_time,
                    teacher_name: `${booking.teacher.full_name}`,
                    student_name: `${booking.student.full_name}`
                };

                const notification_template = await TemplateActions.findOne({
                    code: BackEndNotification.COMPLETED_CLASS_WITHOUT_RATING
                });
                if (notification_template) {
                    await natsClient.publishEventWithTemplate({
                        template: notification_template.content,
                        data: payload,
                        receiver: booking.student_id,
                        template_obj_id: notification_template._id
                    });
                }
            })
        );
        return new SuccessResponse(
            req.t('common.success'),
            recent_unrated_bookings
        ).send(res, req);
    }

    public static async generateBookingJoinUrl(
        req: ProtectedRequest,
        booking: Booking,
        typeLinkHMP?: any
    ) {
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'BookingModel',
            booking,
            pickUpData
        );
        let join_url = ``;
        let medium_info: any = {};
        switch (booking?.learning_medium?.medium_type) {
            case EnumBookingMediumType.HAMIA_MEET: {
                if (booking.student_id) {
                    if (
                        booking?.learning_medium?.info?.student_link &&
                        booking?.learning_medium?.info?.teacher_link
                    ) {
                        if (typeLinkHMP === linkHMPType.TEACHER) {
                            join_url =
                                booking?.learning_medium?.info?.teacher_link;
                        } else if (typeLinkHMP === linkHMPType.STUDENT) {
                            join_url =
                                booking?.learning_medium?.info?.student_link;
                        }
                        medium_info = {
                            learning_medium: {
                                medium_type: EnumBookingMediumType.HAMIA_MEET,
                                info: {
                                    student_link:
                                        booking?.learning_medium?.info
                                            ?.student_link,
                                    teacher_link:
                                        booking?.learning_medium?.info
                                            ?.teacher_link
                                }
                            }
                        };
                    } else {
                        const dataCmsHmpInfo =
                            await CMSHamiaMeetPlusInfoActions.findOne({
                                booking_id: booking?.id,
                                student_id: Number(booking.student_id),
                                teacher_id: Number(booking.teacher_id)
                            });
                        if (dataCmsHmpInfo) {
                            const studentLink =
                                await CMSHamiaMeetPlusInfoController.generateLinkHMP(
                                    RoleHMPType.STUDENT,
                                    dataCmsHmpInfo.cms_room_id,
                                    dataCmsHmpInfo.cms_student_username,
                                    dataCmsHmpInfo.cms_student_room_token
                                );
                            const teacherLink =
                                await CMSHamiaMeetPlusInfoController.generateLinkHMP(
                                    RoleHMPType.TEACHER,
                                    dataCmsHmpInfo.cms_room_id,
                                    dataCmsHmpInfo.cms_teacher_username,
                                    dataCmsHmpInfo.cms_teacher_room_token
                                );

                            if (typeLinkHMP === linkHMPType.TEACHER) {
                                join_url = teacherLink;
                            } else if (typeLinkHMP === linkHMPType.STUDENT) {
                                join_url = studentLink;
                            }
                            medium_info = {
                                learning_medium: {
                                    medium_type:
                                        EnumBookingMediumType.HAMIA_MEET,
                                    info: {
                                        student_link: studentLink,
                                        teacher_link: teacherLink
                                    }
                                }
                            };
                        }
                    }
                }
                // const user = {
                //     id: 0,
                //     email: '',
                //     fullname: '',
                //     avatar: '',
                //     type: '',
                //     others: new Array<number>()
                // };
                // if (req.user.isAdmin) {
                //     user.id = req.user._id;
                //     user.email = req.user.email ?? '';
                //     user.fullname = req.user.name;
                //     user.type = 'admin';
                //     user.others.push(booking.teacher_id);
                //     user.others.push(booking.student_id);
                // } else if (req.user) {
                //     user.id = req.user.id;
                //     user.email = req.user.email;
                //     user.fullname = req.user.name;
                //     user.avatar = req.user.avatar ?? '';
                //     for (const role_string of roleString) {
                //         if (req.user.role.includes(role_string.id)) {
                //             user.type = role_string.role;
                //             break;
                //         }
                //     }
                //     if (!user.type) {
                //         return null;
                //     }
                //     if (req.user.role.includes(RoleCode.STUDENT)) {
                //         user.others.push(booking.teacher_id);
                //     } else if (req.user.role.includes(RoleCode.TEACHER)) {
                //         user.others.push(booking.student_id);
                //     }
                // } else {
                //     return null;
                // }
                // const meet_data = {
                //     user,
                //     data: booking.id,
                //     roomName: booking.unit.name,
                //     startTime: Math.round(booking.calendar.start_time / 1000),
                //     endTime: Math.round(booking.calendar.end_time / 1000),
                //     nowTime: Math.round(new Date().getTime() / 1000),
                //     document: booking.unit.teacher_document
                // };
                // const access_token = await getMeetAccessToken(meet_data);
                // join_url = `${HAMIA_MEET_URL}/${access_token}`;
                // medium_info = {
                //     learning_medium: {
                //         medium_type: EnumBookingMediumType.HAMIA_MEET,
                //         info: join_url
                //     }
                // };
                break;
            }
            case EnumBookingMediumType.SKYPE: {
                //get link join skype of student
                logger.info('get link join skype');
                if (
                    booking.learning_medium.info &&
                    booking.learning_medium.info.joinLink
                ) {
                    logger.info('booking has link');
                    return booking.learning_medium.info.joinLink;
                } else {
                    let learning_medium_info: any = {};
                    try {
                        if (booking.student_id) {
                            const student = await UserActions.findOne({
                                id: Number(booking.student_id)
                            });
                            if (
                                student &&
                                student?.trial_class_skype_url?.joinLink
                            ) {
                                logger.info(
                                    'get link join skype by link student'
                                );
                                learning_medium_info =
                                    student.trial_class_skype_url;
                            }

                            if (!learning_medium_info.joinLink) {
                                const skypeNew: any =
                                    await SkypeMeetingPoolActions.findOne({
                                        status: EnumStatus.NEW,
                                        is_active: true
                                    });

                                if (skypeNew) {
                                    logger.info(
                                        'get link join skype by link skype pool'
                                    );
                                    learning_medium_info = skypeNew.info;
                                    SkypeMeetingPoolActions.update(
                                        skypeNew._id,
                                        { status: EnumStatus.USED }
                                    );
                                    if (student) {
                                        await UserActions.update(student?._id, {
                                            trial_class_skype_url: skypeNew.info
                                        } as User);
                                    }
                                }
                            }
                        }
                        // const learning_medium_info =
                        //     await SkypeApiServices.createSkypeMeeting(
                        //         `Lesson ${booking.unit.name}, ID #${booking.id}`,
                        //         `English Plus Admin`
                        //     );
                        medium_info = {
                            learning_medium: {
                                medium_type: EnumBookingMediumType.SKYPE,
                                info: learning_medium_info
                            }
                        };
                        join_url = learning_medium_info.joinLink;
                        logger.info(`link join skype: ${join_url}`);
                    } catch (error) {
                        logger.error(
                            `create skype meeting: ${JSON.stringify(error)}`
                        );
                        medium_info = {
                            learning_medium: {
                                medium_type: EnumBookingMediumType.SKYPE,
                                info: null
                            }
                        };
                        join_url = '';
                    }
                    if (!learning_medium_info.joinLink) {
                        throw new BadRequestError(
                            req.t('errors.skype.create_meeting_failed')
                        );
                    }
                }

                break;
            }
            default: {
                const user = {
                    id: 0,
                    email: '',
                    fullname: '',
                    avatar: '',
                    type: '',
                    others: new Array<number>()
                };
                if (req.user.isAdmin) {
                    user.id = req.user._id;
                    user.email = req.user.email ?? '';
                    user.fullname = req.user.name;
                    user.type = 'admin';
                    user.others.push(booking.teacher_id);
                    user.others.push(booking.student_id);
                } else if (req.user) {
                    user.id = req.user.id;
                    user.email = req.user.email;
                    user.fullname = req.user.name;
                    user.avatar = req.user.avatar ?? '';
                    for (const role_string of roleString) {
                        if (req.user.role.includes(role_string.id)) {
                            user.type = role_string.role;
                            break;
                        }
                    }
                    if (!user.type) {
                        return null;
                    }
                    if (req.user.role.includes(RoleCode.STUDENT)) {
                        user.others.push(booking.teacher_id);
                    } else if (req.user.role.includes(RoleCode.TEACHER)) {
                        user.others.push(booking.student_id);
                    }
                } else {
                    return null;
                }
                const meet_data = {
                    user,
                    data: booking.id,
                    roomName: booking.unit.name,
                    startTime: Math.round(booking.calendar.start_time / 1000),
                    endTime: Math.round(booking.calendar.end_time / 1000),
                    nowTime: Math.round(new Date().getTime() / 1000),
                    document: booking.unit.teacher_document
                };
                const access_token = await getMeetAccessToken(meet_data);
                join_url = `${HAMIA_MEET_URL}/${access_token}`;
                medium_info = {
                    learning_medium: {
                        medium_type: EnumBookingMediumType.HAMIA_MEET,
                        info: join_url
                    }
                };
                break;
            }
        }
        const newBooking = await BookingActions.update(
            booking._id,
            medium_info as Booking
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'BookingModel',
            newBooking,
            pickUpData
        );
        return join_url;
    }

    public static async getStatisticBookingsByQuery(query: any) {
        let res_payload = {
            total_class: 0,
            total_completed: 0,
            total_cancel: 0,
            total_cancel_by_teacher: 0,
            total_cancel_by_student: 0,
            total_absent: 0,
            total_absent_by_teacher: 0,
            total_absent_by_student: 0,
            total_late: 0,
            total_change_teacher: 0
        };
        const filter: any = { ...query };
        if (filter?.status && filter?.status?.length > 0) {
            const total_class = await BookingActions.count(filter);
            res_payload.total_class = total_class;
            switch (filter.status[0]) {
                case EnumBookingStatus.COMPLETED: {
                    res_payload.total_completed = total_class;
                    break;
                }
                case EnumBookingStatus.CANCEL_BY_TEACHER: {
                    res_payload.total_cancel_by_teacher = total_class;
                    res_payload.total_cancel = total_class;
                    break;
                }
                case EnumBookingStatus.CANCEL_BY_STUDENT: {
                    res_payload.total_cancel_by_student = total_class;
                    res_payload.total_cancel = total_class;
                    break;
                }
                case EnumBookingStatus.STUDENT_ABSENT: {
                    res_payload.total_absent_by_student = total_class;
                    res_payload.total_absent = total_class;
                    break;
                }
                case EnumBookingStatus.TEACHER_ABSENT: {
                    res_payload.total_absent_by_teacher = total_class;
                    res_payload.total_absent = total_class;
                    break;
                }
                default:
                    break;
            }
        } else {
            filter.status = [];
            const total_class = await BookingActions.count(filter);
            filter.status = [EnumBookingStatus.COMPLETED];
            const total_completed = await BookingActions.count(filter);
            filter.status = [
                EnumBookingStatus.CANCEL_BY_ADMIN,
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CANCEL_BY_TEACHER
            ];
            const total_cancel = await BookingActions.count(filter);
            filter.status = [EnumBookingStatus.CANCEL_BY_TEACHER];
            const total_cancel_by_teacher = await BookingActions.count(filter);
            filter.status = [EnumBookingStatus.CANCEL_BY_STUDENT];
            const total_cancel_by_student = await BookingActions.count(filter);
            filter.status = [
                EnumBookingStatus.TEACHER_ABSENT,
                EnumBookingStatus.STUDENT_ABSENT
            ];
            const total_absent = await BookingActions.count(filter);
            filter.status = [EnumBookingStatus.TEACHER_ABSENT];
            const total_absent_by_teacher = await BookingActions.count(filter);
            filter.status = [EnumBookingStatus.STUDENT_ABSENT];
            const total_absent_by_student = await BookingActions.count(filter);
            res_payload = {
                ...res_payload,
                total_class,
                total_completed,
                total_cancel,
                total_cancel_by_teacher,
                total_cancel_by_student,
                total_absent,
                total_absent_by_teacher,
                total_absent_by_student
            };
        }
        return res_payload;
    }

    public static async getStatisticBookingsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            status,
            search,
            type,
            max_end_time,
            min_start_time,
            staff_id,
            teacher_id,
            student_id
        } = req.query;
        let filter: any = {
            status: new Array<number>(),
            $or: []
        };
        if (status) {
            const status_int = parseInt(status as string);
            if (!isNaN(status_int)) {
                filter.status.push(status_int);
            }
        }
        if (min_start_time) {
            filter.min_start_time = parseInt(min_start_time as string);
        }
        if (max_end_time) {
            filter.max_end_time = parseInt(max_end_time as string);
        }
        const date = new Date();
        const valid_date = date.setMonth(date.getMonth() - 6);

        if (
            parseInt(min_start_time as string) >
                parseInt(max_end_time as string) ||
            parseInt(min_start_time as string) < new Date(valid_date).getTime()
        ) {
            const res_payload = {
                total_class: 0,
                total_completed: 0,
                total_cancel: 0,
                total_cancel_by_teacher: 0,
                total_cancel_by_student: 0,
                total_absent: 0,
                total_absent_by_teacher: 0,
                total_absent_by_student: 0
            };
            return new SuccessResponse('success', res_payload).send(res, req);
        }
        let name_query_list = [];
        let student_query_list = [];
        const studentQuery = [];
        if (staff_id) {
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
            student_query_list =
                await BookingController.buildNameSearchAndStaffSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    },
                    staff_id as string
                );

            for (const query of student_query_list) {
                studentQuery.push(query);
            }
        } else {
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
        }
        const nameQuery = [];
        for (const query of name_query_list) {
            nameQuery.push(query);
        }
        const orderTrials = await OrderedPackageActions.findAll({
            type: [EnumPackageOrderType.TRIAL]
        });
        const package_ids = orderTrials.map((e) => e.id);
        const orQuery = [];
        if (Array.isArray(type)) {
            for (const e of type) {
                if (parseInt(e as string) === TYPE.TRIAL) {
                    orQuery.push({
                        is_regular_booking: false,
                        ordered_package_id: { $in: package_ids }
                    });
                } else if (parseInt(e as string) === TYPE.REGULAR) {
                    orQuery.push({
                        is_regular_booking: true,
                        ordered_package_id: { $nin: package_ids }
                    });
                } else if (parseInt(e as string) === TYPE.FLEXIBLE) {
                    orQuery.push({
                        is_regular_booking: false,
                        ordered_package_id: { $nin: package_ids }
                    });
                }
            }
            if (search || staff_id) {
                filter.$and = [];
            }
            if (search) filter.$and.push({ $or: orQuery }, { $or: nameQuery });
            if (!search && staff_id) filter.$and.push({ $or: orQuery });
            if (staff_id && studentQuery && studentQuery.length > 0)
                filter.$and.push({ $and: studentQuery });
            if (!search && !staff_id) filter.$or = orQuery;
        } else {
            switch (parseInt(type as string)) {
                case TYPE.TRIAL: {
                    filter = {
                        ...filter,
                        ...{
                            is_regular_booking: false,
                            ordered_package_id: { $in: package_ids }
                        }
                    };
                    break;
                }
                case TYPE.REGULAR: {
                    filter = {
                        ...filter,
                        ...{
                            is_regular_booking: true,
                            ordered_package_id: { $nin: package_ids }
                        }
                    };
                    break;
                }
                case TYPE.FLEXIBLE: {
                    filter = {
                        ...filter,
                        ...{
                            is_regular_booking: false,
                            ordered_package_id: { $nin: package_ids }
                        }
                    };
                    break;
                }
                default:
                    break;
            }
            filter.$or = nameQuery;
            if (staff_id && studentQuery && studentQuery.length > 0)
                filter.$and = studentQuery;
        }
        if (student_id) {
            filter.student_id = Number(student_id);
        }
        if (teacher_id) {
            filter.teacher_id = Number(teacher_id);
        }
        const res_payload = await BookingController.getStatisticBookingsByQuery(
            filter
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /**
     * @description When teacher input memo, check if teacher is late or not
     * @param booking The booking that teachers input memo
     * @param is_trial_memo Whether this memo is normal memo or trial memo
     * @returns true or false: teacher is late on input memo or not?
     */
    public static checkBookingMemoTime(
        booking: Booking,
        is_trial_memo: boolean
    ): boolean {
        let late_memo = false;
        if (!booking.finished_at) {
            return late_memo;
        }
        const memo_deadline_hour = is_trial_memo
            ? TRIAL_MEMO_LATE_HOUR
            : NORMAL_MEMO_LATE_HOUR;
        const memo_deadline = moment(booking.finished_at)
            .utcOffset('+07:00')
            .startOf('day')
            .add({
                days: 1,
                hours: memo_deadline_hour
            })
            .valueOf();
        const current_moment = new Date().getTime();
        if (memo_deadline < current_moment) {
            late_memo = true;
        }
        return late_memo;
    }

    public static async getTeachersTrialReport(
        req: ProtectedRequest,
        res: Response
    ) {
        const { start_time, end_time, page_size, page_number, teacher_id } =
            req.query;
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        if (parseInt(start_time as string) && parseInt(end_time as string)) {
            const filter = {
                min_start_time: parseInt(start_time as string),
                max_end_time: parseInt(end_time as string),
                status: [EnumBookingStatus.COMPLETED],
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string)
            } as any;
            if (teacher_id) {
                filter.teacher_id = Number(teacher_id);
            }
            const res_agg =
                await BookingActions.getTrialAndPaidStudentsByTeacher(filter);
            if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
                res_payload.data = res_agg[0].data;
                res_payload.pagination.total = res_agg[0].pagination.total;
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTrialBookingsOfTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const { start_time, end_time, page_size, page_number } = req.query;
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        if (
            parseInt(start_time as string) &&
            parseInt(end_time as string) &&
            parseInt(teacher_id as string)
        ) {
            const filter = {
                min_start_time: parseInt(start_time as string),
                max_end_time: parseInt(end_time as string),
                teacher_id: parseInt(teacher_id as string),
                status: [EnumBookingStatus.COMPLETED],
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string)
            };
            const res_agg = await BookingActions.getTrialBookingsOfTeacher(
                filter
            );
            if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
                res_payload.data = res_agg[0].data;
                res_payload.pagination.total = res_agg[0].pagination.total;
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async academyReportAboutStatusClasses(
        req: ProtectedRequest,
        res: Response
    ) {
        const { start_time, end_time } = req.query;
        const res_payload: any = {
            data: [],
            pagination: {
                total: 0
            }
        };
        if (!start_time || !end_time) {
            return new SuccessResponse('success', res_payload).send(res, req);
        }
        if (start_time > end_time)
            throw new BadRequestError(req.t('errors.common.invalid_time'));
        if (
            moment(_.toInteger(end_time)).diff(
                moment(_.toInteger(start_time)),
                'days'
            ) > MAX_DAYS_QUERY_REPORT
        )
            throw new BadRequestError(req.t('errors.common.invalid_time'));
        const list_dates = enumerateDaysBetweenDates(
            _.toInteger(start_time),
            _.toInteger(end_time)
        );
        const statistic = await Promise.all(
            list_dates.map(async (item) => {
                const tmp: any =
                    await BookingController.getStatisticBookingsByQuery({
                        min_start_time: moment(item).startOf('day').valueOf(),
                        max_end_time: moment(item).endOf('day').valueOf()
                    });
                tmp.date = item;
                return tmp;
            })
        );
        res_payload.data = _.sortBy(statistic, 'date');
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getMonthlyTeacherAbsenceReport(
        req: ProtectedRequest,
        res: Response
    ) {
        const { month, year, teacher_id } = req.query;
        const res_payload = new Array<any>();
        if (parseInt(month as string) && parseInt(year as string)) {
            const days = new Array<any>();
            const start_of_month = moment()
                .utc()
                .month(parseInt(month as string) - 1)
                .year(parseInt(year as string))
                .startOf('month')
                .valueOf();
            const end_of_month = moment(start_of_month)
                .add(1, 'months')
                .valueOf();
            let start_of_day = start_of_month;
            let end_of_day = start_of_day + DAY_TO_MS;
            while (start_of_day != end_of_month) {
                const teachers = await BookingActions.getTeacherAbsenceCount(
                    start_of_day,
                    end_of_day,
                    teacher_id
                );
                days.push({
                    teachers
                });
                start_of_day = end_of_day;
                end_of_day += DAY_TO_MS;
            }
            const teacher_map = new Map();
            for (const index in days) {
                for (const teacher of days[index].teachers) {
                    if (!teacher_map.has(teacher.teacher_id)) {
                        const teacher_data = {
                            teacher_id: teacher.teacher_id,
                            full_name: teacher.teacher_name,
                            avatar: teacher.teacher_avatar,
                            staff_id: teacher.staff_id,
                            staff_name: teacher.staff_name,
                            days_in_month: new Array(days.length)
                        };
                        teacher_data.days_in_month.fill({
                            total_unauthorized_leave: 0,
                            total_authorized_leave: 0
                        });
                        teacher_map.set(teacher.teacher_id, teacher_data);
                    }
                    teacher_map.get(teacher.teacher_id).days_in_month[index] = {
                        total_unauthorized_leave:
                            teacher.total_unauthorized_leave,
                        total_authorized_leave: teacher.total_authorized_leave
                    };
                }
            }
            teacher_map.forEach((teacher_data) => {
                res_payload.push(teacher_data);
            });
            res_payload.sort((a, b) => {
                return a.teacher_id - b.teacher_id;
            });
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAbsenceReportEachTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const start_time = parseInt(req.query.start_time as string);
        const end_time = parseInt(req.query.end_time as string);
        let res_payload = new Array<any>();

        if (start_time && end_time) {
            if (end_time - start_time <= WEEK_TO_MS) {
                res_payload = await BookingActions.getTeacherAbsenceData(
                    parseInt(teacher_id as string),
                    start_time,
                    end_time
                );
            }
        }

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async buildNameSearchAndStaffSearchQueryForBooking(
        search: string,
        search_field: any,
        staff_search: string
    ) {
        const name_query: Array<any> = [];
        if ((!search || search.length <= 0) && !staff_search) {
            return name_query;
        }
        const user_id_list = new Array<number>();
        if (
            search_field.hasOwnProperty('student_id') ||
            search_field.hasOwnProperty('teacher_id')
        ) {
            const user_list = await UserActions.findAll({ name: search });
            for (const user of user_list) {
                user_id_list.push(user.id);
            }
        }

        const listStudentOfStaff = await StudentActions.findAll({
            staff_id: staff_search
        });
        const listUserStudent = new Array<number>();
        let listStudent = new Array<number>();
        if (listStudentOfStaff) {
            for (const student of listStudentOfStaff) {
                listUserStudent.push(student.user_id);
            }
            listStudent = listUserStudent;
            if (search_field.hasOwnProperty('student_id')) {
                listStudent = [];
                for (const userCheck of user_id_list) {
                    if (listUserStudent.includes(userCheck)) {
                        listStudent.push(userCheck);
                    }
                }
            }
        } else {
            if (search_field.hasOwnProperty('student_id')) {
                listStudent = user_id_list;
            }
        }
        if (listStudent) {
            name_query.push({
                student_id: { $in: listStudent }
            });
        }

        return name_query;
    }

    public static async notiRemineClass(req: ProtectedRequest, res: Response) {
        const time = moment().startOf('hour');
        if (moment().minute() >= 30) {
            time.set('minute', 30);
        }
        time.add(1, 'hour');
        logger.info(`notiRemine time: ${time}`);
        // remind all booking regular, flexible
        const listBooking = await BookingActions.getAllBookingsByStatus({
            status: [EnumBookingStatus.CONFIRMED],
            'calendar.start_time': time.valueOf(),
            'ordered_package.type': [
                EnumPackageOrderType.STANDARD,
                EnumPackageOrderType.PREMIUM
            ]
        });
        logger.info(
            `=====> notiRemineClass - count booking: ${listBooking.length}`
        );
        for (const iterator of listBooking) {
            // Notify
            logger.info(
                `notiRemineClass - student id: ${iterator?.student?.id} - zalo id: ${iterator?.student?.zalo_id}`
            );
            const dataPayload = {
                student_name: iterator.student.full_name,
                student_username: iterator.student.username,
                student_id: iterator.student.id,
                teacher_name: iterator.teacher.full_name,
                time: moment(iterator.calendar.start_time).format(
                    'HH:mm DD/MM/YYYY'
                ),
                course_name: iterator.course.name,
                unit_name: iterator.unit.name
            };
            await natsClient.publishEventZalo(
                iterator.student_id,
                ZaloOANotification.REMINE_CLASS,
                dataPayload
            );
        }

        // remind all booking trial
        const listBookingTrial = await BookingActions.getAllBookingsByStatus({
            status: [EnumBookingStatus.CONFIRMED],
            'calendar.start_time': time.valueOf(),
            'ordered_package.type': EnumPackageOrderType.TRIAL
        });
        logger.info(
            `=====> notiRemineClassTrial - count booking: ${listBookingTrial.length}`
        );
        for (const iterator of listBookingTrial) {
            logger.info(
                `notiRemineClassTrial - student id: ${iterator?.student?.id} - zalo id: ${iterator?.student?.zalo_id}`
            );
            if (iterator?.student?.zalo_id) {
                // Notify ZALO OA
                logger.info(
                    `Notify ZALO OA Remine Class Trial - student_id: ${iterator?.student_id}`
                );
                const dataPayload = {
                    student_name: iterator.student.full_name,
                    student_username: iterator.student.username,
                    student_id: iterator.student.id,
                    teacher_name: iterator.teacher.full_name,
                    time: moment(iterator.calendar.start_time).format(
                        'HH:mm DD/MM/YYYY'
                    )
                };
                await natsClient.publishEventZalo(
                    iterator.student_id,
                    ZaloOANotification.REMINE_TRIAL_CLASS,
                    dataPayload
                );
            } else {
                // Notify ZNS
                logger.info(
                    `Notify ZNS Remine Class Trial - student_id: ${iterator?.student_id}`
                );
                const dataPayload = {
                    student_name: iterator.student.full_name,
                    student_id: iterator.student.id,
                    teacher_name: iterator.teacher.full_name,
                    time: moment(iterator.calendar.start_time).format(
                        'HH:mm DD/MM/YYYY'
                    )
                };
                await natsClient.publishEventZNS(
                    iterator.student_id,
                    ZNS_TEMPLATE.REMINE_TRIAL_CLASS,
                    dataPayload
                );
            }
        }

        // check noti HV chưa làm homework
        const timeCheckDoHomework = moment().startOf('hour');
        if (moment().minute() >= 30) {
            timeCheckDoHomework.set('minute', 30);
        }
        timeCheckDoHomework.subtract(24, 'hour');
        logger.info(`time check Homework: ${timeCheckDoHomework.valueOf()}`);
        const listBookingCheckDoHomwork =
            await BookingActions.getAllBookingsCheckDoHomework({
                status: EnumBookingStatus.COMPLETED,
                'calendar.end_time': timeCheckDoHomework.valueOf()
            });
        logger.info(
            `=====> Start notify student do not homework - count booking: ${listBookingCheckDoHomwork.length}`
        );
        for (const iterator of listBookingCheckDoHomwork) {
            const dataPayload = {
                student_name: iterator.student.full_name,
                teacher_name: iterator.teacher.full_name,
                time: moment(iterator.calendar.start_time).format(
                    'HH:mm DD/MM/YYYY'
                )
            };
            // thong bao remind hoc vien lam BTVN webapp
            const notiRemineDoHomework = await TemplateActions.findOne({
                code: BackEndNotification.REMINE_DO_HOME_WORK
            });

            logger.info(
                `Notify remine do homework - student_id: ${iterator?.student_id}`
            );
            if (notiRemineDoHomework) {
                await natsClient.publishEventWithTemplate({
                    template: notiRemineDoHomework.content,
                    data: dataPayload,
                    receiver: iterator.student_id,
                    template_obj_id: notiRemineDoHomework._id
                });
            }

            // thong bao remind hoc vien lam BTVN zaloOA
            logger.info(
                `Notify ZALO OA remine do homework - student_id: ${iterator?.student_id}`
            );
            await natsClient.publishEventZalo(
                iterator.student_id,
                ZaloOANotification.REMINE_DO_HOME_WORK,
                dataPayload
            );

            // thong bao hoc vien chua lam bai tap cho ben van hanh
            logger.info(
                `notify check student do homework  - booking id: ${iterator?.id}`
            );
            const operationIssue = await OperationIssueActions.create({
                booking_id: iterator.id,
                issue_description: 'Notification student do not homework',
                resolved_staff_id: null
            } as any);
            const operationIssueId = operationIssue?._id;
            const templatePayload = {
                booking_id: `${iterator.id}`,
                teacher_name: `${iterator.teacher?.full_name}`,
                student_name: `${iterator.student?.full_name}`,
                start_time: iterator.calendar.start_time
            };
            const notiCheckDoHomework = await TemplateActions.findOne({
                code: BackEndNotification.ALERT_DO_NOT_HOMEWORK
            });

            // Thông báo cho admin
            const adminOwner = await AdminActions.findOne({
                username: 'admin'
            });
            if (adminOwner && notiCheckDoHomework) {
                natsClient.publishEventWithTemplate({
                    template: notiCheckDoHomework.content,
                    data: templatePayload,
                    receiver: adminOwner._id,
                    template_obj_id: notiCheckDoHomework._id
                });
            }

            const cskhDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.CSKH
            });
            if (cskhDepartment && notiCheckDoHomework) {
                const managerCskh = await AdminModel.findOne({
                    department: {
                        department: cskhDepartment._id,
                        isRole: EnumRole.Manager
                    }
                });
                if (managerCskh) {
                    natsClient.publishEventWithTemplate({
                        template: notiCheckDoHomework.content,
                        data: templatePayload,
                        receiver: managerCskh._id,
                        template_obj_id: notiCheckDoHomework._id,
                        operation_issue_id: operationIssueId
                    });
                }
                const listDeputy = await AdminModel.find({
                    'department.department': cskhDepartment._id,
                    'department.isRole': EnumRole.Deputy_manager
                });

                if (listDeputy.length) {
                    listDeputy.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiCheckDoHomework.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiCheckDoHomework._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
                const listLeader = await AdminModel.find({
                    'department.department': cskhDepartment._id,
                    'department.isRole': EnumRole.Leader
                });

                if (listLeader.length) {
                    listLeader.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiCheckDoHomework.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiCheckDoHomework._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
                // thông báo cho nhân viên quản lý
                const student = await StudentModel.findOne({
                    user_id: iterator.student_id
                }).populate('staff');
                const checkExits = listLeader.find(
                    (e) => e.id === student?.staff?.id
                );
                if (student && student?.staff && !checkExits) {
                    natsClient.publishEventWithTemplate({
                        template: notiCheckDoHomework.content,
                        data: templatePayload,
                        receiver: student.staff._id,
                        template_obj_id: notiCheckDoHomework._id,
                        operation_issue_id: operationIssueId
                    });
                }
            }

            // thông báo cho all nhân viên phòng TNG
            const tngDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.TNG
            });
            if (tngDepartment && notiCheckDoHomework) {
                const allStaffTNG = await AdminModel.find({
                    'department.department': tngDepartment._id
                });
                if (allStaffTNG.length) {
                    allStaffTNG.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiCheckDoHomework.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiCheckDoHomework._id,
                            operation_issue_id: operationIssueId
                        });
                    });
                }
            }
        }

        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }

    public static async startTest(req: ProtectedRequest, res: Response) {
        const { id } = req.user;
        const { lesson_id, result_type } = req.body;

        const lesson = await BookingActions.findOne({
            student_id: id,
            id: parseInt(lesson_id as string)
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }

        // if (
        //     ![EnumBookingStatus.TEACHING, EnumBookingStatus.COMPLETED].includes(
        //         lesson.status
        //     )
        // ) {
        //     throw new BadRequestError(
        //         req.t('errors.booking.teaching_or_completed_required')
        //     );
        // }

        let testResultCode = null;
        let trialTestUrl = null;
        if (lesson.unit?.unit_type == EnumUnitType.IELTS_GRAMMAR) {
            const trialTestIeltsResult =
                await TrialTestIeltsResultActions.findOne({
                    test_type: EnumTestType.IELTS_GRAMMAR,
                    booking_id: lesson.id,
                    student_id: lesson.student_id
                });

            if (!trialTestIeltsResult) {
                throw new BadRequestError(
                    req.t('errors.trial_test_ielts_result.not_found')
                );
            }

            if (trialTestIeltsResult.test_result_grammar?.submission_time) {
                throw new BadRequestError(
                    req.t('errors.test_has_been_completed')
                );
            }

            testResultCode =
                trialTestIeltsResult.test_result_grammar.test_result_code;
            trialTestUrl = trialTestIeltsResult.test_url;
        } else if (lesson.unit?.unit_type == EnumUnitType.IELTS_4_SKILLS) {
            const trialTestIeltsResult =
                await TrialTestIeltsResultActions.findOne({
                    test_type: EnumTestType.IELTS_4_SKILLS,
                    booking_id: lesson.id,
                    student_id: lesson.student_id
                });

            if (!trialTestIeltsResult) {
                throw new BadRequestError(
                    req.t('errors.trial_test_ielts_result.not_found')
                );
            }
            if (result_type == 'ielts_listening') {
                if (
                    trialTestIeltsResult.test_result_listening?.submission_time
                ) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                testResultCode =
                    trialTestIeltsResult.test_result_listening
                        ?.test_result_code;
                trialTestUrl =
                    trialTestIeltsResult.test_result_listening?.sub_test_url;
            } else if (result_type == 'ielts_reading') {
                if (trialTestIeltsResult.test_result_reading?.submission_time) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                testResultCode =
                    trialTestIeltsResult.test_result_reading?.test_result_code;
                trialTestUrl =
                    trialTestIeltsResult.test_result_reading?.sub_test_url;
            } else if (result_type == 'ielts_writing') {
                if (trialTestIeltsResult.test_result_writing?.submission_time) {
                    throw new BadRequestError(
                        req.t('errors.test_has_been_completed')
                    );
                }

                testResultCode =
                    trialTestIeltsResult.test_result_writing?.test_result_code;
                trialTestUrl =
                    trialTestIeltsResult.test_result_writing?.sub_test_url;
            }
        } else {
            const isTestResult =
                await BookingController.checkTestResultTrialTest(lesson);
            if (isTestResult) {
                throw new BadRequestError(
                    req.t('errors.test_has_been_completed')
                );
            }

            const trialTestInfo =
                await BookingController.updateTrialBookingTest(req, lesson);

            testResultCode = trialTestInfo.testResultCode;
            trialTestUrl = trialTestInfo.trialTestUrl;
        }

        const dateCreateTestStr = moment().format('YYYY-MM-DD');
        const bookingStartDateStr = moment
            .unix(lesson.calendar.start_time / 1000)
            .format('YYYY-MM-DD');

        if (
            lesson.unit?.unit_type != EnumUnitType.IELTS_4_SKILLS &&
            dateCreateTestStr > bookingStartDateStr
        ) {
            throw new BadRequestError(req.t('errors.overtime_for_the_test'));
        }

        const res_payload = {
            data: {
                test_result_code: testResultCode,
                trial_test_url: trialTestUrl
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async editTestResultBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const { test_result_id, test_result, test_start_time } = req.body;
        logger.info(
            `>>> editTestResultBooking, test_result_id: ${test_result_id}`
        );
        logger.info(
            `>>> editTestResultBooking, test_start_time: ${test_start_time}`
        );

        const lesson = await BookingActions.findOne({
            test_result_id
        });
        if (!lesson) {
            throw new BadRequestError(req.t('errors.booking.not_found'));
        }

        // if (
        //     [EnumBookingStatus.TEACHING, EnumBookingStatus.CONFIRMED].includes(
        //         lesson.status
        //     )
        // ) {
        //     throw new BadRequestError(
        //         req.t('errors.booking.teaching_or_completed_required')
        //     );
        // }

        const isTestResult = await BookingController.checkTestResultTrialTest(
            lesson
        );
        if (isTestResult) {
            throw new BadRequestError(req.t('errors.test_has_been_completed'));
        }

        const dateCreateTestStr = moment
            .unix(test_start_time / 1000)
            .format('YYYY-MM-DD');
        const bookingStartDateStr = moment
            .unix(lesson.calendar.start_time / 1000)
            .format('YYYY-MM-DD');

        if (dateCreateTestStr > bookingStartDateStr) {
            throw new BadRequestError(req.t('errors.overtime_for_the_test'));
        }

        let diff: any = {
            test_start_time
        };

        logger.info(
            `>>> editTestResultBooking, test_result: ${JSON.stringify(
                test_result
            )}`
        );
        if (test_result) {
            let testResult = JSON.parse(test_result);
            if (typeof lesson.test_result?.speaking === 'number') {
                testResult = {
                    ...testResult,
                    speaking: lesson.test_result.speaking
                };
            }
            if (typeof lesson.test_result?.listening === 'number') {
                testResult = {
                    ...testResult,
                    listening: lesson.test_result.listening
                };
            }
            diff = {
                ...diff,
                test_result: testResult
            };
            logger.info(
                `>>> editTestResultBooking, diff: ${JSON.stringify(diff)}`
            );
        }

        await BookingActions.update(lesson._id, diff as Booking);

        const res_payload = {
            data: {
                test_result_code: lesson.test_result_code
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    private static async checkTestResultTrialTest(lesson: Booking) {
        const allScore = [
            lesson.test_result?.vocabulary,
            lesson.test_result?.reading,
            lesson.test_result?.writing,
            lesson.test_result?.grammar
        ];
        const checkNumber = (element: any) => typeof element === 'number';
        return allScore.some(checkNumber);
    }

    public static async updateTrialBookingTest(
        req: ProtectedRequest,
        lesson: Booking
    ) {
        if (!lesson.test_topic_id) {
            return {
                testResultId: null,
                testResultCode: null,
                // testStartTime,
                trialTestUrl: null
            };
        }

        const { _id } = req.user;
        let testResultId = lesson.test_result_id || null;
        let testResultCode = lesson.test_result_code || null;
        // let testStartTime = lesson.test_start_time || null;
        let trialTestUrl = lesson.trial_test_url || null;
        let diff = {};

        if (!testResultId) {
            try {
                const resSessionTest =
                    await TrialTestServices.createSessionTest(
                        _id,
                        lesson.test_topic_id
                    );

                const topicName = resSessionTest?.data.topic_name;
                testResultId = resSessionTest?.data.id;
                testResultCode = resSessionTest?.data.code;
                // testStartTime = parseInt(
                //     moment(resSessionTest?.data.test_start_time).format('x')
                // );
                trialTestUrl = `/student/trial-test`;

                diff = {
                    test_result_id: testResultId,
                    // test_start_time: testStartTime,
                    test_result_code: testResultCode,
                    test_topic_name: topicName,
                    trial_test_url: trialTestUrl
                };

                await BookingActions.update(lesson._id, diff as Booking);
            } catch (err: any) {
                logger.error(
                    `----------> error createSessionTest: ${err.message}`
                );
                throw new BadRequestError(err.message);
            }
        } else {
            try {
                // const resSessionTest =
                await TrialTestServices.updateSessionTest(
                    _id,
                    testResultId,
                    lesson.test_topic_id
                );

                // testStartTime = parseInt(
                //     moment(resSessionTest?.data.test_start_time).format('x')
                // );

                // diff = {
                //     test_start_time: testStartTime
                // };

                // await BookingActions.update(lesson._id, diff as Booking);
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
            // testStartTime,
            trialTestUrl
        };
    }

    public static async getBookingOfDailyPackage(
        req: ProtectedRequest,
        res: Response
    ) {
        const package_id = parseInt(req.body.package_id as string);
        const student_id = req.user.id;
        const current_date_start_time = moment().startOf('day').valueOf();
        const current_date_end_time = moment().endOf('day').valueOf();
        let res_payload: any = {
            data: null
        };
        const checkBookingDaily = await BookingActions.findOne({
            ordered_package_id: package_id,
            student_id: student_id,
            'calendar.start_time': {
                $gt: current_date_start_time,
                $lt: current_date_end_time
            },
            status: {
                $in: [
                    EnumBookingStatus.COMPLETED,
                    EnumBookingStatus.PENDING,
                    EnumBookingStatus.CONFIRMED,
                    EnumBookingStatus.TEACHER_CONFIRMED,
                    EnumBookingStatus.TEACHING,
                    EnumBookingStatus.STUDENT_ABSENT
                ]
            }
        });
        if (checkBookingDaily) {
            res_payload.data = checkBookingDaily;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async notiRemineCreateDailyBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        // get all bản ghi ordered package của package daily
        const filter_ordered: any = {
            activation_date: {
                $lte: moment().valueOf()
            },
            is_expired: false,
            number_class: { $gt: 0 },
            original_number_class: { $gte: 25 },
            type: EnumPackageOrderType.STANDARD,
            'package.learning_frequency_type': EnumFrequencyType.DAILY
        };
        const listOrderedPackageNeedCheckRemine =
            await OrderedPackageActions.findAllAndPackageByCheckLearningFrequencyType(
                filter_ordered
            );
        logger.info(
            '=====> Start check notify remine create daily booking ' +
                listOrderedPackageNeedCheckRemine?.length
        );
        for (const iterator of listOrderedPackageNeedCheckRemine) {
            const filter_booking: any = {
                student_id: iterator.user_id,
                'calendar.start_time': {
                    $gte: moment().startOf('day').valueOf(),
                    $lt: moment().endOf('day').valueOf()
                },
                ordered_package_id: iterator.id,
                status: {
                    $nin: [
                        EnumBookingStatus.CHANGE_TIME,
                        EnumBookingStatus.TEACHER_ABSENT,
                        EnumBookingStatus.CANCEL_BY_TEACHER
                    ]
                }
            };
            const bookingCheckRemine = await BookingActions.findOne(
                filter_booking
            );
            logger.info('booking check remine id:' + bookingCheckRemine?.id);
            if (!bookingCheckRemine) {
                const studentData = await UserActions.findOne({
                    id: iterator.user_id
                });
                if (studentData) {
                    logger.info(
                        'has notify remine create daily booking for student id:' +
                            iterator.user_id
                    );
                    const dataPayload = {
                        student_name: studentData.full_name,
                        package_name: iterator.package_name,
                        order_id: iterator.order_id
                    };

                    // thong bao remind hoc vien tao booking trong ngay cho gói daily
                    const notiRemineDailyBooking =
                        await TemplateActions.findOne({
                            code: BackEndNotification.DAILY_BOOKING_REMINDER_FOR_STUDENT
                        });
                    if (notiRemineDailyBooking) {
                        await natsClient.publishEventWithTemplate({
                            template: notiRemineDailyBooking.content,
                            data: dataPayload,
                            receiver: iterator.user_id,
                            template_obj_id: notiRemineDailyBooking._id
                        });
                    }
                }
            }
        }

        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }

    public static async notifySTABookingReminder(
        req: ProtectedRequest,
        res: Response
    ) {
        // remine booking for package Standard type normal when more than 3 days without booking
        const timeRemindCreateBooking = moment().startOf('hour');
        logger.info(
            `=====> Start noti remine create booking for package Standard - time: ${timeRemindCreateBooking.valueOf()}`
        );
        const filter_ordered: any = {
            activation_date: {
                $lte: moment().valueOf()
            },
            is_expired: false,
            number_class: { $gt: 0 },
            original_number_class: { $gte: 25 },
            type: EnumPackageOrderType.STANDARD,
            $or: [
                { 'package.learning_frequency_type': EnumFrequencyType.NORMAL },
                { 'package.learning_frequency_type': { $exists: false } }
            ]
        };
        const listOPNeedCheckRemine =
            await OrderedPackageActions.findAllCheckRemineCreateBookingSTA(
                filter_ordered,
                timeRemindCreateBooking.valueOf()
            );
        for (const iterator of listOPNeedCheckRemine) {
            console.log(iterator.id);
            let timeCheck = moment().valueOf();
            if (iterator?.booking?.id) {
                timeCheck = iterator?.booking?.start_time;
            } else {
                timeCheck = iterator?.activation_date;
            }
            const checkBookingFuture = await BookingActions.findOne({
                ordered_package_id: iterator.id,
                'calendar.start_time': { $gte: moment().valueOf() },
                status: {
                    $in: [
                        EnumBookingStatus.CONFIRMED,
                        EnumBookingStatus.TEACHING,
                        EnumBookingStatus.STUDENT_ABSENT
                    ]
                }
            });
            logger.info('noti remine create booking - timeCheck:' + timeCheck);
            const dataCheck =
                (timeRemindCreateBooking.valueOf() - timeCheck) / DAY_TO_MS;
            logger.info('noti remine - total day:' + dataCheck);
            logger.info('check booking future id:' + checkBookingFuture?.id);

            // check để chỉ noti time hiện tại đến time check đúng bằng 3 ngày
            if (
                timeCheck > 0 &&
                timeRemindCreateBooking.valueOf() > timeCheck &&
                dataCheck >= 3 &&
                !checkBookingFuture
            ) {
                const studentData = await UserActions.findOne({
                    id: iterator.user_id
                });
                if (studentData) {
                    logger.info(
                        'has notify remine create STA booking for student id:' +
                            iterator.user_id
                    );
                    const numberDateNoBooking =
                        (moment().startOf('day').valueOf() -
                            moment(timeCheck).startOf('day').valueOf()) /
                        DAY_TO_MS;
                    const dataPayload = {
                        student_name: studentData.full_name,
                        package_name: iterator.package_name,
                        order_id: iterator.order_id,
                        number_date: Math.floor(numberDateNoBooking)
                    };

                    // thong bao remind hoc vien tao booking trong ngay cho gói daily
                    const notiRemineSTABooking = await TemplateActions.findOne({
                        code: BackEndNotification.STA_BOOKING_REMINDER_FOR_STUDENT
                    });
                    if (notiRemineSTABooking) {
                        await natsClient.publishEventWithTemplate({
                            template: notiRemineSTABooking.content,
                            data: dataPayload,
                            receiver: iterator.user_id,
                            template_obj_id: notiRemineSTABooking._id
                        });
                    }

                    // thong bao remind cho admib khi học viên chưa tao booking trong ngay cho gói daily
                    const notiRemineSTABookingForAdmin =
                        await TemplateActions.findOne({
                            code: BackEndNotification.STA_BOOKING_REMINDER_FOR_ADMIN
                        });
                    if (notiRemineSTABookingForAdmin) {
                        // send to admin
                        const adminOwner = await AdminActions.findOne({
                            username: 'admin'
                        });
                        if (adminOwner) {
                            natsClient.publishEventWithTemplate({
                                template: notiRemineSTABookingForAdmin.content,
                                data: dataPayload,
                                receiver: adminOwner._id,
                                template_obj_id:
                                    notiRemineSTABookingForAdmin._id
                            });
                        }
                        // send to CS
                        const operationIssue =
                            await OperationIssueActions.create({
                                booking_id: null,
                                issue_description:
                                    'Ordered packages will expire',
                                resolved_staff_id: null
                            } as any);
                        const operationIssueId = operationIssue?._id;

                        const cskhDepartment = await DepartmentModel.findOne({
                            unsignedName: CODE_DEPARTMENT.CSKH
                        });
                        if (cskhDepartment) {
                            const managerCskh = await AdminModel.findOne({
                                department: {
                                    department: cskhDepartment._id,
                                    isRole: EnumRole.Manager
                                }
                            });
                            if (managerCskh) {
                                natsClient.publishEventWithTemplate({
                                    template:
                                        notiRemineSTABookingForAdmin.content,
                                    data: dataPayload,
                                    receiver: managerCskh._id,
                                    template_obj_id:
                                        notiRemineSTABookingForAdmin._id,
                                    operation_issue_id: operationIssueId
                                });
                            }
                            const listDeputy = await AdminModel.find({
                                'department.department': cskhDepartment._id,
                                'department.isRole': EnumRole.Deputy_manager
                            });

                            if (listDeputy.length) {
                                listDeputy.forEach((element) => {
                                    natsClient.publishEventWithTemplate({
                                        template:
                                            notiRemineSTABookingForAdmin.content,
                                        data: dataPayload,
                                        receiver: element._id,
                                        template_obj_id:
                                            notiRemineSTABookingForAdmin._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                            const listLeader = await AdminModel.find({
                                'department.department': cskhDepartment._id,
                                'department.isRole': EnumRole.Leader
                            });

                            if (listLeader.length) {
                                listLeader.forEach((element: any) => {
                                    natsClient.publishEventWithTemplate({
                                        template:
                                            notiRemineSTABookingForAdmin.content,
                                        data: dataPayload,
                                        receiver: element._id,
                                        template_obj_id:
                                            notiRemineSTABookingForAdmin._id,
                                        operation_issue_id: operationIssueId
                                    });
                                });
                            }
                            // thông báo cho nhân viên quản lý
                            const studentUser = await StudentModel.findOne({
                                user_id: iterator.user_id
                            }).populate('staff');
                            const checkExits = listLeader.find(
                                (e) => e.id === studentUser?.staff?.id
                            );
                            if (
                                studentUser &&
                                studentUser?.staff &&
                                !checkExits
                            ) {
                                natsClient.publishEventWithTemplate({
                                    template:
                                        notiRemineSTABookingForAdmin.content,
                                    data: dataPayload,
                                    receiver: studentUser.staff._id,
                                    template_obj_id:
                                        notiRemineSTABookingForAdmin._id,
                                    operation_issue_id: operationIssueId
                                });
                            }
                        }
                    }
                }
            }
        }
        return new SuccessResponse('success', '').send(res, req);
    }

    public static async createLinkHMPForBooking(
        req: ProtectedRequest,
        booking: any
    ) {
        try {
            if (booking && HAMIA_MEET_PLUS_URL) {
                logger.info('start connect and create cms HMP >>');
                await CMSHamiaMeetPlusSDKController.login();
                const cmsStudent: any =
                    await CMSHamiaMeetPlusSDKController.createUser(
                        booking.student?.username
                    );
                const cmsTeacher: any =
                    await CMSHamiaMeetPlusSDKController.createUser(
                        booking.teacher?.username
                    );
                const cmsRoom: any =
                    await CMSHamiaMeetPlusSDKController.createRoom(
                        'Room tạo tự động từ E+ của booking ' + booking.id,
                        CMS_SERVER_NAME + ': Room E+ ' + booking.id
                    );
                if (cmsStudent && cmsTeacher && cmsRoom) {
                    const cmsStudentRoom: any =
                        await CMSHamiaMeetPlusSDKController.createUserRoom(
                            cmsStudent?.id,
                            cmsRoom?.id,
                            RoomRoleID.normal
                        );
                    const cmsTeacherRoom: any =
                        await CMSHamiaMeetPlusSDKController.createUserRoom(
                            cmsTeacher?.id,
                            cmsRoom?.id,
                            RoomRoleID.moderator
                        );
                    const startTime = moment(booking.calendar?.start_time)
                        .add(7, 'hour')
                        .toDate();
                    const endTime = moment(booking.calendar?.end_time)
                        .add(7, 'hour')
                        .toDate();
                    const cmsRoomSchedule: any =
                        await CMSHamiaMeetPlusSDKController.createRoomSchedule(
                            cmsRoom?.id,
                            startTime,
                            endTime
                        );
                    if (cmsStudentRoom && cmsRoomSchedule) {
                        const cmsStudentRoomToken: any =
                            await CMSHamiaMeetPlusSDKController.createUserRoomToken(
                                booking.student?.username,
                                cmsStudentRoom?.id
                            );
                        const cmsTeacherRoomToken: any =
                            await CMSHamiaMeetPlusSDKController.createUserRoomToken(
                                booking.teacher?.username,
                                cmsTeacherRoom?.id
                            );
                        if (cmsStudentRoomToken && cmsTeacherRoomToken) {
                            logger.info('create cms HMP success: ');
                            const dataCmsHmpCheck =
                                await CMSHamiaMeetPlusInfoActions.findOne({
                                    booking_id: booking.id,
                                    student_id: booking.student_id
                                });
                            const dataInfoCMS: any = {
                                booking_id: booking.id,
                                student_id: booking.student_id,
                                teacher_id: booking.teacher_id,
                                cms_student_id: cmsStudent.id,
                                cms_student_username: cmsStudent.username,
                                cms_teacher_id: cmsTeacher.id,
                                cms_teacher_username: cmsTeacher.username,
                                cms_room_id: cmsRoom.id,
                                cms_room_name: cmsRoom.room_name,
                                cms_student_room_id: cmsStudentRoom.id,
                                cms_teacher_room_id: cmsTeacherRoom.id,
                                cms_student_room_token_id:
                                    cmsStudentRoomToken.id,
                                cms_student_room_token:
                                    cmsStudentRoomToken.token,
                                cms_teacher_room_token_id:
                                    cmsTeacherRoomToken.id,
                                cms_teacher_room_token:
                                    cmsTeacherRoomToken.token,
                                cms_room_schedule_id: cmsRoomSchedule?.id
                            };
                            if (!dataCmsHmpCheck) {
                                const counter = await CounterActions.findOne(
                                    {}
                                );
                                const cms_hmp_id = counter.cms_hmp_info_id;
                                dataInfoCMS.id = cms_hmp_id;
                                await CMSHamiaMeetPlusInfoActions.create(
                                    dataInfoCMS
                                );
                            } else {
                                await CMSHamiaMeetPlusInfoActions.update(
                                    dataCmsHmpCheck._id,
                                    dataInfoCMS
                                );
                            }
                            const linkStudentHMP =
                                await CMSHamiaMeetPlusInfoController.generateLinkHMP(
                                    RoleHMPType.STUDENT,
                                    cmsRoom.id,
                                    cmsStudent.username,
                                    cmsStudentRoomToken.token
                                );
                            const linkTeacherHMP =
                                await CMSHamiaMeetPlusInfoController.generateLinkHMP(
                                    RoleHMPType.TEACHER,
                                    cmsRoom.id,
                                    cmsTeacher.username,
                                    cmsTeacherRoomToken.token
                                );

                            const medium_info = {
                                learning_medium: {
                                    medium_type:
                                        EnumBookingMediumType.HAMIA_MEET,
                                    info: {
                                        student_link: linkStudentHMP,
                                        teacher_link: linkTeacherHMP
                                    }
                                },
                                is_show_hmp: true
                            };
                            await BookingActions.update(
                                booking._id,
                                medium_info as Booking
                            );
                            return true;
                            logger.info('end connect and create cms HMP <<');
                        }
                    }
                }
            }
        } catch (err: any) {
            logger.error('setting cms hamia meet plus error: ' + err);
            throw new BadRequestError(req.t('errors.booking.cms_hmp_error'));
        }
    }

    public static async addLinkHMPForBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const booking_id = req.params.booking_id;
        const booking = await BookingActions.findOne({
            id: parseInt(booking_id as string)
        });
        let response: any = null;
        if (!booking) throw new BadRequestError(req.t('errors.user.not_found'));
        if (
            booking.learning_medium?.medium_type ===
                EnumBookingMediumType.HAMIA_MEET &&
            !booking.learning_medium?.info?.student_link
        ) {
            await BookingController.createLinkHMPForBooking(req, booking);
            response = true;
        }
        return new SuccessResponse('Success', {
            response
        }).send(res, req);
    }
}
