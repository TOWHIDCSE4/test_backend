import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import CounterActions from '../actions/counter';
import CurriculumActions from '../actions/curriculum';
import Curriculum, { EnumCurriculumAgeList } from '../models/curriculum';
import { createAliasName } from './../utils/create-alias-name-utils';
import CourseActions from '../actions/course';
import { ObjectId } from 'mongodb';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'name',
    'alias',
    'description',
    'image',
    'age_list'
];
export default class CurriculumController {
    /**
     * @description Get list of curriculums with filter. For now, both admins
     *              and users can use this
     */
    public static async getCurriculums(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search, age_list } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string,
            age_list:
                age_list && _.isArray(age_list)
                    ? age_list.map((id) => parseInt(id as string))
                    : age_list
                    ? [parseInt(age_list as string)]
                    : []
        };
        const curriculums = await CurriculumActions.findAllAndPaginated(filter);
        const count = await CurriculumActions.count(filter);
        const res_payload = {
            data: curriculums,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getCoursesByCurriculumId(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _id } = req.query;
        if (!_id) {
            throw new BadRequestError();
        }
        const filter: any = {
            curriculum: _id
        };
        const courses = await CourseActions.findAll(filter, {
            display_order: 1,
            id: 1
        });

        return new SuccessResponse(req.t('common.success'), courses).send(
            res,
            req
        );
    }

    public static async getCoursesDontMatchCurriculum(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string,
            curriculum: { $exists: false }
        };
        const courses = await CourseActions.findAllAndPaginated(filter, {
            display_order: 1,
            id: 1
        });
        return new SuccessResponse(req.t('common.success'), courses).send(
            res,
            req
        );
    }

    public static async updateCurriculumCouse(
        req: ProtectedRequest,
        res: Response
    ) {
        const { data, _id } = req.body;
        if (!data || !_id) {
            throw new BadRequestError();
        }
        const filter: any = {
            curriculum: _id
        };
        const courses = await CourseActions.findAll(filter, {
            display_order: 1,
            id: 1
        });
        for (const iterator of courses) {
            iterator.curriculum = undefined;
            iterator.curriculum_id = undefined;
            iterator.display_order = 0;
            await iterator.save();
        }
        for (const iterator of data) {
            const course = await CourseActions.findOne({
                _id: new ObjectId(iterator._id)
            });
            if (course) {
                course.curriculum = iterator.curriculum;
                course.curriculum_id = iterator.curriculum_id;
                course.display_order = iterator.display_order;
                course.save();
            }
        }
        return new SuccessResponse(req.t('common.success'), courses).send(
            res,
            req
        );
    }

    public static async createCurriculum(req: ProtectedRequest, res: Response) {
        const { name, description, image } = req.body;

        const age_list = _.intersection(
            Object.values(EnumCurriculumAgeList),
            _.uniq(req.body.age_list)
        );
        if (age_list.length <= 0) {
            throw new BadRequestError(
                req.t('errors.curriculum.age_list_required')
            );
        }

        const alias = createAliasName(name);
        const check_name = await CurriculumActions.findOne({ alias });
        if (check_name) {
            throw new BadRequestError(req.t('errors.curriculum.name_exist'));
        }
        const counter = await CounterActions.findOne();
        const id = counter.curriculum_id;
        const curriculum = {
            id,
            name,
            alias,
            description,
            image,
            age_list
        };
        await CurriculumActions.create({ ...curriculum } as Curriculum);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async editCurriculum(req: ProtectedRequest, res: Response) {
        const { curriculum_id } = req.params;
        const curriculum = await CurriculumActions.findOne({
            id: parseInt(curriculum_id as string)
        });
        if (!curriculum) {
            throw new BadRequestError(req.t('errors.curriculum.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'CurriculumModel',
            curriculum,
            pickUpData
        );
        if (Object.keys(req.body).length > 0) {
            const { name, description, image, age_list } = req.body;

            const diff: any = {
                name: name ? name : curriculum.name,
                description: description ? description : curriculum.description,
                image: image ? image : curriculum.image
            };
            if (diff.name != curriculum.name) {
                diff.alias = createAliasName(diff.name);
                const check_name = await CurriculumActions.findOne({
                    alias: diff.alias
                });
                if (check_name) {
                    throw new BadRequestError(
                        req.t('errors.curriculum.name_exist')
                    );
                }
            }
            if (age_list && Array.isArray(age_list)) {
                diff.age_list = _.intersection(
                    Object.values(EnumCurriculumAgeList),
                    _.uniq(age_list)
                );
                if (diff.age_list.length <= 0) {
                    throw new BadRequestError(
                        req.t('errors.curriculum.age_list_required')
                    );
                }
            }
            const new_data = await CurriculumActions.update(curriculum._id, {
                ...diff
            } as Curriculum);
            LogServices.setChangeData(
                req,
                EnumTypeChangeData.new,
                'CurriculumModel',
                new_data,
                pickUpData
            );
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async removeCurriculum(req: ProtectedRequest, res: Response) {
        const { curriculum_id } = req.params;
        const curriculum = await CurriculumActions.findOne({
            id: parseInt(curriculum_id as string)
        });
        if (curriculum) {
            const course_count = await CourseActions.count({
                curriculum_id: curriculum.id
            });
            if (course_count > 0) {
                throw new BadRequestError(
                    req.t('errors.curriculum.course_exist')
                );
            }
            await CurriculumActions.remove(curriculum._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}
