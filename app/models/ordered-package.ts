import { Schema, Document, model } from 'mongoose';

import { EnumPackageOrderType, EnumAlertType } from '../const/package';
import Order from './order';

export const DOCUMENT_NAME = 'OrderedPackage';
export const COLLECTION_NAME = 'ordered-packages';

export enum EnumDisplay {
    PUBLISH = 1,
    PRIVATE = 2
}
export default interface OrderedPackage extends Document {
    id: number;
    package_id: number;
    package_name: string;
    type: EnumPackageOrderType;
    user_id: number;
    order_id: number;
    number_class: number /** Number of class students can learn */;
    day_of_use: number;
    original_number_class: number;
    paid_number_class?: number;
    admin_note?: string;
    activation_date?: number;
    order: Order;
    alerted: EnumAlertType[];
    expired_date?: number;
    ispeak_order_id?: number;
    history: any;
    created_time?: Date;
    updated_time?: Date;
    is_show_history?: boolean;
    display_change_history?: any;
}

const OrderedPackageSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
    package_id: {
        type: Number,
        required: true
    },
    package_name: {
        type: String,
        required: true
    },
    type: {
        type: Number,
        enum: EnumPackageOrderType,
        index: true,
        required: true,
        default: EnumPackageOrderType.STANDARD
    },
    admin_note: {
        type: String
    },
    user_id: {
        type: Number,
        required: true,
        immutable: true
    },
    order_id: {
        type: Number,
        required: true,
        immutable: true
    },
    history: [],
    number_class: {
        type: Number,
        required: true
    },
    day_of_use: {
        type: Number,
        required: true
    },
    original_number_class: {
        type: Number,
        required: true
    },
    paid_number_class: {
        type: Number,
        default: 0
    },
    //    price: {
    //        type: Number,
    //        required: true
    //    },
    activation_date: {
        type: Number,
        index: true
    },
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    alerted: [
        {
            type: Number,
            enum: EnumAlertType
        }
    ],
    ispeak_order_id: {
        type: Number
    },
    created_time: {
        type: Date
    },
    updated_time: {
        type: Date
    },
    is_show_history: {
        type: Boolean,
        default: false
    },
    display_change_history: {
        type: Array
    }
});

export const OrderedPackageModel = model<OrderedPackage>(
    DOCUMENT_NAME,
    OrderedPackageSchema,
    COLLECTION_NAME
);
