import { Schema, Document, model } from 'mongoose';

import Coupon from './coupon';
import Location from './location';
import Subject from './subject';

import { DEFAULT_SUBJECT_ID } from '../const/default-id';
import { EnumPackageOrderType } from '../const/package';

export const DOCUMENT_NAME = 'Package';
export const COLLECTION_NAME = 'packages';

export enum EnumFrequencyType {
    NORMAL = 1,
    DAILY = 2
}
export default interface Package extends Document {
    id: number;
    location_id: number;
    type: EnumPackageOrderType;
    subject_id: number;
    name: string;
    alias: string;
    slug: string;
    description?: string;
    price: number;
    number_class: number;
    day_of_use: number;
    is_active: boolean;
    is_support: boolean;
    image: string;
    expired_time: Date;
    location: Location;
    subject: Subject;
    new_student_coupon?: Coupon;
    renew_student_coupon?: Coupon;
    created_time?: Date;
    updated_time?: Date;
    learning_frequency_type?: number;
    is_show_on_student_page?: boolean;
}

const PackageSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
    location_id: {
        type: Number,
        required: true
    },
    type: {
        type: Number,
        Enum: EnumPackageOrderType,
        default: EnumPackageOrderType.STANDARD,
        required: true
    },
    subject_id: {
        type: Number,
        required: true,
        default: DEFAULT_SUBJECT_ID
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 255
    },
    alias: {
        type: String,
        required: true,
        trim: true,
        maxLength: 255
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: 255
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 255
    },
    price: {
        type: Number,
        required: true
    },
    new_student_coupon: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    renew_student_coupon: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    is_active: {
        type: Boolean,
        required: true,
        index: true,
        default: true
    },
    is_support: {
        // hỗ trợ đặt lịch
        type: Boolean,
        required: true,
        default: false
    },
    expired_time: {
        type: Date,
        required: true,
        default: 0
    },
    day_of_use: {
        type: Number,
        required: true,
        default: 0
    },
    number_class: {
        // Số buổi học
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    location: {
        type: Schema.Types.ObjectId,
        ref: 'Location'
    },
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject'
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: {
        type: Date
    },
    learning_frequency_type: {
        type: Number,
        default: EnumFrequencyType.NORMAL
    },
    is_show_on_student_page: {
        type: Boolean,
        required: true,
        index: true,
        default: true
    }
});

export const PackageModel = model<Package>(
    DOCUMENT_NAME,
    PackageSchema,
    COLLECTION_NAME
);
