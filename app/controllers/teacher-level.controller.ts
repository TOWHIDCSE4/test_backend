import { ProtectedRequest } from 'app-request';
import { request, Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import CounterActions from '../actions/counter';
import LocationActions from '../actions/location';
import TeacherActions from '../actions/teacher';
import TeacherLevelActions from '../actions/teacher-level';
import TeacherLevel from '../models/teacher-level';
import { LocationRate } from '../models/teacher-level';
import { createAliasName } from './../utils/create-alias-name-utils';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'name',
    'alias',
    'is_active',
    'hourly_rates',
    'min_calendar_per_circle',
    'min_peak_time_per_circle',
    'max_missed_class_per_circle',
    'max_absent_request_per_circle',
    'class_accumulated_for_promotion'
];
export default class TeacherLevelController {
    /**
     * @description Admin or teacher send request to get the list of all
     *              teacher levels
     * @queryParam search <string> - a string in level name
     * @returns Success Response with the list of teacher levels
     */
    public static async getTeacherLevels(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search } = req.query;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string
        };
        const levels = await TeacherLevelActions.findAllAndPaginated(filter);
        const total = await TeacherLevelActions.count(filter);
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

    public static async createHourlyRateArray(
        req: ProtectedRequest,
        hourly_rates: Array<any>
    ): Promise<Array<LocationRate>> {
        if (hourly_rates.length <= 0) return [];

        const location_id_map = new Map<number, LocationRate>();
        for (const rate of hourly_rates) {
            if (location_id_map.has(rate.location_id)) {
                continue;
            }
            if (isNaN(rate.hourly_rate)) {
                throw new BadRequestError(
                    req.t('errors.teacher_level.nan_rate')
                );
            }
            const checked_location = await LocationActions.findOne({
                id: rate.location_id
            });
            if (!checked_location) {
                throw new BadRequestError(req.t('errors.location.not_found'));
            }
            const new_rate: LocationRate = {
                location_id: rate.location_id,
                hourly_rate: rate.hourly_rate,
                location: checked_location
            };
            location_id_map.set(rate.location_id, new_rate);
        }

        const rates = new Array<LocationRate>();
        location_id_map.forEach((value) => {
            rates.push(value);
        });
        rates.sort((a, b) => {
            return a.location_id - b.location_id;
        });
        return rates;
    }

    /**
     * @description Admin create a new teacher level
     * @bodyParam name <string> - Level name
     * @bodyParam php_rate <number> - Teacher salary rate, in PHP
     * @bodyParam min_calendar_per_circle <number> - minimum open slots of a
     *            teacher per teaching circle
     * @bodyParam min_peak_time_per_circle <number> - minimum open slots of a
     *            teacher at peak times per teaching circle
     * @bodyParam max_missed_class_per_circle <number> - maximum missed/cancel
     *            class of a teacher per teaching circle
     * @bodyParam max_absent_request_per_circle <number> - maximum absent
     *            request of a teacher per teaching circle
     * @bodyParam class_accumulated_for_promotion <number> - number of class
     *            a teacher needed to accumulate to promote to the next level
     * @returns Sucess response with ok message or BadRequestError
     */
    public static async createTeacherLevel(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            name,
            min_calendar_per_circle,
            min_peak_time_per_circle,
            max_missed_class_per_circle,
            max_absent_request_per_circle,
            class_accumulated_for_promotion,
            is_active
        } = req.body;

        const alias = createAliasName(name);
        const checked_level = await TeacherLevelActions.findOne({ alias });
        if (checked_level) {
            throw new BadRequestError(
                req.t('errors.teacher_level.alias_exists')
            );
        }
        const hourly_rates = await TeacherLevelController.createHourlyRateArray(
            req,
            req.body.hourly_rates
        );

        const counter = await CounterActions.findOne();
        const id = counter.teacher_level_id;
        const new_level = {
            id,
            name,
            alias,
            hourly_rates,
            min_calendar_per_circle,
            min_peak_time_per_circle,
            max_missed_class_per_circle,
            max_absent_request_per_circle,
            class_accumulated_for_promotion,
            is_active
        };
        await TeacherLevelActions.create({ ...new_level } as TeacherLevel);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description Admin edit a new teacher level
     * @urlParam teacher_level_id <number> - ID of the level
     * @bodyParam name <string> - Level name
     * @bodyParam php_rate <number> - Teacher salary rate, in PHP
     * @bodyParam min_calendar_per_circle <number> - minimum open slots of a
     *            teacher per teaching circle
     * @bodyParam min_peak_time_per_circle <number> - minimum open slots of a
     *            teacher at peak times per teaching circle
     * @bodyParam max_missed_class_per_circle <number> - maximum missed/cancel
     *            class of a teacher per teaching circle
     * @bodyParam max_absent_request_per_circle <number> - maximum absent
     *            request of a teacher per teaching circle
     * @bodyParam class_accumulated_for_promotion <number> - number of class
     *            a teacher needed to accumulate to promote to the next level
     * @returns Sucess response with ok message or BadRequestError
     */
    public static async editTeacherLevel(req: ProtectedRequest, res: Response) {
        const { teacher_level_id } = req.params;
        const teacher_level = await TeacherLevelActions.findOne({
            id: parseInt(teacher_level_id as string)
        });
        if (!teacher_level) {
            throw new BadRequestError(req.t('errors.teacher_level.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'TeacherLevelModel',
            teacher_level,
            pickUpData
        );
        const diff = { ...req.body };
        if (diff.hasOwnProperty('is_active') && !diff.is_active) {
            const checked_teacher = await TeacherActions.findOne({
                teacher_level_id: teacher_level.id
            });
            if (checked_teacher) {
                throw new BadRequestError(
                    req.t('errors.teacher_level.teacher_exists')
                );
            }
        }
        if (diff.hourly_rates) {
            diff.hourly_rates =
                await TeacherLevelController.createHourlyRateArray(
                    req,
                    diff.hourly_rates
                );
        }
        diff['alias'] = teacher_level.alias;
        if (diff.name && diff.name !== teacher_level.name) {
            const alias = createAliasName(diff.name);
            const checked_level = await TeacherLevelActions.findOne({ alias });
            if (checked_level) {
                throw new BadRequestError(
                    req.t('errors.teacher_level.alias_exists')
                );
            }
            diff['alias'] = alias;
        }
        const new_data = await TeacherLevelActions.update(teacher_level._id, {
            ...diff
        } as TeacherLevel);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'TeacherLevelModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description Admin remove a teacher level
     * @urlParam teacher_level_id <number> - ID of the level
     * @returns Success response with ok message or BadRequestError
     */
    public static async deleteTeacherLevel(
        req: ProtectedRequest,
        res: Response
    ) {
        const { teacher_level_id } = req.params;
        const checked_teacher = await TeacherActions.findOne({
            teacher_level_id: parseInt(teacher_level_id as string)
        });
        if (checked_teacher) {
            throw new BadRequestError(
                req.t('errors.teacher_level.teacher_exists')
            );
        }
        const teacher_level = await TeacherLevelActions.findOne({
            id: parseInt(teacher_level_id as string)
        });
        if (teacher_level) {
            await TeacherLevelActions.remove(teacher_level._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static getTeacherRateFromLevelAndLocation(
        level: TeacherLevel,
        location_id: number
    ): number {
        let teacher_rate = 0;
        for (const hourly_rate of level.hourly_rates) {
            if (hourly_rate.location_id == location_id) {
                teacher_rate = hourly_rate.hourly_rate;
                break;
            }
        }
        return teacher_rate;
    }
}
