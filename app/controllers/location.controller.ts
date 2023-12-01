import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import LocationActions from '../actions/location';
import CounterActions from '../actions/counter';
import Location from '../models/location';
import TeacherActions from '../actions/teacher';
import _ from 'lodash';
import LogServices from '../services/logger';
import { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'type',
    'target',
    'title',
    'content',
    'start_time_shown',
    'end_time_shown',
    'is_active',
    'image'
];

export default class LocationController {
    /*
     * Summary: Admin lay toan bo danh sach toan bo cac location
     * Role: Admin
     * Request type: GET
     * Parameters: - page_size: So entry hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     * Response:   - 200: success: Lay duoc danh sach
     */
    public static async getLocations(req: ProtectedRequest, res: Response) {
        const { page_size, page_number } = req.query;
        const filter = {
            page_size: Number(page_size),
            page_number: Number(page_number)
        };
        const locations = await LocationActions.findAllAndPaginated(filter);
        const count = await LocationActions.count(filter);
        const res_payload = {
            data: locations,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createLocation(req: ProtectedRequest, res: Response) {
        const {
            name,
            currency,
            percent_salary_student_absent,
            weekend_bonus,
            conversion_bonus,
            attendance_bonus,
            referral_bonus,
            percent_substitute_bonus,
            percent_absent_punish,
            percent_absent_punish_trial,
            percent_absent_punish_first_3_slot,
            percent_absent_punish_1h,
            percent_absent_punish_2h,
            percent_absent_punish_3h,
            absent_punish_greater_3h,
            late_memo_punish,
            over_limit_punish,
            accept_time,
            cancel_time
        } = req.body;

        const location = await LocationActions.findOne({ name });
        if (location) {
            throw new BadRequestError(
                req.t('errors.location.name_exists', name)
            );
        }
        const counter = await CounterActions.findOne();
        const id = counter.location_id;
        const locationInfo: any = {
            id: id,
            name: name,
            currency: currency,
            percent_salary_student_absent: Number(
                percent_salary_student_absent
            ),
            weekend_bonus: Number(weekend_bonus),
            conversion_bonus: Number(conversion_bonus),
            attendance_bonus: Number(attendance_bonus),
            referral_bonus: Number(referral_bonus),
            percent_substitute_bonus: Number(percent_substitute_bonus),
            percent_absent_punish: Number(percent_absent_punish),
            percent_absent_punish_trial: Number(percent_absent_punish_trial),
            percent_absent_punish_first_3_slot: Number(
                percent_absent_punish_first_3_slot
            ),
            percent_absent_punish_1h: Number(percent_absent_punish_1h),
            percent_absent_punish_2h: Number(percent_absent_punish_2h),
            percent_absent_punish_3h: Number(percent_absent_punish_3h),
            absent_punish_greater_3h: Number(absent_punish_greater_3h),
            late_memo_punish: Number(late_memo_punish),
            over_limit_punish: Number(over_limit_punish),
            accept_time: Number(accept_time),
            cancel_time: Number(cancel_time)
        };
        await LocationActions.create(locationInfo);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async editLocation(req: ProtectedRequest, res: Response) {
        const { location_id } = req.params;
        const diff = { ...req.body };

        const location = await LocationActions.findOne({
            id: parseInt(location_id)
        });
        if (!location)
            throw new BadRequestError(req.t('errors.location.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'LocationModel',
            location,
            pickUpData
        );

        if (diff.name && diff.name != location.name) {
            const check_name = await LocationActions.findOne({
                name: diff.name
            });
            if (check_name) {
                throw new BadRequestError(
                    req.t('errors.location.name_exists', diff.name)
                );
            }
        }

        const new_data = await LocationActions.update(location._id, {
            ...diff
        } as Location);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'LocationModel',
            new_data,
            pickUpData
        );

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /*
     * Summary: Admin xoa mot dia diem
     * Role: Admin
     * Request type: DELETE
     * Parameters: - location_id: ID cua dia diem
     * Reponse:    - 200: success: Xoa thanh cong
     *             - 400: bad request: Dia diem khong ton tai
     */
    public static async removeLocation(req: ProtectedRequest, res: Response) {
        const { location_id } = req.params;
        const location = await LocationActions.findOne({
            id: parseInt(location_id)
        });
        if (!location) {
            throw new BadRequestError(req.t('errors.location.not_found'));
        }
        const check_teacher = await TeacherActions.findOne({
            location_id: parseInt(location_id)
        });
        if (check_teacher) {
            throw new BadRequestError(req.t('errors.location.teachers_exists'));
        }
        await LocationActions.remove(location._id);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}
