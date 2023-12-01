import { Schema, Document, model } from 'mongoose';
import OrderedPackage from './ordered-package';
export const DOCUMENT_NAME = 'PreOrder';
export const COLLECTION_NAME = 'pre-orders';

export enum EnumPreOrderStatus {
    PENDING = 1,
    ACCEPTED = 2,
    REJECTED = 3
}

export default interface PreOrder extends Document {
    code?: string;
    price: number;
    discount: number;
    total_bill: number;
    order_id: number;
    coupon_code?: string;
    status: EnumPreOrderStatus;
    admin_note?: string;
    user_id: number;
    created_time?: Date;
    updated_time?: Date;
    ordered_packages?: OrderedPackage[];
}
const PreOrderSchema = new Schema({
    code: {
        type: String,
        trim: true,
        maxLength: 255
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    total_bill: {
        type: Number,
        required: true
    },
    order_id: {
        type: Number
    },
    coupon_code: {
        type: String
    },
    status: {
        type: Number,
        required: true,
        enum: EnumPreOrderStatus,
        default: 1
    },
    admin_note: {
        type: String
    },
    ordered_packages: {},
    user_id: {
        type: Number,
        required: true
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const PreOrderModel = model<PreOrder>(
    DOCUMENT_NAME,
    PreOrderSchema,
    COLLECTION_NAME
);
