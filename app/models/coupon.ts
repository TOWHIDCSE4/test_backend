import { Schema, Document, model } from 'mongoose';

import { EnumStudentType } from './student';

import { EnumPackageOrderType } from '../const/package';

export const DOCUMENT_NAME = 'Coupon';
export const COLLECTION_NAME = 'coupons';

/**
 * A work-around solution here since TS doesn't allow us to create a superset
 * for enum. Now whenever we add a new value to package type enum, we need to
 * add it here
 */
export enum EnumPackageTypeOnCoupon {
    STANDARD = EnumPackageOrderType.STANDARD,
    PREMIUM = EnumPackageOrderType.PREMIUM,
    TRIAL = EnumPackageOrderType.TRIAL,
    ALL_TYPE
}

export enum EnumCouponType {
    DISCOUNT = 1 /** Chiet khau */,
    SALE_OFF = 2 /** Giam gia */
}

export default interface Coupon extends Document {
    id: number;
    title: string;
    code: string;
    start_time_applied: number;
    end_time_applied: number;
    start_time_shown: number;
    end_time_shown: number;
    type: EnumCouponType;
    percentage_off: number;
    package_type: EnumPackageTypeOnCoupon;
    min_age?: number;
    max_age?: number;
    student_type?: EnumStudentType;
    content?: string;
    image?: string;
    created_time?: Date;
    updated_time?: Date;
}

const CouponSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    title: {
        type: String,
        required: true
    },
    code: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    start_time_applied: {
        type: Number,
        index: true,
        required: true
    },
    end_time_applied: {
        type: Number,
        index: true,
        required: true
    },
    start_time_shown: {
        type: Number,
        index: true,
        required: true
    },
    end_time_shown: {
        type: Number,
        index: true,
        required: true
    },
    type: {
        type: Number,
        enum: EnumCouponType,
        index: true,
        required: true
    },
    percentage_off: {
        type: Number,
        min: 1,
        max: 100,
        index: true,
        required: true
    },
    package_type: {
        type: Number,
        enum: EnumPackageTypeOnCoupon,
        index: true,
        required: true
    },
    min_age: {
        type: Number,
        min: 1
    },
    max_age: {
        type: Number,
        min: 1
    },
    student_type: {
        type: Number,
        Enum: EnumStudentType,
        index: true
    },
    content: {
        type: String
    },
    image: {
        type: String
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const CouponModel = model<Coupon>(
    DOCUMENT_NAME,
    CouponSchema,
    COLLECTION_NAME
);
