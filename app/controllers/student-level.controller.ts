import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import StudentLevelActions from '../actions/student-level';
import StudentLevel from '../models/student-level';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'name',
    'vocabulary_description',
    'skill_description',
    'grammar_description',
    'speaking_description'
];

export default class StudentLevelController {
    /**
     * @description Admin or student send request to get the list of all
     *              student levels
     * @queryParam search <string> - a string in level name
     * @returns Success Response with the list of student levels
     */
    public static async getStudentLevels(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search } = req.query;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string
        };
        const levels = await StudentLevelActions.findAllAndPaginated(filter);
        const total = await StudentLevelActions.count(filter);
        const res_payload = {
            data: levels,
            pagination: {
                total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description Admin create a new student level
     * @bodyParam id <number> - Level number
     * @bodyParam name <string> - Level name
     * @returns Sucess response with ok message or BadRequestError
     */
    public static async createStudentLevel(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            id,
            name,
            vocabulary_description,
            skill_description,
            grammar_description,
            speaking_description
        } = req.body;

        const checked_level = await StudentLevelActions.findOne({ id });
        if (checked_level) {
            throw new BadRequestError(
                req.t('errors.student_level.level_exists')
            );
        }

        const new_level = {
            id,
            name,
            vocabulary_description,
            skill_description,
            grammar_description,
            speaking_description
        };
        await StudentLevelActions.create({ ...new_level } as StudentLevel);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description Admin edit a new student level
     * @urlParam student_level_id <number> - ID of the level
     * @bodyParam name <string> - Level name
     * @returns Sucess response with ok message or BadRequestError
     */
    public static async editStudentLevel(req: ProtectedRequest, res: Response) {
        const { student_level_id } = req.params;
        const student_level = await StudentLevelActions.findOne({
            id: parseInt(student_level_id as string)
        });
        if (!student_level) {
            throw new BadRequestError(req.t('errors.student_level.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'StudentLevelModel',
            student_level,
            pickUpData
        );
        const diff = { ...req.body };
        if (diff.hasOwnProperty('id')) {
            diff.id = student_level.id;
        }
        const new_data = await StudentLevelActions.update(student_level._id, {
            ...diff
        } as StudentLevel);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'StudentLevelModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description Admin remove a student level
     * @urlParam student_level_id <number> - ID of the level
     * @returns Success response with ok message or BadRequestError
     */
    public static async deleteStudentLevel(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_level_id } = req.params;
        const student_level = await StudentLevelActions.findOne({
            id: parseInt(student_level_id as string)
        });
        if (student_level) {
            await StudentLevelActions.remove(student_level._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description Check if a student level already exists
     * @queryParam student_level_id <number> - ID of the level
     * @returns Success response
     */
    public static async checkStudentLevelId(
        req: ProtectedRequest,
        res: Response
    ) {
        const level_id = parseInt(req.query.level_id as string);
        const student_level = await StudentLevelActions.findOne({
            id: level_id
        });
        const res_payload = {
            exists: false
        };
        if (student_level) {
            res_payload.exists = true;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
