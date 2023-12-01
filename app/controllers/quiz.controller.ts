import { PIVOT_HOUR_FOR_AVG, OVER_TIME_FOR_DO_HOMEWORK } from './../const';
import { EnumBookingStatus } from './../models/booking';
import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import BookingActions from '../actions/booking';
import _ from 'lodash';
import { EnumHomeworkType } from './../models/unit';

export type FilterHomework = {
    page_size: number;
    page_number: number;
    status: EnumBookingStatus[];
    student_id: any;
    homework: any;
    homework_type: string;
};
export default class QuizController {
    public static async getHomeworksByUser(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, type } = req.query;
        const user_id = req.user.id;
        const filter: FilterHomework = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            status: [EnumBookingStatus.COMPLETED, EnumBookingStatus.TEACHING, EnumBookingStatus.TEACHER_CONFIRMED, EnumBookingStatus.TEACHER_ABSENT, EnumBookingStatus.STUDENT_ABSENT],
            student_id: user_id,
            homework: undefined,
            homework_type: type as string
        };
        const homeworks = await BookingActions.findHomeworksByStudent(filter);
        const count = await BookingActions.countHomeworksByStudent(filter);
        const res_payload = {
            data: homeworks,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getExamByUser(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, type } = req.query;
        const user_id = req.user.id;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            student_id: user_id,
            exam_type: type as string
        };
        const exams = await BookingActions.findExamsByStudent(filter);
        const count = await BookingActions.countExamsByStudent(filter);
        const res_payload = {
            data: exams,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async checkHasHomeworkV1(
        req: ProtectedRequest,
        res: Response
    ) {
        const query = {
            student_id: _.toInteger(req.user.id),
            status: EnumBookingStatus.COMPLETED,
            $and: [
                {
                    $or: [
                        {
                            $and: [
                                { 'unit.homework.id': { $exists: true } },
                                { 'unit.homework2': null },
                                {
                                    $or: [
                                        { 'homework.sessions': { $size: 0 } },
                                        { homework: null }
                                    ]
                                }
                            ]
                        },
                        {
                            $and: [
                                { 'unit.homework.id': { $exists: true } },
                                { 'homework.sessions': { $gt: { $size: 0 } } }
                            ]
                        }
                    ]
                }
            ]
        };
        const homeworkV1 = await BookingActions.findOneByCheckHomeWorkV1(
            query,
            { create_time: -1 }
        );
        const resp = {
            data: homeworkV1
        };
        return new SuccessResponse('success', resp).send(res);
    }
}
