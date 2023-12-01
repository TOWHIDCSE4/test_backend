import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'EventNotice';
export const COLLECTION_NAME = 'event-notices';

export enum EnumTargetType {
    STUDENT = 1,
    TEACHER = 2
}

export enum EnumEventNoticeType {
    HOLIDAY_EVENT = 'HOLIDAY_EVENT',
    UPDATE_SYSTEM_EVENT = 'UPDATE_SYSTEM_EVENT',
    OTHER_EVENT = 'OTHER_EVENT'
}

export default interface EventNotice extends Document {
    type: EnumEventNoticeType;
    target: EnumTargetType[];
    title: string;
    content?: string;
    start_time_shown: number;
    end_time_shown: number;
    is_active: boolean;
    image?: string;
    created_time?: Date;
    updated_time?: Date;
}

const EventNoticeSchema = new Schema({
    type: {
        type: String,
        enum: EnumEventNoticeType,
        required: true,
        index: true
    },
    target: [
        {
            type: Number,
            enum: EnumTargetType,
            required: true,
            index: true
        }
    ],
    title: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: ''
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
    is_active: {
        type: Boolean,
        required: true,
        default: false
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const EventNoticeModel = model<EventNotice>(
    DOCUMENT_NAME,
    EventNoticeSchema,
    COLLECTION_NAME
);
