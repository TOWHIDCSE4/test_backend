import { Schema, Document, model } from 'mongoose';
import Student from './student';

export const DOCUMENT_NAME = 'StudentLeaveRequest';
export const COLLECTION_NAME = 'student-leave-requests';

export enum EnumStudentLeaveRequestStatus {
    APPROVED = 1,
    PENDING = 2,
    REJECT_BY_ADMIN = 3
}

export enum EnumStudentLeaveRequestSource {
    ADMIN = 1,
    STUDENT = 2
}

export default interface StudentLeaveRequest extends Document {
    id: number;
    student_id: number;
    start_time: number;
    end_time: number;
    student: Student;
    status?: number;
    reason?: string;
    admin_note?: string;
    source?: number;
    creator_id?: number;
    created_time?: Date;
    updated_time?: Date;
}

const StudentLeaveRequestSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true
    },
    student_id: {
        type: Number,
        index: true,
        required: true
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
    student: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    status: {
        type: Number,
        default: EnumStudentLeaveRequestStatus.APPROVED
    },
    source: {
        type: Number,
        default: EnumStudentLeaveRequestSource.ADMIN
    },
    creator_id: {
        type: Number
    },
    reason: {
        type: String
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

export const StudentLeaveRequestModel = model<StudentLeaveRequest>(
    DOCUMENT_NAME,
    StudentLeaveRequestSchema,
    COLLECTION_NAME
);
