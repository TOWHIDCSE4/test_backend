import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import SubjectActions from '../actions/subject';
import Subject from '../models/subject';
import CounterActions from '../actions/counter';

import {
    createAliasName,
    createSlugsName
} from './../utils/create-alias-name-utils';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = ['_id', 'id', 'name', 'alias', 'slug', 'is_active'];
export default class SubjectController {
    private static async getSubjects(req: ProtectedRequest) {
        const { page_size, page_number } = req.query;
        let is_active;
        if (req.query.hasOwnProperty('is_active')) {
            is_active = req.query.is_active == 'true';
        }
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            is_active
        };
        const subjects = await SubjectActions.findAllAndPaginated(filter);
        const count = await SubjectActions.count(filter);
        const res_payload = {
            data: subjects,
            pagination: {
                total: count
            }
        };
        return res_payload;
    }

    public static async getSubjectsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const res_payload = await SubjectController.getSubjects(req);
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getSubjectsByClient(
        req: ProtectedRequest,
        res: Response
    ) {
        req.query['is_active'] = 'true';
        const res_payload = await SubjectController.getSubjects(req);
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Admin tao mot môn học moi
     * Request type: POST
     * Body:       - name: Tên môn học
     * Response:   - 200: success: Tao thanh cong
     *             - 400: bad request: Trung ten môn học
     */
    public static async createSubject(req: ProtectedRequest, res: Response) {
        const { name } = req.body;
        const alias = createAliasName(name);
        const slug = createSlugsName(name);
        const subject = await SubjectActions.findOne({ alias });
        if (subject)
            throw new BadRequestError(req.t('errors.subject.name_exist'));
        const counter = await CounterActions.findOne();
        const id = counter.subject_id;
        await SubjectActions.create({
            name,
            alias,
            slug,
            id,
            is_active: true
        } as Subject);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    public static async editSubject(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const { name, is_active } = req.body;
        const subject = await SubjectActions.findOne({
            id: parseInt(id as string)
        });
        if (!subject)
            throw new BadRequestError(req.t('errors.subject.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'SubjectModel',
            subject,
            pickUpData
        );
        const alias = createAliasName(name);
        const slug = createSlugsName(name);
        if (alias !== subject.alias) {
            const check_name = await SubjectActions.findOne({ alias });
            if (check_name)
                throw new BadRequestError(req.t('errors.subject.name_exist'));
        }
        const new_data = await SubjectActions.update(subject._id, {
            name,
            alias,
            slug,
            is_active: Boolean(is_active as string)
        } as Subject);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'SubjectModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    public static async removeSubject(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const subject = await SubjectActions.findOne({
            id: parseInt(id as string)
        });
        if (!subject)
            throw new BadRequestError(req.t('errors.subject.not_found'));
        await SubjectActions.remove(subject._id);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }
}
