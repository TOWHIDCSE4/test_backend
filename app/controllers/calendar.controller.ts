import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import moment from 'moment';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import BookingActions from '../actions/booking';
import CalendarActions from '../actions/calendar';
import CounterActions from '../actions/counter';
import RegularCalendarActions from '../actions/regular-calendar';
import TeacherAbsentRequestActions from '../actions/teacher-absent-request';
import UserActions from '../actions/user';
import Booking, { EnumBookingStatus } from '../models/booking';
import Calendar from '../models/calendar';
import RegularCalendar, {
    EnumRegularCalendarStatus
} from '../models/regular-calendar';
import { EnumTeacherAbsentRequestStatus } from '../models/teacher-absent-request';
import {
    getCurrentWeek,
    buildCalendarFilter,
    getTimestampInWeek,
    isValidStartTimestamp,
    getTimestampListInPeriod,
    getStartOfTheWeek
} from '../utils/datetime-utils';
import { dynamicSort } from '../utils/dynamic-sort';
import {
    DAY_TO_MS,
    WEEK_TO_MS,
    LIMIT_TEACHER_CALENDAR_CREATE,
    MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR,
    PEAK_TIME_START,
    PEAK_TIME_END,
    MINUTE_TO_MS
} from '../const/date-time';
import { RoleCode } from '../const/role';
import _ from 'lodash';
import BookingController from './booking.controller';
const logger = require('dy-logger');

export default class CalendarController {
    // For Student call API

    public static async getSimpleScheduleByTeacherId(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = parseInt(req.params.teacher_id as string);
        const teacher_user = await UserActions.findOne({ id: teacher_id });

        const week_start = moment().startOf('day').valueOf();
        const days = getCurrentWeek(week_start);
        const times = [7, 10, 13, 16, 19, 22]; // các mốc thời gian trong ngày, lấy từ 7h tới 22h

        /* Teachers' regular schedule available for students to book this week */
        let available_regular_schedule: Array<number>;
        if (!teacher_user || !teacher_user.regular_times) {
            available_regular_schedule = [];
        } else {
            const regular_calendars = await RegularCalendarActions.findAll({
                teacher_id
            });
            const registered_regular_times = regular_calendars.map(
                (x) => x.regular_start_time
            ) as number[];
            let available_regular_times = teacher_user.regular_times;
            available_regular_times = available_regular_times.filter(
                (x) => !registered_regular_times.includes(x)
            );
            const current_moment = new Date().getTime();
            let end_regular_check =
                current_moment + MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR;
            if (end_regular_check > week_start + WEEK_TO_MS) {
                end_regular_check = week_start + WEEK_TO_MS;
            }
            available_regular_schedule = getTimestampListInPeriod(
                available_regular_times,
                current_moment,
                end_regular_check
            );
        }

        let available_schedule: any[] = await Promise.all(
            days.map(async (day) => {
                const start_time = moment(day).valueOf();
                let calendar_of_day: any[] = await Promise.all(
                    [...times].slice(0, -1).map(async (time, index) => {
                        if (!teacher_user) {
                            return {
                                time,
                                calendars_active: false
                            };
                        }

                        const start_hour = moment(start_time)
                            .add(time, 'hours')
                            .valueOf();
                        const end_hour = moment(start_time)
                            .add(times[index + 1], 'hours')
                            .valueOf();
                        const calendar = {
                            start_time: start_hour,
                            end_time: end_hour,
                            teacher_id: teacher_id ? teacher_id : 0
                        };
                        const filter = buildCalendarFilter(calendar);
                        let active_count = await CalendarActions.count(filter);
                        for (const schedule of available_regular_schedule) {
                            if (
                                schedule >= start_hour &&
                                schedule <= end_hour
                            ) {
                                active_count++;
                                break;
                            }
                        }
                        return {
                            time,
                            calendars_active: !!(active_count > 0)
                        };
                    })
                );
                calendar_of_day = calendar_of_day
                    .sort(dynamicSort('time'))
                    .map((x) => x.calendars_active.length);
                return {
                    day,
                    calendar_of_day
                };
            })
        );
        available_schedule = available_schedule
            .sort(dynamicSort('day'))
            .map((x) => x.calendar_of_day);
        return new SuccessResponse('success', available_schedule).send(
            res,
            req
        );
    }

    // For Teacher call API

    public static async getSchedulesActive(
        req: any,
        res: Response,
        id: number
    ) {
        const start_time = parseInt(req.query.start_time as string);
        const end_time = parseInt(req.query.end_time as string);
        const current_moment = new Date().getTime();

        const teacher_user = await UserActions.findOne({ id });
        if (
            !teacher_user ||
            isNaN(start_time) ||
            isNaN(end_time) ||
            start_time >= end_time ||
            start_time < current_moment - 90 * DAY_TO_MS ||
            end_time > current_moment + 90 * DAY_TO_MS ||
            end_time - start_time > 90 * DAY_TO_MS
        ) {
            const empty_res = {
                booked_schedule: [],
                available_schedule: [],
                registered_regular_schedule: [],
                available_regular_schedule: []
            };
            return empty_res;
        }

        const regular_calendars = await RegularCalendarActions.findAll({
            teacher_id: id,
            status: [
                EnumRegularCalendarStatus.ACTIVE,
                EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                EnumRegularCalendarStatus.EXPIRED
            ]
        });
        const registered_regular_times = regular_calendars.map(
            (x) => x.regular_start_time
        ) as number[];

        let available_regular_times = teacher_user.regular_times;
        if (!available_regular_times) {
            available_regular_times = new Array<number>();
        }
        available_regular_times = available_regular_times.filter(
            (x) => !registered_regular_times.includes(x)
        );
        const available_regular_schedule = getTimestampListInPeriod(
            available_regular_times,
            start_time,
            end_time
        );
        const booking_filter = {
            teacher_id: id,
            $and: [
                { 'calendar.start_time': { $gte: start_time } },
                { 'calendar.end_time': { $lte: end_time } }
            ]
        };

        const bookings = await BookingActions.findAll(booking_filter);
        const booked_set = new Set<number>();
        bookings.map(async (x: any, index) => {
            if (
                x.status !== EnumBookingStatus.CHANGE_TIME ||
                x.status !== EnumBookingStatus.CANCEL_BY_STUDENT
            ) {
                booked_set.add(x.calendar.id);
            }

            // check ton tai calendar
            const check_calendar = await CalendarActions.findOne({
                id: x.calendar_id
            });
            if (!check_calendar) {
                const indexReal = bookings.indexOf(x);
                bookings.splice(indexReal, 1);
            }
        });
        const calendar = {
            start_time,
            end_time,
            teacher_id: id
        };
        const schedule_filter = buildCalendarFilter(calendar);

        let available_schedule = await CalendarActions.findAllForWebApp(
            schedule_filter
        );

        available_schedule = available_schedule.filter(
            (x) => !booked_set.has(x.id)
        );

        const check_absent =
            await TeacherAbsentRequestActions.findAllByScheduleActive({
                teacher_id: id,
                status: [EnumTeacherAbsentRequestStatus.APPROVED],
                $and: [
                    {
                        $or: [
                            {
                                $and: [
                                    { end_time: { $gt: start_time } },
                                    { end_time: { $lte: end_time } }
                                ]
                            },
                            {
                                $and: [
                                    { start_time: { $gte: start_time } },
                                    { start_time: { $lt: end_time } }
                                ]
                            },
                            {
                                $and: [
                                    { start_time: { $lt: start_time } },
                                    { end_time: { $gt: end_time } }
                                ]
                            }
                        ]
                    }
                ]
            });
        const res_payload = {
            booked_schedule: bookings,
            available_schedule,
            registered_regular_schedule: regular_calendars,
            available_regular_schedule,
            on_absent_period: check_absent
        };
        return res_payload;
    }

    public static async getSchedulesActiveByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const teacher_id = req.params.teacher_id || req.query.teacher_id;
        const res_payload = await CalendarController.getSchedulesActive(
            req,
            res,
            parseInt(teacher_id as string)
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getSchedulesActiveByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const res_payload = await CalendarController.getSchedulesActive(
            req,
            res,
            id
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getSchedulesActiveOfTeacherByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const res_payload: any = await CalendarController.getSchedulesActive(
            req,
            res,
            parseInt(teacher_id as string)
        );
        // lọc các lịch cố định avaiable có time nhỏ hơn MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR
        const current_moment = new Date().getTime();
        res_payload.available_regular_schedule =
            res_payload.available_regular_schedule.filter((e: any) => {
                const start_time = new Date(e).getTime();
                if (
                    start_time - current_moment >=
                    MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR
                ) {
                    return false;
                }
                return true;
            });
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description get the total number of valid open calendar of a teacher
     * @param teacher_id ID of the teacher
     * @param start_time start of the time period
     * @param end_time end of the time period
     * @returns the total number of valid open calendar of the teacher
     */
    public static async getTotalOpenCalendarOfTeacher(
        teacher_id: number,
        start_time: number,
        end_time: number
    ): Promise<number> {
        if (end_time <= start_time) return 0;
        const calendar = {
            start_time,
            end_time,
            teacher_id
        };
        const filter = buildCalendarFilter(calendar);
        const totalCalendar = await CalendarActions.count(filter);
        const teacherUser = await UserActions.findOne({ id: teacher_id });
        if (!teacherUser) return 0;
        const regularCalendarList = getTimestampListInPeriod(
            teacherUser.regular_times ?? [],
            start_time,
            end_time
        );
        return totalCalendar + regularCalendarList.length;
    }

    /**
     * @description get the total number of open calendar in peak time of a teacher
     * @param teacher_id ID of the teacher
     * @param start_time start of the time period
     * @param end_time end of the time period
     * @returns the total number of open calendar in peak time of the teacher
     */
    public static async getPeakTimeCalendarOfTeacher(
        teacher_id: number,
        start_time: number,
        end_time: number
    ): Promise<number> {
        if (end_time <= start_time) return 0;
        const calendar = {
            start_time,
            end_time,
            teacher_id
        };
        const filter = buildCalendarFilter(calendar);
        const calendars = await CalendarActions.findAllForWebApp(filter);
        const calendarsPeakTime = calendars.filter(
            (c) =>
                c.start_time % (1000 * 60 * 60 * 24) >= PEAK_TIME_START &&
                c.end_time % (1000 * 60 * 60 * 24) <= PEAK_TIME_END
        );
        const teacherUser = await UserActions.findOne({ id: teacher_id });
        if (!teacherUser) return 0;
        const regularCalendarsPeakTime = getTimestampListInPeriod(
            teacherUser.regular_times ?? [],
            start_time,
            end_time
        ).filter(
            (c) =>
                c % (1000 * 60 * 60 * 24) >= PEAK_TIME_START &&
                c % (1000 * 60 * 60 * 24) <= PEAK_TIME_END
        );
        return calendarsPeakTime.length + regularCalendarsPeakTime.length;
    }

    public static async createSchedule(
        req: ProtectedRequest,
        teacher_id: number,
        dontValidate?: any
    ) {
        let { start_time, end_time, ispeak_calendar_id } = req.body;
        start_time = new Date(start_time).getTime();
        if (!isValidStartTimestamp(start_time)) {
            throw new BadRequestError(req.t('errors.calendar.invalid_time'));
        }
        end_time = new Date(end_time).getTime();
        if (!isValidStartTimestamp(end_time)) {
            throw new BadRequestError(req.t('errors.calendar.invalid_time'));
        }
        const current_moment = new Date().getTime();

        // If not data by sync ispeak then validate timestamp
        if (!ispeak_calendar_id) {
            if (
                (!dontValidate || !dontValidate.accept_time) &&
                (start_time < current_moment + LIMIT_TEACHER_CALENDAR_CREATE ||
                    end_time < current_moment)
            ) {
                throw new BadRequestError(
                    req.t('errors.calendar.invalid_time')
                );
            }
            if (start_time >= end_time) {
                throw new BadRequestError(
                    req.t('errors.calendar.start_before_end')
                );
            }
        }

        const check_absent = await TeacherAbsentRequestActions.findOne({
            teacher_id,
            status: [EnumTeacherAbsentRequestStatus.APPROVED],
            start_time: { $lte: start_time },
            end_time: { $gte: end_time }
        });
        if (check_absent) {
            throw new BadRequestError(
                req.t('errors.calendar.on_absent_period')
            );
        }

        const calendar = await CalendarActions.findOne({
            teacher_id,
            start_time,
            end_time
        });
        let calendar_id;
        if (calendar) {
            await CalendarActions.update(calendar._id, {
                is_active: true
            } as Calendar);
            calendar_id = calendar.id;
        } else {
            const counter = await CounterActions.findOne({});
            calendar_id = counter.calendar_id;
            const calendar_info = {
                id: calendar_id,
                start_time,
                end_time,
                teacher_id,
                is_active: true,
                ispeak_calendar_id
            };
            await CalendarActions.create(calendar_info as Calendar);
        }
        return calendar_id;
    }

    public static async createScheduleByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const calendar_id = await CalendarController.createSchedule(
            req,
            parseInt(teacher_id as string),
            {
                accept_time: true
            }
        );
        const data = {
            calendar_id
        };
        new SuccessResponse('success', data).send(res, req);
    }

    public static async createScheduleByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id, regular_times } = req.user;
        if (regular_times) {
            let { start_time } = req.body;
            start_time = new Date(start_time).getTime();
            const timestamp_in_week = getTimestampInWeek(start_time);
            if (regular_times.includes(timestamp_in_week)) {
                throw new BadRequestError(
                    req.t('errors.calendar.schedule_on_regular')
                );
            }
        }
        const calendar_id = await CalendarController.createSchedule(req, id);
        const data = {
            calendar_id
        };
        new SuccessResponse('success', data).send(res, req);
    }

    public static async editSchedule(req: ProtectedRequest, res: Response) {
        const { calendar_id } = req.params;
        const calendar = await CalendarActions.findOne({
            id: parseInt(calendar_id)
        });
        if (!calendar)
            throw new BadRequestError(req.t('errors.calendar.not_found'));
        if (new Date(calendar.start_time) < new Date())
            throw new BadRequestError(
                req.t('errors.calendar.edit_past_calendar')
            );
        const check_booked = await BookingActions.findOne({
            calendar_id: parseInt(calendar_id)
        });
        if (
            check_booked &&
            check_booked.status !== EnumBookingStatus.CANCEL_BY_STUDENT &&
            check_booked.status !== EnumBookingStatus.CHANGE_TIME
        ) {
            throw new BadRequestError(
                req.t(
                    'errors.calendar.booked',
                    check_booked.id,
                    check_booked.student.full_name,
                    check_booked.teacher.full_name
                )
            );
        }
        calendar.is_active = !calendar.is_active;
        await calendar.save();
        if (check_booked) {
            check_booked.calendar = calendar;
            await check_booked.save();
        }

        new SuccessResponse('success', {
            message: 'Updated successfully'
        }).send(res, req);
    }

    public static async removeAllCalendarMatchingRegularsOfTeacher(
        teacher_id: number,
        regular_times: number[]
    ) {
        logger.info('start removeAllCalendarMatchingRegularsOfTeacher');
        const start_of_week = getStartOfTheWeek(new Date().getTime());
        const timestamp_mods = [];
        for (const regular_time of regular_times) {
            const timestamp = start_of_week + regular_time;
            timestamp_mods.push({
                start_time: { $mod: [WEEK_TO_MS, timestamp % WEEK_TO_MS] }
            });
        }
        const filter: any = {
            teacher_id,
            start_time: {
                $gte: new Date().getTime()
            }
        };
        if (timestamp_mods.length > 0) {
            filter['$or'] = timestamp_mods; // fix MongoError: $and/$or/$nor must be a nonempty array\n'
        }
        const calendars = await CalendarActions.findAll(filter, {
            id: 1
        });
        logger.info(`calendars data: ${JSON.stringify(calendars)}`);
        logger.info(`teacher: ${teacher_id}`);
        await Promise.all(
            calendars.map(async (calendar: Calendar) => {
                logger.info(`calendar check remove: ${calendar.id}`);
                const check_booked = await BookingActions.findOne({
                    teacher_id,
                    calendar_id: calendar.id
                });
                if (check_booked) {
                    logger.info(`booking: ${check_booked.id}`);
                }
                if (!check_booked) {
                    logger.info(`remove calendar`);
                    await CalendarActions.remove(calendar._id);
                } else {
                    logger.info(`no remove calendar`);
                }
            })
        );
        logger.info('end removeAllCalendarMatchingRegularsOfTeacher');
    }
    public static async getAvailableTeacherListFromStartTime(
        req: ProtectedRequest,
        start_time: number
    ): Promise<Set<number>> {
        const teacher_set = new Set<number>();
        const current_moment = new Date().getTime();
        logger.info(`getAvailableTeacherListFromStartTime ${start_time}`);
        if (start_time >= current_moment) {
            const end_time = start_time + 30 * MINUTE_TO_MS;

            /** First, find the teachers that has registered this time */
            const schedule_filter = buildCalendarFilter({
                start_time,
                end_time
            });

            const available_schedule = await CalendarActions.findAll(
                schedule_filter,
                { teacher_id: 1 },
                { teacher_id: 1 }
            );

            logger.info('list teacher available_schedule');
            for (const schedule of available_schedule) {
                logger.info(schedule.teacher_id);
                teacher_set.add(schedule.teacher_id);
            }

            const regular_time = getTimestampInWeek(start_time);

            const available_regular_teacher = await UserActions.findAll({
                is_active: true,
                role: [RoleCode.TEACHER],
                regular_times: regular_time
            });
            logger.info('list available_regular_teacher');
            for (const teacher of available_regular_teacher) {
                logger.info(teacher.id);
                teacher_set.add(teacher.id);
            }

            // danh sách GV có mở lịch regular hoặc flex
            const teacher_have_calendar_set = new Set(teacher_set);
            let strSet = '';
            teacher_have_calendar_set.forEach((item) => {
                strSet += `${item} `;
            });
            logger.info(`teacher_have_calendar_set ${strSet}`);
            /** Now find the ones that aren't available */
            // const booking_filter = {
            //     min_start_time: start_time,
            //     max_end_time: end_time,
            //     $and: [
            //         { status: { $ne: EnumBookingStatus.CANCEL_BY_STUDENT } },
            //         { status: { $ne: EnumBookingStatus.CANCEL_BY_ADMIN } },
            //         { status: { $ne: EnumBookingStatus.CHANGE_TIME } }
            //     ]
            // };
            // const bookings = await BookingActions.findAll(booking_filter, {
            //     teacher_id: 1
            // });

            // for (const booking of bookings) {
            //     teacher_set.delete(booking.teacher_id);
            // }

            const regular_filter = {
                regular_start_time: regular_time,
                status: [
                    EnumRegularCalendarStatus.ACTIVE,
                    EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING
                ]
            };

            const booked_regulars = await RegularCalendarActions.findAll(
                regular_filter,
                { teacher_id: 1 }
            );

            for (const regular of booked_regulars) {
                teacher_set.delete(regular.teacher_id);
            }

            // tìm kiếm các giáo viên mà lịch bị hủy hoặc đổi lịch để add thêm vào danh sách avaiable
            const bookingsInTime = await BookingActions.findAll(
                {
                    min_start_time: start_time,
                    max_end_time: end_time
                },
                {
                    teacher_id: 1
                }
            );

            const groupTeacherId = _.groupBy(
                bookingsInTime,
                (x) => x.teacher_id
            );

            for (const [teacherId, bookings] of Object.entries(
                groupTeacherId
            )) {
                const sortBookings = bookings.sort(function (a, b) {
                    const timeA: any = a.created_time;
                    const timeB: any = b.created_time;
                    return (
                        new Date(timeA).valueOf() - new Date(timeB).valueOf()
                    );
                });

                const bookingHasMaxDate = sortBookings[sortBookings.length - 1];

                if (
                    [
                        EnumBookingStatus.CANCEL_BY_STUDENT,
                        EnumBookingStatus.CHANGE_TIME
                    ].some((status) => status === bookingHasMaxDate.status)
                ) {
                    logger.info(`booking cancel id: ${bookingHasMaxDate.id}`);

                    // check thêm lần nữa xem có booking nào ở thời điểm đó có status upcoming ko
                    const check_booked = await BookingActions.findOne({
                        teacher_id: bookingHasMaxDate?.teacher_id,
                        'calendar.start_time':
                            bookingHasMaxDate?.calendar?.start_time,
                        status: EnumBookingStatus.CONFIRMED
                    });
                    if (check_booked) {
                        logger.info(
                            `has booking regular upcoming: ${check_booked.id}`
                        );
                    }
                    // dù booking bị hủy bởi HV hoặc change time, vẫn cần check GV có mở lịch flex/regular thì mới được cho vào danh sách
                    if (
                        teacher_have_calendar_set.has(parseInt(teacherId)) &&
                        !check_booked
                    ) {
                        logger.info(
                            `add teacher by booing cancel by student: teacher_id: ${teacherId}`
                        );
                        teacher_set.add(parseInt(teacherId));
                    }
                } else {
                    teacher_set.delete(parseInt(teacherId));
                }
            }

            const absence_list = await TeacherAbsentRequestActions.findAll(
                {
                    status: [EnumTeacherAbsentRequestStatus.APPROVED],
                    start_time: { $lte: start_time },
                    end_time: { $gte: end_time }
                },
                {
                    teacher_id: 1
                }
            );
            for (const absence_teacher of absence_list) {
                teacher_set.delete(absence_teacher.teacher_id);
            }
        }

        return teacher_set;
    }

    public static async getScheduleSlotForReport(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, start_time, end_time } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            is_active: true
        };
        const res_payload: any = {
            data: [],
            pagination: {
                total: 0
            }
        };
        if (
            start_time &&
            !_.isNaN(start_time) &&
            end_time &&
            !_.isNaN(end_time)
        ) {
            filter.range_time = {
                start_time: _.toInteger(start_time),
                end_time: _.toInteger(end_time)
            };
            const res_agg = await CalendarActions.getAllCalendersEachTeacher(
                filter
            );
            if (res_agg && res_agg.length > 0) {
                res_payload.data = res_agg[0]?.paginatedResults;
                res_payload.pagination.total =
                    res_agg[0]?.totalResults[0]?.count;
            }
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async removeFutureCalendarMatchingOfTeacherInactive(
        req: ProtectedRequest,
        teacher_id: number
    ) {
        const filter = {
            teacher_id,
            start_time: {
                $gte: new Date().getTime()
            }
        };
        let check_booked: Booking | null = null;
        const calendars = await CalendarActions.findAll(filter);
        await Promise.all(
            calendars.map(async (calendar: Calendar) => {
                check_booked = await BookingActions.findOne({
                    teacher_id: calendar.teacher_id,
                    calendar_id: calendar.id
                });
                if (!check_booked) {
                    // xóa hết calendar không thuộc booking có start time trong tương lai của GV bị inactive
                    await CalendarActions.remove(calendar._id);
                }
            })
        );
        const bookings = await BookingActions.findAll({
            teacher_id,
            status: {
                $in: [EnumBookingStatus.PENDING, EnumBookingStatus.CONFIRMED]
            }, //TODO sửa thành upcomming
            'calendar.start_time': { $gte: new Date().getTime() }
        });
        await Promise.all(
            bookings.map(async (booking: Booking) => {
                // notify cho hv, HT khi cancel booking
                // FIXME update riêng từng booking
                await BookingController.onBookingStatusChange(
                    req,
                    booking,
                    EnumBookingStatus.CANCEL_BY_TEACHER
                );
                // update status các booking đã book trong tương lai của GV bị inactive
                await BookingActions.update(booking._id, {
                    reported_absence_at: new Date().getTime(),
                    status: EnumBookingStatus.CANCEL_BY_TEACHER
                } as Booking);
            })
        );
        await RegularCalendarActions.removeManyRegularCalendarOfTeacherInactive(
            teacher_id
        );
    }

    public static async createIeltsCalendar(
        req: ProtectedRequest,
        teacher_id: number
    ) {
        let { start_time, end_time, ispeak_calendar_id } = req.body;
        start_time = new Date(start_time).getTime();
        if (!isValidStartTimestamp(start_time)) {
            throw new BadRequestError(req.t('errors.calendar.invalid_time'));
        }
        end_time = new Date(end_time).getTime();
        if (!isValidStartTimestamp(end_time)) {
            throw new BadRequestError(req.t('errors.calendar.invalid_time'));
        }

        const calendar = await CalendarActions.findOne({
            teacher_id,
            start_time,
            end_time
        });
        let calendar_id;
        if (calendar) {
            await CalendarActions.update(calendar._id, {
                is_active: true
            } as Calendar);
            calendar_id = calendar.id;
        } else {
            const counter = await CounterActions.findOne({});
            calendar_id = counter.calendar_id;
            const calendar_info = {
                id: calendar_id,
                start_time,
                end_time,
                teacher_id,
                is_active: true,
                ispeak_calendar_id
            };
            await CalendarActions.create(calendar_info as Calendar);
        }
        return calendar_id;
    }
}
