import mongoose from 'mongoose';

import Coupon, { CouponModel, EnumPackageTypeOnCoupon } from '../models/coupon';
import { EnumStudentType } from '../models/student';

import { DAY_TO_MS } from '../const/date-time';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    id?: number;
    code?: string;
    start_time_applied?: number | any;
    end_time_applied?: number | any;
    start_time_shown?: number | any;
    start_date_shown?: number;
    end_time_shown?: number | any;
    type?: number[] | any;
    package_type?: number[] | any;
    student_type?: number[] | any;
    search?: string;
    $and?: Array<any>;
};

export default class CouponActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.code) {
            conditions.code = filter.code;
        }
        if (filter.type) {
            if (Array.isArray(filter.type)) {
                conditions.type = { $in: filter.type };
            } else {
                conditions.type = filter.type;
            }
        }
        if (filter.start_time_applied) {
            conditions.start_time_applied = filter.start_time_applied;
        }
        if (filter.end_time_applied) {
            conditions.end_time_applied = filter.end_time_applied;
        }
        if (filter.start_time_shown) {
            conditions.start_time_shown = filter.start_time_shown;
        }
        if (filter.start_date_shown) {
            if (!conditions.$and) {
                conditions.$and = new Array<any>();
            }
            conditions.$and.push({
                start_time_shown: { $gte: filter.start_date_shown }
            });
            conditions.$and.push({
                start_time_shown: { $lte: filter.start_date_shown + DAY_TO_MS }
            });
        }
        if (filter.end_time_shown) {
            conditions.end_time_shown = filter.end_time_shown;
        }
        if (filter.package_type) {
            if (Array.isArray(filter.package_type)) {
                if (filter.package_type.length > 0) {
                    filter.package_type.push(EnumPackageTypeOnCoupon.ALL_TYPE);
                    conditions.package_type = { $in: filter.package_type };
                }
            } else {
                conditions.package_type = filter.package_type;
            }
        }
        if (filter.student_type) {
            if (Array.isArray(filter.student_type)) {
                if (filter.student_type.length > 0) {
                    filter.student_type.push(EnumStudentType.ALL_TYPE);
                    conditions.student_type = { $in: filter.student_type };
                }
            } else {
                conditions.student_type = filter.student_type;
            }
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<Coupon[]> {
        const conditions = CouponActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return CouponModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<Coupon[]> {
        const conditions = CouponActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return CouponModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Coupon | null> {
        const conditions = CouponActions.buildFilterQuery(filter);
        return CouponModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = CouponActions.buildFilterQuery(filter);
        return CouponModel.countDocuments(conditions).exec();
    }

    public static create(subject: Coupon): Promise<Coupon> {
        const newModel = new CouponModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('coupon_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Coupon
    ): Promise<any> {
        return CouponModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff,
                    updated_time: new Date()
                }
            },
            {
                upsert: false,
                new: true,
                returnOriginal: false
            }
        ).exec();
    }

    public static remove(_id: mongoose.Types.ObjectId): any {
        return CouponModel.deleteOne({ _id });
    }
}
