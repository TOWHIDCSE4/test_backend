import { Schema, Document, model } from 'mongoose';
import User from './user';
import Course from './course';
import Unit from './unit';
export const DOCUMENT_NAME = 'TrialTestIeltsResult';
export const COLLECTION_NAME = 'trial-test-ielts-result';
export enum EnumTestType {
    IELTS_GRAMMAR = 1,
    IELTS_4_SKILLS = 2
}

export enum EnumTrialTestIeltsSubType {
    READING = 'reading',
    SPEAKING = 'speaking',
    LISTENING = 'listening',
    WRITING = 'writing'
}

export default interface TrialTestIeltsResult extends Document {
    id: number;
    student_id: number;
    booking_id: number;
    course_id: number;
    unit_id: number;
    test_type: number;
    test_url?: string;
    code_access?: string;
    test_topic_id?: number;
    test_result_id?: number;
    test_result_code?: string;
    test_topic_name?: string;
    test_result_grammar?: any;
    test_result_writing?: any;
    test_result_listening?: any;
    test_result_reading?: any;
    test_result_speaking?: any;
    created_time?: Date;
    updated_time?: Date;
}

const TrialTestIeltsResultSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    student_id: {
        type: Number,
        index: true,
        required: true
    },
    booking_id: {
        type: Number,
        index: true,
        required: true
    },
    course_id: {
        type: Number,
        index: true,
        required: true
    },
    unit_id: {
        type: Number,
        index: true,
        required: true
    },
    test_type: {
        type: Number
    },
    test_topic_id: {
        type: Number
    },
    test_result_id: {
        type: Number
    },
    test_result_code: {
        type: String
    },
    code_access: {
        type: String
    },
    test_topic_name: {
        type: String
    },
    test_result_grammar: Object,
    test_result_writing: Object,
    test_result_listening: Object,
    test_result_reading: Object,
    test_result_speaking: Object,
    test_url: {
        type: String
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const TrialTestIeltsResultModel = model<TrialTestIeltsResult>(
    DOCUMENT_NAME,
    TrialTestIeltsResultSchema,
    COLLECTION_NAME
);
