import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'SkypeMeetingPool';
export const COLLECTION_NAME = 'skype-meeting-pool';
export enum EnumStatus {
    NEW = 1,
    USED = 2
}
export default interface SkypeMeetingPool extends Document {
    status?: number;
    is_active?: boolean;
    info?: any;
    created_time?: Date;
    updated_time?: Date;
}

const SkypeMeetingPoolSchema = new Schema({
    status: {
        type: Number,
        default: EnumStatus.NEW
    },
    is_active: {
        type: Boolean,
        default: true
    },
    info: Object,
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const SkypeMeetingPoolModel = model<SkypeMeetingPool>(
    DOCUMENT_NAME,
    SkypeMeetingPoolSchema,
    COLLECTION_NAME
);
