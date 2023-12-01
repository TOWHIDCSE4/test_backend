import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import CouponActions from '../actions/coupon';
import CounterActions from '../actions/counter';
import TemplateActions from '../actions/template';
import Coupon, { EnumCouponType } from '../models/coupon';
import * as natsClient from '../services/nats/nats-client';
import { BackEndNotification } from '../const/notification';

export default class CouponController {
    public static async getCouponsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            type,
            package_type,
            student_type,
            start_time_applied,
            end_time_applied,
            start_time_shown,
            end_time_shown
        } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            start_time_applied: start_time_applied
                ? { $gte: parseInt(start_time_applied as string) }
                : null,
            end_time_applied: end_time_applied
                ? { $gte: parseInt(end_time_applied as string) }
                : null,
            start_time_shown: start_time_shown
                ? { $gte: parseInt(start_time_shown as string) }
                : null,
            end_time_shown: end_time_shown
                ? { $lte: parseInt(end_time_shown as string) }
                : null
        };
        if (type) {
            if (Array.isArray(type)) {
                filter.type = type;
            } else {
                filter.type = [parseInt(type as string)];
            }
        }
        if (package_type) {
            if (Array.isArray(package_type)) {
                filter.package_type = package_type;
            } else {
                filter.package_type = [parseInt(package_type as string)];
            }
        }
        if (student_type) {
            if (Array.isArray(student_type)) {
                filter.student_type = student_type;
            } else {
                filter.student_type = [parseInt(student_type as string)];
            }
        }
        const coupons = await CouponActions.findAllAndPaginated(filter);
        const count = await CouponActions.count(filter);
        const res_payload = {
            data: coupons,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async sendCouponsNotificationDailyByCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter = {
            type: [EnumCouponType.SALE_OFF],
            start_date_shown: new Date().getTime()
        };
        const res_payload = {
            total: 0
        };
        const notification_template = await TemplateActions.findOne({
            code: BackEndNotification.NEW_SALE_OFF
        });
        if (notification_template) {
            const coupons = await CouponActions.findAll(filter);
            for (const coupon of coupons) {
                const payload = {
                    percentage_off: coupon.percentage_off
                };
                await natsClient.broadcastEventWithTemplate({
                    template: notification_template.content,
                    data: payload
                });
            }
            res_payload.total = coupons.length;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getCouponsByUsers(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            package_type,
            student_type,
            start_time_applied,
            end_time_applied
        } = req.query;
        const current_moment = new Date().getTime();
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            type: [EnumCouponType.SALE_OFF],
            package_type: new Array<any>(),
            student_type: new Array<any>(),
            start_time_applied: start_time_applied
                ? { $gte: parseInt(start_time_applied as string) }
                : null,
            end_time_applied: end_time_applied
                ? { $lte: parseInt(end_time_applied as string) }
                : null,
            start_time_shown: { $lte: current_moment },
            end_time_shown: { $gte: current_moment }
        };
        if (package_type) {
            if (Array.isArray(package_type)) {
                filter.package_type = package_type;
            } else {
                filter.package_type = [parseInt(package_type as string)];
            }
        }
        if (student_type) {
            if (Array.isArray(student_type)) {
                filter.student_type = student_type;
            } else {
                filter.student_type = [parseInt(student_type as string)];
            }
        }
        const sort = {
            start_time_applied: 1
        };
        const excluded_fields = {
            start_time_shown: 0,
            end_time_shown: 0,
            type: 0,
            _id: 0,
            created_time: 0,
            updated_time: 0
        };
        const coupons = await CouponActions.findAllAndPaginated(
            filter,
            sort,
            excluded_fields
        );
        const count = await CouponActions.count(filter);
        const res_payload = {
            data: coupons,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async checkCouponByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { code } = req.params;
        const filter = {
            code
        };
        const coupon = await CouponActions.findOne(filter);
        if (!coupon) {
            throw new BadRequestError(req.t('errors.coupon.not_found'));
        }
        return new SuccessResponse(req.t('common.success'), coupon).send(
            res,
            req
        );
    }

    public static async checkCouponByUsers(
        req: ProtectedRequest,
        res: Response
    ) {
        const { code } = req.params;
        const current_moment = new Date().getTime();
        const filter = {
            code,
            start_time_shown: { $lte: current_moment },
            end_time_shown: { $gte: current_moment }
        };
        const excluded_fields = {
            start_time_shown: 0,
            end_time_shown: 0,
            type: 0,
            _id: 0,
            created_time: 0,
            updated_time: 0
        };
        const coupon = await CouponActions.findOne(filter, excluded_fields);
        if (!coupon) throw new BadRequestError(req.t('Coupon is not valid'));
        const res_payload = coupon.toJSON();
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createCoupon(req: ProtectedRequest, res: Response) {
        const {
            title,
            code,
            start_time_applied,
            end_time_applied,
            start_time_shown,
            end_time_shown,
            type,
            percentage_off,
            package_type,
            min_age,
            max_age,
            student_type,
            content,
            image
        } = req.body;

        const coupon = await CouponActions.findOne({ code });
        if (coupon) {
            throw new BadRequestError(req.t('errors.coupon.code_exists', code));
        }

        const current_moment = new Date().getTime();
        if (start_time_applied >= end_time_applied) {
            throw new BadRequestError(
                req.t('errors.coupon.invalid_applied_time')
            );
        }
        if (end_time_applied <= current_moment) {
            throw new BadRequestError(
                req.t('errors.coupon.invalid_applied_time')
            );
        }
        if (start_time_shown >= end_time_shown) {
            throw new BadRequestError(
                req.t('errors.coupon.invalid_shown_time')
            );
        }
        if (end_time_shown <= current_moment) {
            throw new BadRequestError(
                req.t('errors.coupon.invalid_shown_time')
            );
        }

        const counter = await CounterActions.findOne();
        const id = counter.coupon_id;
        const coupon_info = {
            id,
            title,
            code,
            start_time_applied,
            end_time_applied,
            start_time_shown,
            end_time_shown,
            type,
            percentage_off,
            package_type,
            min_age,
            max_age,
            student_type,
            content,
            image
        };
        await CouponActions.create({ ...coupon_info } as Coupon);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async editCoupon(req: ProtectedRequest, res: Response) {
        const { coupon_id } = req.params;
        const diff = { ...req.body };

        const coupon = await CouponActions.findOne({
            id: parseInt(coupon_id as string)
        });
        if (!coupon)
            throw new BadRequestError(req.t('errors.coupon.not_found'));

        if (diff.code && diff.code != coupon.code) {
            const check_code = await CouponActions.findOne({
                code: diff.code
            });
            if (check_code) {
                throw new BadRequestError(
                    req.t('errors.coupon.code_exists', diff.code)
                );
            }
        }

        if (diff.start_time_applied || diff.end_time_applied) {
            if (!diff.start_time_applied) {
                diff.start_time_applied = coupon.start_time_applied;
            } else if (!diff.end_time_applied) {
                diff.end_time_applied = coupon.end_time_applied;
            }
            if (diff.start_time_applied >= diff.end_time_applied) {
                throw new BadRequestError(
                    req.t('errors.coupon.invalid_applied_time')
                );
            }
        }

        if (diff.start_time_shown || diff.end_time_shown) {
            if (!diff.start_time_shown) {
                diff.start_time_shown = coupon.start_time_shown;
            } else if (!diff.end_time_shown) {
                diff.end_time_shown = coupon.end_time_shown;
            }
            if (diff.start_time_shown >= diff.end_time_shown) {
                throw new BadRequestError(
                    req.t('errors.coupon.invalid_shown_time')
                );
            }
        }

        await CouponActions.update(coupon._id, { ...diff } as Coupon);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async removeCoupon(req: ProtectedRequest, res: Response) {
        const { coupon_id } = req.params;
        const coupon = await CouponActions.findOne({
            id: parseInt(coupon_id as string)
        });
        if (coupon) {
            await CouponActions.remove(coupon._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}
