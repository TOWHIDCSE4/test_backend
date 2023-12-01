import { Schema, Document, model } from 'mongoose';
import OrderedPackage from './ordered-package';
export const DOCUMENT_NAME = 'Order';
export const COLLECTION_NAME = 'orders';

export enum EnumOrderStatus {
    PAID = 1,
    PENDING = 2,
    CANCEL = 3
}

export default interface Order extends Document {
    id: number;
    code?: string;
    price: number;
    discount: number;
    total_bill: number;
    coupon_code?: string;
    status: EnumOrderStatus;
    admin_note?: string;
    user_id: number;
    created_time?: Date;
    updated_time?: Date;
    packages?: OrderedPackage[];
}
const OrderSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
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
    coupon_code: {
        type: String
    },
    status: {
        type: Number,
        required: true,
        enum: EnumOrderStatus,
        default: 2
    },
    admin_note: {
        type: String
    },
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

export const OrderModel = model<Order>(
    DOCUMENT_NAME,
    OrderSchema,
    COLLECTION_NAME
);
