import { Schema, Document, model } from 'mongoose';
import Teacher from './teacher';

export const DOCUMENT_NAME = 'TeacherAbsentRequest';
export const COLLECTION_NAME = 'teacher-absent-requests';

export enum EnumTeacherAbsentRequestStatus {
    PENDING = 1,
    APPROVED = 2,
    REJECT_BY_ADMIN = 3,
    WITHDRAWN_BY_TEACHER = 4
}

export enum EnumCreatorType {
    TEACHER = 1,
    SYSTEM = 2
}

export default interface TeacherAbsentRequest extends Document {
    id: number;
    teacher_id: number;
    start_time: number;
    end_time: number;
    status: EnumTeacherAbsentRequestStatus;
    teacher: Teacher;
    teacher_note?: string;
    admin_note?: string;
    list_regular_absent?: any;
    creator_type?: number;
    created_time?: Date;
    updated_time?: Date;
}

const TeacherAbsentRequestSchema = new Schema({
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
    start_time: {
        type: Number,
        index: true,
        required: true
    },
    end_time: {
        type: Number,
        index: true,
        required: true
    },
    status: {
        type: Number,
        enum: EnumTeacherAbsentRequestStatus,
        default: 1,
        required: true
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    list_regular_absent: [],
    teacher_note: {
        type: String
    },
    admin_note: {
        type: String
    },
    creator_type: {
        type: Number,
        default: EnumCreatorType.TEACHER
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const TeacherAbsentRequestModel = model<TeacherAbsentRequest>(
    DOCUMENT_NAME,
    TeacherAbsentRequestSchema,
    COLLECTION_NAME
);
