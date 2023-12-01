import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import BookingActions from '../actions/booking';
import CourseActions from '../actions/course';
import CounterActions from '../actions/counter';
import CurriculumActions from '../actions/curriculum';
import PackageActions from '../actions/package';
import RegularCalendarActions from '../actions/regular-calendar';
import SubjectActions from '../actions/subject';
import UnitActions from '../actions/unit';
import Booking, { EnumBookingStatus } from '../models/booking';
import Course, { EnumCourseStatus, EnumCourseTag } from '../models/course';
import Package from '../models/package';
import RegularCalendar, {
    EnumRegularCalendarStatus
} from '../models/regular-calendar';
import OrderedPackageController from './ordered-package.controller';
import {
    createAliasName,
    createSlugsName
} from './../utils/create-alias-name-utils';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'is_active',
    'subject_id',
    'curriculum_id',
    'display_order',
    'name',
    'alias',
    'description',
    'slug',
    'image',
    'tags',
    'units',
    'packages'
];
export default class CourseController {
    /*
     * Summary: Lay danh sach toan bo cac khoa hoc
     * Request type: GET
     * Parameters: - page_size: So entry hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     * Response:   - 200: success: Lay duoc danh sach
     */

    public static async getCoursesByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            search,
            package_ids,
            subject_ids,
            tags,
            curriculum_id
        } = req.query;
        let status: any = req.query.status;
        if (status) {
            status = parseInt(status as string);
        }
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string,
            curriculum_id: curriculum_id
                ? parseInt(curriculum_id as string)
                : 0,
            package_id_list:
                package_ids && _.isArray(package_ids)
                    ? package_ids.map((id) => parseInt(id as string))
                    : package_ids
                    ? [parseInt(package_ids as string)]
                    : [],
            subject_ids:
                subject_ids && _.isArray(subject_ids)
                    ? subject_ids.map((id) => parseInt(id as string))
                    : subject_ids
                    ? [parseInt(subject_ids as string)]
                    : [],
            tags: tags && _.isArray(tags) ? tags : tags ? [tags] : []
        };
        if (req.query.hasOwnProperty('is_active')) {
            filter.is_active = req.query.is_active == 'true';
        }

        if (status === EnumCourseStatus.ACTIVE) {
            filter.is_active = 'true';
        } else if (status === EnumCourseStatus.INACTIVE) {
            filter.is_active = 'false';
        }

        const courses = await CourseActions.findAllAndPaginated(filter, {
            is_active: -1
        });
        const count = await CourseActions.count(filter);
        const res_payload = {
            data: courses,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getCoursesByUser(req: ProtectedRequest, res: Response) {
        const {
            page_size,
            page_number,
            search,
            package_ids,
            subject_ids,
            tags,
            curriculum_id,
            course_type
        } = req.query;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            is_active: true,
            search: search as string,
            curriculum_id: curriculum_id
                ? parseInt(curriculum_id as string)
                : 0,
            package_id_list:
                package_ids && _.isArray(package_ids)
                    ? package_ids.map((id) => parseInt(id as string))
                    : package_ids
                    ? [parseInt(package_ids as string)]
                    : [],
            subject_ids:
                subject_ids && _.isArray(subject_ids)
                    ? subject_ids.map((id) => parseInt(id as string))
                    : subject_ids
                    ? [parseInt(subject_ids as string)]
                    : [],
            tags: tags && _.isArray(tags) ? tags : tags ? [tags] : [],
            course_type: course_type as string
        };
        const courses =
            await CourseActions.findCourseAndTotalLessonAndPaginated(filter);
        const count = await CourseActions.count(filter);
        const res_payload = {
            data: courses,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Get all of available courses of a student by checking
     *          all of the active packages that he bought at the moment
     * Argument: user_id: number: Id of the student
     * Return: A set of course_ids
     */
    /** @TODO: Fix this later due to changes in course-package relations */
    public static async getAllAvailableCoursesByStudent(
        req: ProtectedRequest,
        user_id: number
    ): Promise<Set<number>> {
        const packages =
            await OrderedPackageController.getAllActiveOrderedPackagesOfStudent(
                user_id
            );
        const availableCoursesSet = new Set<number>();
        const courses = await CourseActions.findAll({
            package_id_list: Array.from(packages),
            is_active: true
        });
        for (const course of courses) {
            availableCoursesSet.add(course.id);
        }

        return availableCoursesSet;
    }

    /*
     * Summary: Admin tao mot khoa hoc moi
     * Request type: POST
     * Parameters: - package_id_list: ID cac goi hoc
     *             - subject_id: ID mon hoc
     *             - name: Ten khoa hoc
     *             - description: Gioi thieu khoa hoc
     * Response:   - 200: success: Tao thanh cong
     *             - 400: bad request: Goi hoc khong ton tai
     *             - 400: bad request: Mon hoc khong ton tai
     *             - 400: bad request: Trung ten khoa hoc khac
     *             - 400: bad request: Khong tao duoc id
     */
    public static async createCourse(req: ProtectedRequest, res: Response) {
        const {
            subject_id,
            package_id_list,
            name,
            description,
            image,
            curriculum_id,
            course_type
        } = req.body;
        const tags = req.body.tags ? req.body.tags : [];
        const packages = new Array<Package>();

        const subject = await SubjectActions.findOne({
            id: parseInt(subject_id as string)
        });
        if (!subject)
            throw new BadRequestError(req.t('errors.subject.not_found'));

        if (
            package_id_list &&
            Array.isArray(package_id_list) &&
            package_id_list.length > 0
        ) {
            package_id_list.sort((a, b) => {
                return a - b;
            });
            for (const package_id of package_id_list) {
                const pack = await PackageActions.findOne({
                    id: package_id,
                    is_active: true,
                    subject_id: parseInt(subject_id as string)
                });
                if (!pack) {
                    throw new BadRequestError(
                        req.t('errors.package.not_found')
                    );
                }
                packages.push(pack);
            }
        }
        let curriculum: any = undefined;
        if (curriculum_id) {
            curriculum = await CurriculumActions.findOne({ id: curriculum_id });
            if (!curriculum) {
                throw new BadRequestError(req.t('errors.curriculum.not_found'));
            }
        }

        const alias = createAliasName(name);
        const slug = createSlugsName(name);
        const course = await CourseActions.findOne({ alias });
        if (course)
            throw new BadRequestError(req.t('errors.course.name_exist'));

        const counter = await CounterActions.findOne();
        const id = counter.course_id;
        const courseInfo = {
            id: id,
            is_active: true,
            package_id_list: packages.length > 0 ? package_id_list : [],
            subject_id: parseInt(subject_id as string),
            curriculum_id,
            name: name,
            alias: alias,
            description: description,
            slug: slug,
            packages,
            subject: subject,
            curriculum,
            image,
            course_type,
            tags: _.intersection(Object.values(EnumCourseTag), _.uniq(tags))
        };
        await CourseActions.create({ ...courseInfo } as Course);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    /*
     * Summary: Admin sua mot khoa hoc
     * Request type: PUT
     * Parameters: - course_id: ID cua khoa hoc
     *             - name: Ten khoa hoc
     *             - description: Gioi thieu khoa hoc
     * Response:   - 200: success: Chinh sua thanh cong
     *             - 400: bad request: Khoa hoc khong ton tai
     *             - 400: bad request: Trung ten khoa hoc khac
     */
    public static async editCourse(req: ProtectedRequest, res: Response) {
        const { course_id } = req.params;
        const diff = { ...req.body };
        let booked_data = {
            regular_calendars: new Array<RegularCalendar>(),
            bookings: new Array<Booking>()
        };

        const course = await CourseActions.findOne({
            id: parseInt(course_id as string)
        });
        if (!course)
            throw new BadRequestError(req.t('errors.course.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'CourseModel',
            course,
            pickUpData
        );
        let packages = [];
        const name = diff.name ? diff.name : course.name;
        diff.alias = createAliasName(name);
        diff.slug = createSlugsName(name);
        if (diff.alias !== course.alias) {
            const check_name = await CourseActions.findOne({
                alias: diff.alias
            });
            if (check_name)
                throw new BadRequestError(req.t('error.course.name_exist'));
        }

        if (diff.tags) {
            diff.tags = _.intersection(
                Object.values(EnumCourseTag),
                _.uniq(diff.tags)
            );
        }
        if (diff.curriculum_id) {
            const curriculum = await CurriculumActions.findOne({
                id: diff.curriculum_id
            });
            if (!curriculum) {
                throw new BadRequestError(req.t('errors.curriculum.not_found'));
            }
            diff.curriculum = curriculum;
        }

        const package_id_list = diff.package_id_list;
        if (package_id_list && Array.isArray(package_id_list)) {
            if (package_id_list.length == 0) {
                packages = [];
            } else {
                for (const package_id of package_id_list) {
                    const pack = await PackageActions.findOne({
                        id: package_id,
                        is_active: true,
                        subject_id: course.subject_id
                    });
                    if (!pack) {
                        throw new BadRequestError(
                            req.t('errors.package.not_found')
                        );
                    }
                    packages.push(pack);
                }
                packages.sort((a, b) => {
                    return a.id - b.id;
                });
            }
            diff.packages = packages;
        }

        if (course.is_active && diff.is_active == false) {
            booked_data = await CourseController.deactivateCourse(
                course,
                false
            );
        }
        const res_payload: any = {
            booked_data
        };

        if (
            booked_data.bookings.length > 0 ||
            booked_data.regular_calendars.length > 0
        ) {
            res_payload.warning = req.t('success.course.cant_deactivate');
        }

        const new_data = await CourseActions.update(course._id, {
            ...diff
        } as Course);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'CourseModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async assignCoursesForMultiPackages(
        req: ProtectedRequest,
        res: Response
    ) {
        const { list_course, list_package } = req.body;
        for (const iterator of list_course) {
            const course = await CourseActions.findOne({
                id: Number(iterator)
            });
            if (course) {
                const package_id_list = course.package_id_list;
                await Promise.all(
                    list_package.map(async (e: any) => {
                        if (!package_id_list.includes(e)) {
                            const pack = await PackageActions.findOne({
                                id: e
                            });
                            if (pack) {
                                course.package_id_list.push(e);
                                course.packages.push(pack._id);
                            }
                        }
                    })
                );
                await course.save();
            }
        }
        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }
    private static async deactivateCourse(course: Course, force: boolean) {
        const regular_calendars = await RegularCalendarActions.findAll({
            course_id: course.id,
            status: [
                EnumRegularCalendarStatus.ACTIVE,
                EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING
            ]
        });
        const bookings = await BookingActions.findAll({
            course_id: course.id,
            status: [
                EnumBookingStatus.PENDING,
                EnumBookingStatus.CONFIRMED,
                EnumBookingStatus.TEACHING
            ]
        });
        const booked_data = {
            regular_calendars,
            bookings
        };
        if ((regular_calendars.length == 0 && bookings.length == 0) || force) {
            await CourseActions.update(course._id, {
                is_active: false
            } as Course);
        }
        return booked_data;
    }

    /*
     * Summary: Admin xoa mot khoa hoc
     * Request type: DELETE
     * Parameters: - course_id: ID cua khoa hoc
     * Response:   - 200: success: Xoa thanh cong
     *             - 400: bad request: Khoa hoc khong ton tai
     */
    public static async removeCourse(req: ProtectedRequest, res: Response) {
        const course_id = parseInt(req.params.course_id as string);
        const { force } = req.body;
        const res_payload: any = {
            booked_data: {
                regular_calendars: new Array<RegularCalendar>(),
                bookings: new Array<Booking>()
            }
        };
        const course = await CourseActions.findOne({ id: course_id });
        if (course) {
            const checked_unit = await UnitActions.findOne({
                course_id
            });
            const checked_regular = await RegularCalendarActions.findOne({
                course_id
            });
            const checked_booking = await BookingActions.findOne({
                course_id
            });
            if (!checked_unit && !checked_regular && !checked_booking) {
                await CourseActions.remove(course._id);
            } else {
                res_payload.booked_data =
                    await CourseController.deactivateCourse(course, !!force);
                if (
                    res_payload.booked_data.bookings.length > 0 ||
                    res_payload.booked_data.regular_calendars.length > 0
                ) {
                    res_payload.message = req.t(
                        'success.course.cant_deactivate'
                    );
                } else {
                    res_payload.message = req.t('success.course.deactivate');
                }
                if (force) {
                    res_payload.message = req.t('success.course.deactivate');
                }
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /*
     * Summary: Lay thong tin mon hoc cua khoa hoc
     * Request type: GET
     * Parameters: - course_id: ID cua khoa hoc
     * Response:   - 200: Lay thong tin mon hoc thanh cong
     *             - 400: bad request: Khoa hoc khong ton tai
     */
    public static async getSubjectInfoByCourse(
        req: ProtectedRequest,
        res: Response
    ) {
        const { course_id } = req.params;
        const course = await CourseActions.findOne({
            id: parseInt(course_id as string)
        });
        if (!course) throw new BadRequestError(req.t('error.course.not_found'));
        return new SuccessResponse('success', course.subject).send(res, req);
    }

    public static async getCourseInfo(req: ProtectedRequest, res: Response) {
        try {
            const { id } = req.params;
            const course = await CourseActions.findOne({
                id: parseInt(id as string)
            });
            if (!course)
                throw new BadRequestError(req.t('error.course.not_found'));
            const units = req.headers.authorization
                ? await UnitActions.findAllPublicAuth({ course_id: course.id })
                : await UnitActions.findAllPublic(
                      { course_id: course.id },
                      { name: 1, note: 1, preview: 1, id: 1, course_id: 1 }
                  );
            return new SuccessResponse('success', {
                ...course.toJSON(),
                units
            }).send(res, req);
        } catch (error) {
            throw new BadRequestError();
        }
    }

    public static async getNextCourse(req: ProtectedRequest, res: Response) {
        try {
            const { course_id } = req.query;
            const course = await CourseActions.findOne({
                id: parseInt(course_id as string)
            });
            if (!course)
                throw new BadRequestError(req.t('error.course.not_found'));
            const { curriculum_id, display_order } = course;
            const listCourses = await CourseActions.findAll(
                {
                    curriculum_id: curriculum_id,
                    is_active: true
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
            return new SuccessResponse('success', nextCourse).send(res, req);
        } catch (error) {
            console.log(error);
            throw new BadRequestError();
        }
    }
}
