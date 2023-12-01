import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import TeacherActions from '../actions/teacher';
import TrialTeacherActions from '../actions/trial-teacher';
import CalendarController from './calendar.controller';
import TrialTeacher, { EnumAgeGroup } from '../models/trial-teacher';
import { LOCATION_ID_ASIAN, LOCATION_ID_VIETNAM } from '../const';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = ['_id', 'teacher_id', 'age_groups'];

const logger = require('dy-logger');
export default class TrialTeacherController {
    public static async getTrialTeacherProfiles(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            start_time,
            age_groups,
            page_size,
            page_number,
            location_id,
            search,
            status
        } = req.query;

        const filter: any = {};
        filter.page_size = parseInt(page_size as string);
        filter.page_number = parseInt(page_number as string);
        filter.status = status;
        filter.search = search;

        if (start_time && !Number.isNaN(start_time)) {
            const teacher_set =
                await CalendarController.getAvailableTeacherListFromStartTime(
                    req,
                    parseInt(start_time as string)
                );
            filter.teacher_id = { $in: Array.from(teacher_set) };
        }

        const teacher_filter: any = {
            is_active: true
        };
        if (!location_id) {
            teacher_filter.location_ids = [
                LOCATION_ID_VIETNAM,
                LOCATION_ID_ASIAN
            ];
        } else {
            teacher_filter.location_id = location_id;
        }

        if (filter.teacher_id) {
            teacher_filter.user_id = filter.teacher_id;
        }

        const teacher = await TeacherActions.findAll(teacher_filter, {
            user_id: 1
        });
        const teacher_ids = teacher.map((x) => x.user_id);
        filter.teacher_id = { $in: teacher_ids };

        if (age_groups) {
            if (Array.isArray(age_groups)) {
                filter.age_groups = { $in: age_groups };
            } else if (!Number.isNaN(age_groups)) {
                filter.age_groups = parseInt(age_groups as string);
            }
        }

        const temp: any = await TrialTeacherActions.findEachPage(filter);

        let data = temp.length > 0 ? temp[0]?.data || [] : [];
        const arrayTeacherId: any = [];
        data = data.map((item: any) => {
            item.teacher.location = item.location;
            delete item.location;

            item.teacher.user_info = item.user_info;
            delete item.user_info;

            arrayTeacherId.push(item.teacher_id);

            return item;
        });
        const total = temp.length > 0 ? temp[0]?.total[0]?.count || 0 : 0;
        logger.info(
            'list teacher trial pool: ' + JSON.stringify(arrayTeacherId)
        );
        const res_payload = {
            data,
            pagination: {
                total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createTrialTeacherProfile(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id, degree, age_groups } = req.body;

        const teacher = await TeacherActions.findOne({
            user_id: teacher_id
        });

        if (!teacher) {
            throw new BadRequestError(req.t('errors.teacher.not_found'));
        }

        if (
            ![LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN].includes(
                teacher.location_id
            )
        ) {
            throw new BadRequestError(
                req.t('errors.teacher.not_trial_teacher')
            );
        }

        const check = await TrialTeacherActions.findOne({
            teacher_id
        });
        if (check) {
            throw new BadRequestError(req.t('errors.trial_teacher.exists'));
        }

        const age_group_set = new Set<EnumAgeGroup>();
        if (Array.isArray(age_groups)) {
            age_groups.sort((a, b) => {
                return a - b;
            });
            for (const group of age_groups) {
                if (group in EnumAgeGroup) {
                    age_group_set.add(group);
                }
            }
        }

        const trial_profile = {
            teacher_id,
            degree,
            age_groups: Array.from(age_group_set),
            teacher
        };
        await TrialTeacherActions.create({
            ...trial_profile
        } as unknown as TrialTeacher);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async editTrialTeacherProfile(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;

        const trial_profile = await TrialTeacherActions.findOne({
            teacher_id: parseInt(teacher_id as string)
        });
        if (!trial_profile) {
            throw new BadRequestError(req.t('errors.trial_teacher.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TrialTeacherModel',
            trial_profile,
            pickUpData
        );
        const { degree, age_groups } = req.body;

        const diff: any = {};
        if (degree || degree === '') {
            diff.degree = degree;
        }
        if (age_groups) {
            const age_group_set = new Set<EnumAgeGroup>();
            if (Array.isArray(age_groups)) {
                age_groups.sort((a, b) => {
                    return a - b;
                });
                for (const group of age_groups) {
                    if (group in EnumAgeGroup) {
                        age_group_set.add(group);
                    }
                }
            }
            diff.age_groups = Array.from(age_group_set);
        }
        if (Object.keys(diff).length > 0) {
            const new_data = await TrialTeacherActions.update(
                trial_profile._id,
                {
                    ...diff
                } as TrialTeacher
            );
            LogServices.setChangeData(
                req,
                EnumTypeChangeData.new,
                'TrialTeacherModel',
                new_data,
                pickUpData
            );
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async removeTrialTeacherProfile(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_id } = req.params;
        const trial_profile = await TrialTeacherActions.findOne({
            teacher_id: parseInt(teacher_id as string)
        });
        if (trial_profile) {
            await TrialTeacherActions.remove(trial_profile._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getAllTeacherNotInTrialAndPaginated(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search, teacher_id } = req.query;
        const filter = {
            page_size: +(page_size as string),
            page_number: +(page_number as string),
            search: search as string,
            user_id: +(teacher_id as string),
            location_ids: [LOCATION_ID_VIETNAM, LOCATION_ID_ASIAN]
        };

        const teachers = await TeacherActions.findAllAndPaginatedNotInTrial(
            filter,
            { created_time: 1 }
        );
        const count = await TeacherActions.countNotInTrial(filter);
        const res_payload = {
            data: teachers,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}
