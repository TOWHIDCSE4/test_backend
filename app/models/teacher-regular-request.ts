import { Schema, Document, model } from 'mongoose';
import Teacher from './teacher';

export const DOCUMENT_NAME = 'TeacherRegularRequest';
export const COLLECTION_NAME = 'teacher-regular-requests';

export default interface TeacherRegularRequest extends Document {
    id: number;
    teacher_id: number;
    old_regular_times: number[];
    regular_times: number[];
    status: number;
    teacher: Teacher;
    is_updated?: boolean;
    admin_note?: string;
    created_time?: Date;
    updated_time?: Date;
}

const TeacherRegularRequestSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    teacher_id: {
        type: Number,
        index: true,
        required: true,
        immutable: true
    },
    old_regular_times: {
        type: [
            {
                type: Number
            }
        ],
        default: [],
        required: true,
        immutable: true
    },
    regular_times: {
        type: [
            {
                type: Number
            }
        ],
        default: [],
        required: true
    },
    status: {
        type: Number,
        enum: [1, 2, 3] /* 1: CONFIRMED, 2: PENDING, 3: CANCELED */,
        default: 2,
        required: true
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    is_updated: {
        type: Boolean,
        default: false
    },
    admin_note: {
        type: String
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const TeacherRegularRequestModel = model<TeacherRegularRequest>(
    DOCUMENT_NAME,
    TeacherRegularRequestSchema,
    COLLECTION_NAME
);
