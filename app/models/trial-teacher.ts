import { Schema, Document, model } from 'mongoose';
import Teacher from './teacher';

export const DOCUMENT_NAME = 'TrialTeacher';
export const COLLECTION_NAME = 'trial-teachers';

export default interface TrialTeacher extends Document {
    teacher_id: number;
    age_groups: EnumAgeGroup[];
    teacher: Teacher;
    created_time?: Date;
    updated_time?: Date;
}

export enum EnumAgeGroup {
    CHILDREN = 1 /* 5-7 */,
    JUNIOR = 2 /* 8-10 */,
    SECONDARY_JUNIOR = 3 /* 11-14 */,
    SENIOR = 4 /* adult */
}

const TrialTeacherSchema = new Schema({
    teacher_id: {
        type: Number, // Ref to user_id in teacher schema
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    age_groups: {
        type: [
            {
                type: Number,
                enum: EnumAgeGroup
            }
        ],
        index: true,
        required: true,
        default: []
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const TrialTeacherModel = model<TrialTeacher>(
    DOCUMENT_NAME,
    TrialTeacherSchema,
    COLLECTION_NAME
);
