import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'Calendar';
export const COLLECTION_NAME = 'calendars';

export default interface Calendar extends Document {
    id: number;
    teacher_id: number;
    start_time: number;
    end_time: number;
    is_active?: boolean;
    created_time?: Date;
    updated_time?: Date;
    ispeak_calendar_id?: number;
}

const CalendarSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
    teacher_id: {
        type: Number,
        required: true
    },
    start_time: {
        type: Number,
        required: true,
        index: true
    },
    end_time: {
        type: Number,
        required: true,
        index: true
    },
    is_active: {
        type: Boolean,
        default: false
    },
    ispeak_calendar_id: {
        type: Number,
        index: true
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});
// @ts-ignore
CalendarSchema.index(
    { teacher_id: 1, start_time: 1, end_time: 1 }, // @ts-ignore
    { unique: true }
);

export const CalendarModel = model<Calendar>(
    DOCUMENT_NAME,
    CalendarSchema,
    COLLECTION_NAME
);
