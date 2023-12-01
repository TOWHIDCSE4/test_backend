import { Schema, Document, model } from 'mongoose';
import Course from './course';

export const DOCUMENT_NAME = 'Unit';
export const COLLECTION_NAME = 'units';

export enum EnumExamType {
    MIDTERM_EXAM = 1,
    FINAL_EXAM = 2,
    TEST = 3
}

export enum EnumUnitType {
    EN_COMMON = 'EN_COMMON',
    IELTS_GRAMMAR = 'IELTS_GRAMMAR',
    IELTS_4_SKILLS = 'IELTS_4_SKILLS'
}

export enum EnumHomeworkType {
    v1 = 'self-study-v1',
    v2 = 'self-study-v2'
}

export default interface Unit extends Document {
    id: number;
    is_active: boolean;
    course_id: number;
    name: string;
    student_document?: string;
    teacher_document?: string;
    audio?: any;
    note?: string;
    preview?: string;
    course?: Course;
    workbook?: string;
    homework?: any;
    exam?: any;
    homework_id?: number;
    exam_id?: number;
    exam_type?: number;
    homework2?: any;
    homework2_id?: number;
    test_topic?: any;
    test_topic_id?: number;
    display_order?: number;
    ielts_reading_topic?: any;
    ielts_reading_topic_id?: number;
    ielts_writing_topic?: any;
    ielts_writing_topic_id?: number;
    ielts_listening_topic?: any;
    ielts_listening_topic_id?: number;
    unit_type?: string;
    created_time?: Date;
    updated_time?: Date;
}

const UnitSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    is_active: {
        type: Boolean,
        index: true,
        required: true,
        default: true
    },
    course_id: {
        type: Number,
        index: true,
        required: true
    },
    name: {
        type: String,
        index: true,
        required: true
    },
    student_document: {
        type: String
    },
    teacher_document: {
        type: String
    },
    note: {
        type: String
    },
    preview: {
        type: String
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course'
    },
    audio: {
        type: Array
    },
    workbook: {
        type: String
    },
    homework_id: {
        type: Number
    },
    homework: {
        type: Schema.Types.Mixed
    },
    exam: {
        type: Schema.Types.Mixed
    },
    exam_id: {
        type: Number
    },
    exam_type: {
        type: Number,
        enum: EnumExamType
    },
    test_topic: {
        type: Schema.Types.Mixed
    },
    test_topic_id: {
        type: Number
    },
    homework2: {
        type: Schema.Types.Mixed
    },
    homework2_id: {
        type: Number
    },
    display_order: {
        type: Number
    },
    unit_type: {
        type: String,
        enum: EnumUnitType,
        default: EnumUnitType.EN_COMMON
    },
    ielts_reading_topic: {
        type: Schema.Types.Mixed
    },
    ielts_reading_topic_id: {
        type: Number
    },
    ielts_writing_topic: {
        type: Schema.Types.Mixed
    },
    ielts_writing_topic_id: {
        type: Number
    },
    ielts_listening_topic: {
        type: Schema.Types.Mixed
    },
    ielts_listening_topic_id: {
        type: Number
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const UnitModel = model<Unit>(
    DOCUMENT_NAME,
    UnitSchema,
    COLLECTION_NAME
);
