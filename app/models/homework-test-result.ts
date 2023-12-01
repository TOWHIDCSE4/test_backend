import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'HomeworkTestResult';
export const COLLECTION_NAME = 'homework-test-result';
export enum EnumTestType {
    homework = 1,
    ielts = 2
}
export default interface HomeworkTestResult extends Document {
    id: number;
    student_id: number;
    booking_id: number;
    course_id: number;
    unit_id: number;
    test_type: number;
    test_topic_id?: number;
    test_result_id?: number;
    test_result_code?: string;
    test_result?: any;
    test_topic_name?: string;
    test_url?: string;
    created_time?: Date;
    updated_time?: Date;
}

const HomeworkTestResultSchema = new Schema({
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
    test_result: Object,
    test_topic_name: {
        type: String
    },
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

export const HomeworkTestResultModel = model<HomeworkTestResult>(
    DOCUMENT_NAME,
    HomeworkTestResultSchema,
    COLLECTION_NAME
);
