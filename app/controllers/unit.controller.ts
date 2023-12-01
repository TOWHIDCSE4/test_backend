import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import BookingActions from '../actions/booking';
import CounterActions from '../actions/counter';
import CourseActions from '../actions/course';
import OrderedPackageActions from '../actions/ordered-package';
import UnitActions from '../actions/unit';
import { EnumPackageOrderType } from '../const/package';
import { BadRequestError } from '../core/ApiError';
import Booking, { BookingModel, EnumBookingStatus } from '../models/booking';
import Unit, { EnumExamType, EnumUnitType } from '../models/unit';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import { SuccessResponse } from './../core/ApiResponse';

const pickUpData = [
    '_id',
    'id',
    'is_active',
    'course_id',
    'name',
    'student_document',
    'teacher_document',
    'audio',
    'note',
    'preview',
    'workbook',
    'homework_id',
    'exam_id',
    'exam_type',
    'test_topic_id',
    'display_order'
];

export default class UnitController {
    /*
     * Summary: Admin lay toan bo danh sach toan bo cac bai hoc
     * Role: Admin
     * Request type: GET
     * Parameters: - page_size: So entry hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     * Response:   - 200: success: Lay duoc danh sach
     */
    public static async getUnitsByAdmin(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search, course_ids } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string,
            course_ids:
                course_ids && _.isArray(course_ids)
                    ? course_ids.map((id) => parseInt(id as string))
                    : course_ids
                    ? [parseInt(course_ids as string)]
                    : []
        };
        if (req.query.hasOwnProperty('is_active')) {
            filter.is_active = req.query.is_active == 'true';
        }
        const units = await UnitActions.findAllAndPaginated(filter);
        const count = await UnitActions.count(filter);
        const res_payload = {
            data: units,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getUnitsByUser(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search, course_ids } = req.query;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            is_active: true,
            search: search as string,
            course_ids:
                course_ids && _.isArray(course_ids)
                    ? course_ids.map((id) => parseInt(id as string))
                    : course_ids
                    ? [parseInt(course_ids as string)]
                    : []
        };
        const units = await UnitActions.findAllAndPaginated(filter);
        const count = await UnitActions.count(filter);
        const res_payload = {
            data: units,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Hoc sinh lay danh sach cac bai hoc trong 1 khoa hoc
     * Role: User
     * Request type: GET
     * Parameters: - course_id: ID cua khoa hoc
     *             - page_size: So entry duoc hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     * Response:   - 200: success: Lay duoc danh sach
     */
    /**@TODO: Consider dropping this, check if ispeak web is using this route */
    public static async getUnitsByCourse(req: ProtectedRequest, res: Response) {
        const { course_id } = req.params;
        const { page_size, page_number, search } = req.query;
        const filter = {
            course_id: parseInt(course_id as string),
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            is_active: true,
            search: search as string
        };
        const sort = {
            display_order: 1,
            id: 1
        };
        const units = await UnitActions.findAllAndPaginated(filter, sort);
        const count = await UnitActions.count(filter);
        const res_payload = {
            data: units,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Admin tao mot bai hoc moi
     * Role: Admin
     * Request type: POST
     * Parameters: - course_id: ID khoa hoc
     *             - name: Ten bai hoc
     * Response:   - 200: success: Tao thanh cong
     *             - 400: bad request: Khoa hoc khong ton tai
     *             - 400: bad request: Trung ten bai hoc khac
     *             - 400: bad request: Khong tao duoc id
     */
    public static async createUnit(req: ProtectedRequest, res: Response) {
        const {
            course_id,
            name,
            student_document,
            teacher_document,
            audio,
            workbook,
            homework,
            homework_id,
            exam_id,
            exam,
            homework2,
            homework2_id,
            exam_type,
            test_topic,
            test_topic_id,
            ielts_reading_topic,
            ielts_reading_topic_id,
            ielts_writing_topic,
            ielts_writing_topic_id,
            ielts_listening_topic,
            ielts_listening_topic_id,
            unit_type
        } = req.body;

        const course = await CourseActions.findOne({
            id: parseInt(course_id as string)
        });
        if (!course)
            throw new BadRequestError(req.t('errors.course.not_found'));

        const unit = await UnitActions.findOne({ name });
        if (unit) throw new BadRequestError(req.t('errors.unit.name_exist'));

        if (exam_type && exam_type === EnumExamType.FINAL_EXAM) {
            const totalFinalExam = await UnitActions.count({
                course_id,
                exam_type: EnumExamType.FINAL_EXAM
            });
            if (totalFinalExam >= 1)
                throw new BadRequestError(
                    req.t('errors.unit.final_exam_exist')
                );
        }

        // bài thi exam type = 1,2 là mid và final exam thì cần check đk chọn test topic
        if (
            (exam_type == EnumExamType.MIDTERM_EXAM ||
                exam_type == EnumExamType.FINAL_EXAM) &&
            !test_topic_id &&
            unit_type !== EnumUnitType.IELTS_4_SKILLS
        ) {
            throw new BadRequestError(req.t('errors.unit.test_topic_null'));
        }

        const counter = await CounterActions.findOne();
        const id = counter.unit_id;
        const unitInfo = {
            id,
            is_active: true,
            course_id: parseInt(course_id as string),
            name: name,
            course: course,
            student_document,
            teacher_document,
            audio,
            workbook,
            homework,
            homework_id,
            exam_id,
            exam,
            homework2,
            homework2_id,
            exam_type,
            test_topic,
            test_topic_id,
            ielts_reading_topic,
            ielts_reading_topic_id,
            ielts_writing_topic,
            ielts_writing_topic_id,
            ielts_listening_topic,
            ielts_listening_topic_id,
            unit_type
        };
        // if (!_.isEmpty(homework)) {
        //     const questions = homework.questions
        //     if (!_.isEmpty(questions)) {
        //         req.body = { ...homework }
        //         const newQuiz = await QuizController.createQuizByReqHomework(req)
        //         for(const item of questions) {
        //             const questionInfo = {
        //                 ...item,
        //                 quiz_id: newQuiz.id
        //             }
        //             req.body = { ...questionInfo }
        //             await QuestionController.createQuestionByReqHomework(req)
        //         }
        //         unitInfo.homework = newQuiz
        //     } else {
        //         throw new Error(req.t('error.question.questions_not_empty'))
        //     }
        // }
        await UnitActions.create({ ...unitInfo } as Unit);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    /*
     * Summary: Admin sua mot bai hoc
     * Role: Admin
     * Request type: PUT
     * Parameters: - unit_id: ID cua bai hoc
     *             - name: Ten bai hoc
     * Response:   - 200: success: Chinh sua thanh cong
     *             - 400: bad request: Bai hoc khong ton tai
     *             - 400: bad request: Trung ten bai hoc khac
     */
    public static async editUnit(req: ProtectedRequest, res: Response) {
        const { unit_id } = req.params;
        const {
            course_id,
            is_active,
            name,
            student_document,
            teacher_document,
            audio,
            workbook,
            homework,
            exam,
            exam_id,
            homework_id,
            exam_type,
            homework2,
            homework2_id,
            test_topic,
            test_topic_id,
            ielts_reading_topic,
            ielts_reading_topic_id,
            ielts_writing_topic,
            ielts_writing_topic_id,
            ielts_listening_topic,
            ielts_listening_topic_id,
            unit_type
        } = req.body;
        const res_payload: any = {
            bookings: new Array<Booking>()
        };
        const diff: any = {
            course_id,
            name,
            student_document,
            teacher_document,
            audio,
            workbook,
            homework,
            exam,
            exam_id,
            homework_id,
            exam_type,
            homework2,
            homework2_id,
            test_topic,
            test_topic_id,
            ielts_reading_topic,
            ielts_reading_topic_id,
            ielts_writing_topic,
            ielts_writing_topic_id,
            ielts_listening_topic,
            ielts_listening_topic_id,
            unit_type
        };
        if (exam_type && exam_type === EnumExamType.FINAL_EXAM) {
            const totalFinalExam = await UnitActions.countCheckFinalExam({
                id: Number(unit_id),
                course_id,
                exam_type: EnumExamType.FINAL_EXAM
            });
            if (totalFinalExam >= 1)
                throw new BadRequestError(
                    req.t('errors.unit.final_exam_exist')
                );
        }
        // if (exam_type && exam_type === EnumExamType.MIDTERM_EXAM) {
        //     const totalMidtermExam = await UnitActions.count({
        //         course_id,
        //         exam_type: EnumExamType.MIDTERM_EXAM
        //     });
        //     if (totalMidtermExam >= 1)
        //         throw new BadRequestError(
        //             req.t('errors.unit.midterm_exam_exist')
        //         );
        // }
        const unit = await UnitActions.findOne({
            id: parseInt(unit_id as string)
        });
        if (!unit) throw new BadRequestError(req.t('errors.unit.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'UnitModel',
            unit,
            pickUpData
        );

        if (name != unit.name) {
            const check_name = await UnitActions.findOne({ name });
            if (check_name)
                throw new BadRequestError(req.t('errors.unit.name_exist'));
        }

        if (course_id !== unit.course_id) {
            const course = await CourseActions.findOne({
                id: parseInt(course_id as string)
            });
            if (!course)
                throw new BadRequestError(req.t('errors.course.not_found'));
            diff.course = course;
        }
        // bài thi exam type = 1,2 là mid và final exam thì cần check đk chọn test topic
        if (
            (exam_type == EnumExamType.MIDTERM_EXAM ||
                exam_type == EnumExamType.FINAL_EXAM) &&
            !test_topic_id &&
            unit_type !== EnumUnitType.IELTS_4_SKILLS
        ) {
            throw new BadRequestError(req.t('errors.unit.test_topic_null'));
        }
        if (
            unit.is_active &&
            !is_active &&
            req.body.hasOwnProperty(is_active)
        ) {
            res_payload.bookings = await UnitController.deactivateUnit(
                unit,
                false
            );
        }
        const new_data = await UnitActions.update(unit._id, {
            ...diff
        } as Unit);

        if (new_data) {
            const orderTrials = await OrderedPackageActions.findAll({
                type: [EnumPackageOrderType.TRIAL]
            });
            const package_ids = orderTrials.map((e) => e.id);

            const bookings = await BookingModel.find({
                unit_id: new_data.id,
                status: [
                    EnumBookingStatus.PENDING,
                    EnumBookingStatus.CONFIRMED,
                    EnumBookingStatus.TEACHING
                ],
                ordered_package_id: { $in: package_ids },
                'test_result.vocabulary': { $exists: false },
                'test_result.reading': { $exists: false },
                'test_result.writing': { $exists: false },
                'test_result.grammar': { $exists: false }
            });

            await Promise.all(
                bookings.map(async (e) => {
                    e.test_topic_id = new_data.test_topic_id || null;
                    e.test_topic_name = new_data.test_topic?.topic || '';
                    await e.save();
                })
            );
        }

        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'UnitModel',
            new_data,
            pickUpData
        );
        if (res_payload.bookings.length > 0) {
            res_payload.warning = req.t('success.unit.cant_deactivate');
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async deactivateUnit(
        unit: Unit,
        force: boolean
    ): Promise<Array<Booking>> {
        const bookings = await BookingActions.findAll({
            unit_id: unit.id,
            status: [
                EnumBookingStatus.PENDING,
                EnumBookingStatus.CONFIRMED,
                EnumBookingStatus.TEACHING
            ]
        });
        if (bookings.length == 0 || force) {
            await UnitActions.update(unit._id, { is_active: false } as Unit);
        }
        return bookings;
    }

    /*
     * Summary: Admin xoa mot bai hoc
     * Role: Admin
     * Request type: DELETE
     * Parameters: - unit_id: ID cua bai hoc
     * Reponse:    - 200: success: Xoa thanh cong
     *             - 400: bad request: Bai hoc khong ton tai
     */
    public static async removeUnit(req: ProtectedRequest, res: Response) {
        const unit_id = parseInt(req.params.unit_id as string);
        const { force } = req.body;
        const res_payload: any = {
            bookings: new Array<Booking>()
        };
        const unit = await UnitActions.findOne({ id: unit_id });
        if (unit) {
            const checked_booking = await BookingActions.findOne({ unit_id });
            if (!checked_booking) {
                await UnitActions.remove(unit._id);
            } else {
                res_payload.bookings = await UnitController.deactivateUnit(
                    unit,
                    !!force
                );
                if (res_payload.bookings.length > 0) {
                    res_payload.warning = req.t(
                        'success.units.cant_deactivate'
                    );
                } else {
                    res_payload.warning = req.t('success.units.deactivate');
                }
                if (force) {
                    res_payload.warning = req.t('success.units.deactivate');
                }
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async updateUnitCourse(req: ProtectedRequest, res: Response) {
        const data = req.body.data;
        const courseId = req.body.courseId;
        const course_id = req.body.course_id;

        const filter = {
            course_id: parseInt(courseId as string)
        };
        const units = await UnitActions.findAll(filter);
        // remove all maping unit - course
        await Promise.all(
            units.map(async (unit: Unit) => {
                unit.course_id = -1;
                unit.course = undefined;
                await unit.save();
            })
        );

        await Promise.all(
            data.map(async (item: any) => {
                const unit = await UnitActions.findOne({ id: item.id });
                if (unit) {
                    unit.course_id = courseId;
                    unit.course = course_id;
                    unit.display_order = item.display_order;
                    await unit.save();
                }
            })
        );

        return new SuccessResponse(req.t('common.success'), {}).send(res, req);
    }
}
