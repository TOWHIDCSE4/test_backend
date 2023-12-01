import { Schema, Document, model } from 'mongoose';
import Admin from './admin';

import { DEFAULT_STUDENT_STARTING_LEVEL } from '../const/student';

export const DOCUMENT_NAME = 'Student';
export const COLLECTION_NAME = 'students';

export enum EnumStudentType {
    NEW = 1,
    RENEW = 2,
    ALL_TYPE
}

export default interface Student extends Document {
    user_id: number;
    staff_id: number;
    student_level_id: number;
    created_time?: Date;
    updated_time?: Date;
    staff?: Admin;
}

const StudentSchema = new Schema({
    user_id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    staff_id: {
        type: Number
    },
    staff: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    student_level_id: {
        type: Number,
        index: true,
        required: true,
        default: DEFAULT_STUDENT_STARTING_LEVEL
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const StudentModel = model<Student>(
    DOCUMENT_NAME,
    StudentSchema,
    COLLECTION_NAME
);
