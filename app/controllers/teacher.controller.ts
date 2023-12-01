import { EnumGender, LOCATION_ID_ASIAN, LOCATION_ID_VIETNAM } from './../const';
import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _, { isEmpty, size } from 'lodash';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError, InternalError } from '../core/ApiError';
import LocationActions from '../actions/location';
import SubjectActions from '../actions/subject';
import TeacherActions, { FilterQuery } from '../actions/teacher';
import TeacherLevelActions from '../actions/teacher-level';
import UserActions from '../actions/user';
import BookingActions from '../actions/booking';
import CourseActions from '../actions/course';
import CalendarController from './calendar.controller';
import TeacherLevelController from './teacher-level.controller';
import UserControllers from './user.controller';
import Teacher, { EnumReviewStatus } from '../models/teacher';
import User from '../models/user';
import { RoleCode } from '../const/role';
import { TEACHER_LEVEL_STATUS } from '../const';
import { DEFAULT_TEACHER_LEVEL_ID } from '../const/default-id';
import {
    buildCalendarFilter,
    getTimestampInWeek
} from '../utils/datetime-utils';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import { EnumBookingStatus } from '../models/booking';
import CalendarActions from '../actions/calendar';
import {
    DAY_TO_MS,
    HOUR_TO_MS,
    MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR
} from '../const/date-time';
import moment from 'moment';
const logger = require('dy-logger');
const pickUpData = [
    '_id',
    'user_id',
    'location_id',
    'teacher_level_id',
    'teacher_level_status',
    'staff_id',
    'hourly_rate',
    'intro_video',
    'experience',
    'about_me',
    'average_rating',
    'skills',
    'job_qualification',
    'cv',
    'degree',
    'english_certificate',
    'teaching_certificate',
    'total_lesson',
    'total_lesson_this_level',
    'is_reviewed',
    'ref_code',
    'ref_by_teacher',
    'is_reviewed'
];

export enum EnumTypeFilter {
    FIND_CLASS = 1,
    FIND_TEACHER_INFO = 2
}
export default class TeacherController {
    /*
     * Summary: Tao mot profile giao vien. Tuy vao role va cach tao profile,
     *          ham nay se duoc goi boi cac controller khac nhau
     * Request type: POST
     * Parameters: - user_id    :     : ma id cua user giao vien
     *             - location_id: body: ID cua vung noi giao vien sinh song
     *             - teacher_level_id: body: ID cua cap bac cua giao vien
     *             - intro_video: body: duong dan den video giao vien gioi thieu ban than
     *             - experience : body: kinh nghiem giang day
     *             - about_me   : body: loi gioi thieu ban than cua giao vien
     * Response: - 200, ok: tao thanh cong profile giao vien
     *           - 400, bad request
     */
    private static async createTeacher(req: ProtectedRequest, user_id: number) {
        const {
            location_id,
            teacher_level_id,
            intro_video,
            experience,
            about_me,
            skills,
            job_qualification,
            is_reviewed,
            staff_id,
            ref_code
        } = req.body;
        let hourly_rate = req.body.hourly_rate;

        const user = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));

        const user_info = {
            full_name: user.full_name,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            is_active: user.is_active
        };

        const teacher = await TeacherActions.findOne({ user_id });
        if (teacher) throw new BadRequestError(req.t('errors.teacher.exist'));

        const location = await LocationActions.findOne({
            id: parseInt(location_id as string)
        });
        if (!location)
            throw new BadRequestError(req.t('errors.location.not_found'));

        const level = await TeacherLevelActions.findOne({
            id: parseInt(teacher_level_id as string)
        });
        if (!level) {
            throw new BadRequestError(req.t('errors.teacher_level.not_found'));
        }
        if (!hourly_rate) {
            hourly_rate =
                TeacherLevelController.getTeacherRateFromLevelAndLocation(
                    level,
                    location.id
                );
        }

        if (skills) {
            await Promise.all(
                skills.map(async (skill: any) => {
                    const subject = await SubjectActions.findOne({
                        id: skill.subject_id
                    });
                    if (!subject)
                        throw new BadRequestError(
                            req.t('errors.subject.not_found')
                        );
                    /*
                     * TODO: Add an array of possible skills in subject model to check
                     * whether the skills here is for this subject
                     */
                })
            );
        }

        const teacher_info: any = {
            user_id,
            location_id: parseInt(location_id as string),
            teacher_level_id: parseInt(teacher_level_id as string),
            hourly_rate,
            intro_video,
            experience,
            about_me,
            skills,
            job_qualification: job_qualification
                ? parseInt(job_qualification)
                : 1,
            location,
            level,
            user: user_info,
            is_reviewed,
            staff_id,
            average_rating: 5 // Default rating for new teacher
        };

        if (ref_code) {
            const refTeacher = await TeacherActions.findOne({ ref_code });
            if (refTeacher) {
                teacher_info.ref_by_teacher = {
                    id: refTeacher.user_id,
                    ref_date: Date.now()
                };
            }
        }

        await TeacherActions.create(teacher_info as Teacher);
        return req.t('common.success');
    }

    /*
     * Summary: Admin vua tao mot profile user kem mot profile giao vien
     * Request type: POST
     * Role: Admin
     * Parameters: - role: body: Role can o day la giao vien
     * Response: - 200: success: tao thanh cong profile user va teacher
     *           - 400: bad request
     */
    public static async createTeacherUserByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        req.body['role'] = [RoleCode.TEACHER];
        req.body['is_reviewed'] = true;

        const user = await UserControllers.createUserByAdmin(req);

        const msg = await TeacherController.createTeacher(req, user.id);

        const res_payload = {
            ok: true,
            data: user
        };

        return new SuccessResponse(msg, res_payload).send(res, req);
    }

    /*
     * Summary: Hoc vien dang ky tao tai khoan giao vien va dien luon thong
     *          tin ho so giao vien
     * Request type: POST
     * Role: Admin
     * Parameters: - role: body: Role can o day la giao vien
     * Response: - 200: success: tao thanh cong profile user va teacher
     *           - 400: bad request
     */
    public static async registerTeacherUser(
        req: ProtectedRequest,
        res: Response
    ) {
        req.body['role'] = [RoleCode.TEACHER];
        req.body['is_reviewed'] = EnumReviewStatus.PENDING;
        req.body['teacher_level_id'] = DEFAULT_TEACHER_LEVEL_ID;
        req.body['hourly_rate'] = 0;

        const user = await UserControllers.createUserByGuest(req);
        const msg = await TeacherController.createTeacher(req, user.id);

        await UserControllers.createVerifyUrl(
            user.id,
            user.email,
            user.first_name
        );

        const res_payload = {
            message: msg,
            user: {
                is_verified_email: user.is_verified_email
            }
        };

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Giao vien dang ky thong tin cua minh
     * Request type: POST
     * Role: User - Teacher
     * Parameters: - location_id: Dia diem cua giao vien
     * Response:   - 200: success: Dang ky thanh cong
     *             - 400: bad request: Da dang ky tu truoc
     *             - 400: bad request: Dia diem khong ton tai
     */
    public static async registerTeacherInfo(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        req.body['is_reviewed'] = EnumReviewStatus.PENDING;
        req.body['teacher_level_id'] = DEFAULT_TEACHER_LEVEL_ID;

        const msg = await TeacherController.createTeacher(req, id);
        return new SuccessResponse('success', msg).send(res, req);
    }

    public static async getTeachersWithRegularCalendarByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            location_id,
            teacher_level_id,
            subject_id,
            regular_time
        } = req.query;
        const filter: any = {};
        filter.page_size = page_size ? parseInt(page_size as string) : 20;
        filter.page_number = page_number ? parseInt(page_number as string) : 1;
        if (location_id) {
            // biết code ngu nhưng do thiết kế ngu + vận hành đòi các gói học location là châu á thì việt nam vẫn dạy được,
            // còn location việt nam thì bọn châu á đếch dạy đc
            if (Number(location_id) !== LOCATION_ID_ASIAN) {
                filter.location_id = parseInt(location_id as string);
            } else {
                filter.location_ids = [LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN];
            }
        }
        if (teacher_level_id) {
            filter.teacher_level_id = parseInt(teacher_level_id as string);
        }
        if (subject_id) {
            filter.subject_id = parseInt(subject_id as string);
        }
        let res_payload;
        if (!isNaN(parseInt(regular_time as string))) {
            const teachers =
                await TeacherActions.findAllAndPaginatedWithRegularCalendar(
                    filter,
                    parseInt(regular_time as string)
                );
            const count = await TeacherActions.countWithRegularCalendar(
                filter,
                parseInt(regular_time as string)
            );
            res_payload = {
                data: teachers,
                pagination: {
                    total: count
                }
            };
        } else {
            res_payload = {
                data: [],
                paginaton: {
                    total: 0
                }
            };
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    private static async getTeachersByNormalCalendar(
        req: ProtectedRequest,
        filter: object,
        calendar_filter: object
    ) {
        const teachers =
            await TeacherActions.findAllAndPaginatedWithNormalCalendar(
                filter,
                calendar_filter
            );
        const count = await TeacherActions.countWithNormalCalendar(
            filter,
            calendar_filter
        );
        const res_payload = {
            data: teachers,
            pagination: {
                total: count
            }
        };
        return res_payload;
    }

    /*
     * Summary: Get teachers list for admin, may contains inactive teachers
     */
    public static async getTeachersWithNormalCalendarByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const {
            name,
            is_active,
            location_ids,
            subject_ids,
            subject_skills,
            calendar,
            teacher_level_ids
        } = req.body;
        const filter = {
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string),
            location_id:
                location_ids && location_ids.length > 0
                    ? { $in: location_ids }
                    : null,
            teacher_level_id:
                teacher_level_ids && teacher_level_ids.length > 0
                    ? { $in: teacher_level_ids }
                    : null,
            'skills.subject_id':
                subject_ids && subject_ids.length > 0
                    ? { $in: subject_ids }
                    : null,
            'skills.subject_skills':
                subject_skills && subject_skills.length > 0
                    ? { $in: subject_skills }
                    : null,
            'user.is_active': is_active ? is_active : null,
            search: name && name.length != 0 ? name : null
        };
        const calendar_filter = buildCalendarFilter(calendar);
        const res_payload = await TeacherController.getTeachersByNormalCalendar(
            req,
            filter,
            calendar_filter
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summar: Get teachers list for web-client, active teachers only
     */
    public static async getTeachersByClient(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const {
            name,
            location_id,
            subject_ids,
            teacher_level_ids,
            subject_skills,
            calendar,
            type_filter,
            start_time
        } = req.body;
        const filter = {
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string),
            location_id: location_id ?? null,
            teacher_level_id:
                teacher_level_ids && teacher_level_ids.length > 0
                    ? { $in: teacher_level_ids }
                    : null,
            'skills.subject_id':
                subject_ids && subject_ids.length > 0
                    ? { $in: subject_ids }
                    : null,
            'skills.subject_skills':
                subject_skills && subject_skills.length > 0
                    ? { $in: subject_skills }
                    : null,
            'user.is_active': true,
            search: name && name.length != 0 ? name : null
        };
        const calendar_filter = buildCalendarFilter(calendar);
        if (calendar_filter.hasOwnProperty('start_time')) {
            /* This means that clients want to search by calendar */
            calendar_filter.is_active = true;
        }
        const res_payload = await TeacherController.getTeachersByNormalCalendar(
            req,
            filter,
            calendar_filter
        );
        if (
            type_filter === EnumTypeFilter.FIND_CLASS &&
            res_payload.pagination.total > 0
        ) {
            const cloneTeacher = new Array<any>();
            const startTime = parseInt(start_time as string);
            const endTime = moment(startTime).add(30, 'minute').valueOf();
            const time1970 = getTimestampInWeek(startTime);
            await Promise.all(
                res_payload.data.map(async (item: any) => {
                    const req = {
                        query: {
                            start_time: startTime,
                            end_time: endTime
                        }
                    };
                    const dataCalendar: any =
                        await CalendarController.getSchedulesActive(
                            req,
                            res,
                            parseInt(item.user_id as string)
                        );
                    // lọc các lịch cố định avaiable có time nhỏ hơn MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR
                    const current_moment = new Date().getTime();
                    dataCalendar.available_regular_schedule =
                        dataCalendar.available_regular_schedule.filter(
                            (e: any) => {
                                const start_time = new Date(e).getTime();
                                if (
                                    start_time - current_moment >=
                                    MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR
                                ) {
                                    return false;
                                }
                                return true;
                            }
                        );
                    const available_regular_schedule =
                        dataCalendar.available_regular_schedule;
                    const available_schedule = dataCalendar.available_schedule;
                    const booked_schedule = dataCalendar.booked_schedule;
                    const on_absent_period = dataCalendar.on_absent_period;
                    const registered_regular_schedule =
                        dataCalendar.registered_regular_schedule;
                    // close toàn bộ time nằm trong khoảng thời gian giáo viên xin nghỉ mà đã được staff chấp nhận
                    let flagShow = false;
                    if (on_absent_period && on_absent_period.length) {
                        // eslint-disable-next-line no-restricted-syntax
                        for await (const iterator of on_absent_period) {
                            if (
                                startTime >= iterator.start_time &&
                                startTime < iterator.end_time
                            ) {
                                flagShow = false;
                                return;
                            }
                        }
                    }
                    //  lịch linh hoạt available
                    if (available_schedule && available_schedule.length) {
                        const item = await available_schedule.find(
                            (x: { start_time: any }) =>
                                x.start_time === startTime
                        );
                        if (item) {
                            flagShow = true;
                        }
                    }
                    // lịch cố định đã đc match
                    if (
                        registered_regular_schedule &&
                        registered_regular_schedule.length
                    ) {
                        const item = await registered_regular_schedule.find(
                            (e: { regular_start_time: any }) =>
                                e.regular_start_time === time1970
                        );
                        if (item) {
                            flagShow = false;
                        }
                    }

                    //  lịch cố định available
                    if (
                        available_regular_schedule &&
                        available_regular_schedule.length
                    ) {
                        const item = await available_regular_schedule.find(
                            (x: any) => x === startTime
                        );
                        if (item) {
                            flagShow = true;
                        }
                    }

                    // lịch đã book
                    if (booked_schedule && booked_schedule.length) {
                        const item = await booked_schedule.find(
                            (x: { calendar: { start_time: any } }) =>
                                x.calendar.start_time === startTime
                        );
                        if (item) {
                            flagShow = false;
                        }
                    }

                    // mở các lịch đã có booking nhưng bị học viên cancel hoặc staff đổi lịch
                    if (booked_schedule && booked_schedule.length) {
                        const items = booked_schedule.filter(
                            (x: { calendar: { start_time: any } }) =>
                                x.calendar.start_time === startTime
                        );
                        if (items && items.length) {
                            // sort lại để lấy booking mới nhất
                            await items.sort(function (
                                a: {
                                    bookingCreated_time: string | number | Date;
                                },
                                b: {
                                    bookingCreated_time: string | number | Date;
                                }
                            ) {
                                return (
                                    new Date(b.bookingCreated_time).getTime() -
                                    new Date(a.bookingCreated_time).getTime()
                                );
                            });
                            if (
                                [
                                    EnumBookingStatus.CHANGE_TIME,
                                    EnumBookingStatus.CANCEL_BY_STUDENT
                                ].includes(items[0].bookingStatus)
                            ) {
                                flagShow = true;
                            }
                        }
                    }
                    if (flagShow) {
                        cloneTeacher.push({
                            ...item.toJSON()
                        });
                    }
                })
            );
            res_payload.data = cloneTeacher;
            res_payload.pagination.total = cloneTeacher.length;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getTeacherById(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const teacher = await TeacherActions.findOne({ user_id: parseInt(id) });
        if (!teacher)
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        const user = await UserActions.findOne({ id: teacher.user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const res_payload = {
            ...teacher.toJSON(),
            user_info: {
                avatar: user.avatar,
                full_name: user.full_name,
                skype_account: user.skype_account
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    // Teacher
    static async generateRefCode() {
        //generate ref code
        let ref_code = '';
        const ref_code_length = 10;
        const ref_code_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < ref_code_length; i++) {
            ref_code += ref_code_chars.charAt(
                Math.floor(Math.random() * ref_code_chars.length)
            );
        }
        return ref_code;
    }
    public static async getTeacherFullInfo(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const teacher = await TeacherActions.findOne({ user_id: id });
        if (!teacher) throw new BadRequestError(req.t('errors.user.not_found'));
        const tmp = teacher.toJSON();
        if (!teacher?.ref_code) {
            const ref_code = await TeacherController.generateRefCode();
            await TeacherActions.update({ _id: teacher._id }, {
                ref_code: ref_code + ''
            } as Teacher);
            tmp.ref_code = ref_code;
        }
        return new SuccessResponse('success', tmp).send(res, req);
    }

    private static async editTeacher(
        req: ProtectedRequest,
        res: Response,
        id: number
    ) {
        const teacher = await TeacherActions.findOne({ user_id: id });
        if (!teacher) throw new BadRequestError(req.t('errors.user.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TeacherModel',
            teacher,
            pickUpData
        );
        const user = await UserActions.findOne({ id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const diff = { ...req.body };
        if (diff.user_id) delete diff.user_id;

        if (diff.location_id && diff.location_id != teacher.location_id) {
            const location = await LocationActions.findOne({
                id: diff.location_id
            });
            if (!location) {
                throw new BadRequestError(req.t('errors.location.not_found'));
            }
            diff['location'] = location;
        }

        if (
            diff.teacher_level_id &&
            diff.teacher_level_id != teacher.teacher_level_id
        ) {
            const level = await TeacherLevelActions.findOne({
                id: diff.teacher_level_id
            });
            if (!level) {
                throw new BadRequestError(
                    req.t('errors.teacher_level.not_found')
                );
            }
            diff['level'] = level;
        }

        if (
            teacher.is_reviewed !== EnumReviewStatus.PENDING &&
            diff.hasOwnProperty('is_reviewed')
        ) {
            throw new BadRequestError(req.t('errors.teacher.reviewed'));
        }

        if (
            diff.is_reviewed === EnumReviewStatus.CONFIRMED &&
            !teacher.teacher_level_id
        ) {
            throw new BadRequestError(
                req.t('errors.teacher.teacher_level_required')
            );
        }

        if (
            diff.is_reviewed === EnumReviewStatus.CONFIRMED &&
            !user.is_verified_email
        ) {
            throw new BadRequestError(req.t('errors.user.email_not_verified'));
        }

        if (diff.is_verified_email && !user.is_verified_email) {
            await UserActions.update(user._id, {
                is_verified_email: true,
                is_active: true
            } as User);
        }

        if (
            diff.teacher_level_status &&
            !Object.values(TEACHER_LEVEL_STATUS).includes(
                diff.teacher_level_status
            )
        ) {
            throw new BadRequestError(
                req.t('errors.teacher_level.related_status_not_found')
            );
        }

        if (diff.is_active) {
            diff.user = {
                full_name: user.full_name,
                avatar: user.avatar,
                username: user.username,
                email: user.email,
                is_active: true
            };
        } else if (diff.is_active === false) {
            diff.user = {
                full_name: user.full_name,
                avatar: user.avatar,
                username: user.username,
                email: user.email,
                is_active: false
            };
        }

        const new_data = await TeacherActions.update(
            teacher._id,
            diff as Teacher
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'TeacherModel',
            new_data,
            pickUpData
        );
        return { message: 'Updated successfully' };
    }

    public static async editTeacherByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const mesg = await TeacherController.editTeacher(
            req,
            res,
            parseInt(teacher_id as string)
        );
        req.params.user_id = teacher_id;
        return await UserControllers.editTeacherByAdmin(req, res);
        // return new SuccessResponse('success', mesg).send(res,req);
    }

    public static async editTeacherByThemShelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;

        /* There are some fields that can only be edited by admins */
        const diff = { ...req.body };
        const invalidFields = ['teacher_level_id', 'updated_time'];
        invalidFields.forEach((field) => {
            if (diff.hasOwnProperty(field)) {
                throw new BadRequestError(
                    req.t('errors.user.edit_invalid_field')
                );
            }
        });

        const mesg = await TeacherController.editTeacher(req, res, id);
        return new SuccessResponse('success', mesg).send(res, req);
    }

    /*
     * Summary: Update teacher's average rating based on a rating of a
     *          completed lesson
     */
    public static async updateTeacherRating(
        req: ProtectedRequest,
        teacher_id: number,
        old_lesson_rating: number,
        new_lesson_rating: number,
        rated_lessons: number
    ) {
        if (old_lesson_rating == new_lesson_rating) return { updated: 'true' };
        /*
         * Should have been validate in the middleware for request body but one
         * can never be too sure
         */
        if (old_lesson_rating < 0) old_lesson_rating = 0;
        if (old_lesson_rating > 5) old_lesson_rating = 5;
        if (
            new_lesson_rating < 1 ||
            new_lesson_rating > 5 ||
            !Number.isInteger(new_lesson_rating)
        ) {
            throw new BadRequestError(req.t('errors.teacher.invalid_rating'));
        }

        const teacher = await TeacherActions.findOne({ user_id: teacher_id });
        if (!teacher)
            throw new BadRequestError(req.t('errors.teacher.not_found'));

        const total_lesson = teacher.total_lesson ? teacher.total_lesson : 0;
        /* Teacher should have taught at least 1 lesson for them to be rated */
        if (total_lesson < rated_lessons) {
            throw new InternalError(req.t('errors.teacher.rating'));
        }

        let average_rating;
        if (!rated_lessons) {
            average_rating = new_lesson_rating;
        } else {
            if (!teacher.average_rating) {
                throw new InternalError(req.t('errors.teacher.rating'));
            }
            if (old_lesson_rating) {
                average_rating =
                    (teacher.average_rating * rated_lessons -
                        old_lesson_rating +
                        new_lesson_rating) /
                    rated_lessons;
            } else {
                average_rating =
                    (teacher.average_rating * rated_lessons +
                        new_lesson_rating) /
                    (rated_lessons + 1);
            }
        }
        await TeacherActions.update(teacher._id, { average_rating } as Teacher);

        return { rated: 'true' };
    }

    public static async getPendingTeachers(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const filter = {
            search: '',
            is_reviewed: EnumReviewStatus.PENDING,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (search) {
            filter['search'] = String(search);
        }
        const teachers = await TeacherActions.findAllAndPaginatedWithStatus(
            filter,
            {},
            { created_time: 1 }
        );
        const teachersWithUser = await Promise.all(
            teachers.map(async (item: Teacher) => {
                const user = await UserActions.findOne({ id: item.user_id });
                const tmp = {
                    ...item.toJSON(),
                    user
                };
                return tmp;
            })
        );
        const count = await TeacherActions.count(filter);
        const resPayload = {
            data: _.orderBy(teachersWithUser, ['created_time'], ['asc']),
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), resPayload).send(
            res,
            req
        );
    }

    public static async teacherRequestReview(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            id,
            email,
            last_name,
            first_name,
            phone_number,
            gender,
            date_of_birth
        } = req.user;
        const teacher = await TeacherActions.findOne({ user_id: id });
        if (!teacher)
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        teacher.is_reviewed = EnumReviewStatus.PENDING;
        await teacher.save();
        return new SuccessResponse('success', {
            message: 'Teacher Send Request Review'
        }).send(res, req);
    }

    public static async getAllTeacherAndPaginated(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            search,
            status,
            staff_id,
            location_id,
            teacher_id,
            filter_type
        } = req.query;        
        const regular_times = req.query.regular_time
            ? JSON.parse(req.query.regular_time as string)
            : null;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string
        } as any;

        if (staff_id) {
            filter['staff_id'] = staff_id;
        }
        if (teacher_id) {
            filter['user_id'] = teacher_id;
        }
        if (location_id) {
            filter['location_id'] = location_id;
        }
        if (status) {
            filter['user.status'] = status === 'inactive' ? false : true;
            filter['user.is_active'] = status === 'inactive' ? false : true;
        }
        let teachers = [];
        let count = 0;
        if (filter_type === 'filter_2') {
            const filter_regular =
                await TeacherController.getConditionRegularTimeByDayOfWeek(
                    regular_times
                );
            teachers = await TeacherActions.findAllAndPaginatedByRegularTime(
                filter,
                { 'user.created_time': 1 },
                filter_regular
            );
            const matchCountTeacher = await TeacherActions.countByRegularTime(
                filter,
                filter_regular
            );
            if (
                size(teachers) > 0 &&
                matchCountTeacher[0] &&
                matchCountTeacher[0].hasOwnProperty('count')
            ) {
                count = matchCountTeacher[0].count;
            }
        } else {       
            teachers = await TeacherActions.findAllAndPaginatedWithStatus(
                filter,
                {},
                { created_time: 1 }
            );

            logger.info(`teacher result: ${size(teachers)}`);
            count = await TeacherActions.count(filter);
        }
        const res_payload = {
            data: teachers,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static getConditionRegularTimeByDayOfWeek = (regular_times: any) => {
        const arrTime = new Array<any>();
        for (const regular_time of regular_times) {
            arrTime.push({
                'user.regular_times': {
                    $elemMatch: {
                        $gte: regular_time.start_time,
                        $lt: regular_time.end_time
                    }
                }
            });
        }
        return arrTime;
    };

    public static async getStudentsByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const studentIds = await BookingActions.getStudentsByTeacher(
            req.user.id
        );
        const response_data = await Promise.all(
            studentIds.map(async (studentId) => {
                const student = await UserActions.findOne({
                    id: parseInt(studentId as string)
                });
                return student;
            })
        );
        return new SuccessResponse('success', { data: response_data }).send(
            res,
            req
        );
    }

    public static async getCourseByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const courseIds = await BookingActions.getCoursesByTeacher(req.user.id);
        const response_data = await Promise.all(
            courseIds.map(async (courseId) => {
                const course = await CourseActions.findOne({ _id: courseId });
                return course;
            })
        );
        return new SuccessResponse('success', { data: response_data }).send(
            res,
            req
        );
    }

    public static async findAvailableTeachersInSpecificTime(
        req: ProtectedRequest,
        res: Response
    ) {
        const { start_time, location_id, page_size, page_number, search } =
            req.query;

        const res_payload = {
            data: new Array<Teacher>(),
            pagination: {
                total: 0
            }
        };
        if (!start_time || Number.isNaN(start_time)) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        const teacher_set =
            await CalendarController.getAvailableTeacherListFromStartTime(
                req,
                parseInt(start_time as string)
            );
        const filter = {
            user_id: { $in: Array.from(teacher_set) },
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string,
            'user.is_active': true
        } as any;
        if (location_id) {
            if (Number(location_id) !== LOCATION_ID_ASIAN) {
                filter.location_id = parseInt(location_id as string);
            } else {
                filter.location_ids = [LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN];
            }
        }
        res_payload.data = await TeacherActions.findAllAndPaginated(
            filter,
            {
                user_id: 1,
                location_id: 1,
                teacher_level_id: 1,
                teacher_level_status: 1,
                intro_video: 1,
                experience: 1,
                about_me: 1,
                average_rating: 1,
                skills: 1,
                job_qualification: 1,
                degree: 1,
                english_certificate: 1,
                teaching_certificate: 1,
                location: 1,
                user: 1
            },
            {
                average_rating: -1
            }
        );
        res_payload.pagination.total = await TeacherActions.count(filter);

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getListTeachersForReport(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, status, search, staff_id } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            filter['user.is_active'] = status === 'active';
        }
        if (search) {
            filter.search = search;
        }
        if (staff_id) {
            filter['staff_id'] = staff_id;
        }
        const teachers = await TeacherActions.findAllAndPaginatedWithStatus(
            filter,
            { teacher_salary: 0 },
            { created_time: 1 }
        );
        const count = await TeacherActions.count(filter);
        const res_payload = {
            data: teachers,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getReferredTeachers(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const { id } = req.user;
        const teacher = await TeacherActions.findOne({ user_id: id });
        if (!teacher)
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        const referred_teachers = await TeacherActions.findAllAndPaginated(
            {
                'ref_by_teacher.id': teacher.user_id,
                page_number: parseInt(page_number as string),
                page_size: parseInt(page_size as string)
            },
            {},
            { created_time: 1 }
        );
        const data: any[] = [];
        await Promise.all(
            referred_teachers.map(async (_teacher) => {
                const tmp: any = _teacher.toJSON();
                const bookings = await BookingActions.findAll(
                    { teacher_id: tmp.user_id },
                    { 'calendar.start_time': 1 }
                );
                if (bookings.length > 0)
                    tmp.first_booking = bookings[0].calendar.start_time;
                data.push(tmp);
            })
        );
        const count = await TeacherActions.count({
            'ref_by_teacher.id': teacher.user_id
        });
        const res_payload = {
            data: data,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getReferredTeachersByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const teachers = await TeacherActions.findAllAndPaginated(
            {
                search: search as string,
                referred: true,
                page_number: parseInt(page_number as string),
                page_size: parseInt(page_size as string)
            },
            {},
            { created_time: 1 }
        );
        const data: any[] = [];
        await Promise.all(
            teachers.map(async (_teacher) => {
                const tmp: any = _teacher.toJSON();
                const refByTeacher = await UserActions.findOne({
                    id: tmp.ref_by_teacher.id
                });
                if (refByTeacher)
                    tmp.ref_by_teacher.full_name = refByTeacher.full_name;
                const bookings = await BookingActions.findAll(
                    {
                        teacher_id: tmp.user_id
                    },
                    { 'calendar.start_time': 1 }
                );
                if (bookings.length > 0)
                    tmp.first_booking = bookings[0].calendar.start_time;
                data.push(tmp);
            })
        );
        const count = await TeacherActions.count({
            referred: true,
            search: search as string
        });
        const res_payload = {
            data: data,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}
