import mongoose, { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'Report';
export const COLLECTION_NAME = 'reports';
import User from './user';
import Admin from './admin';

export enum EnumRecommendSection {
    TEACHER_SYSTEM_REPORT = 1,
    TEACHER_STUDENT_REPORT = 2,
    TEACHER_WAGE_RULE_REPORT = 3,
    TEACHER_MATERIAL_REPORT = 4,
    TEACHER_OTHER_REPORT = 5,
    STUDENT_SYSTEM_REPORT = 6,
    STUDENT_TEACHER_REPORT = 7,
    STUDENT_SUPPORT_REPORT = 8,
    STUDENT_LEARNING_DOCUMENT_REPORT = 9,
    STUDENT_OTHER_REPORT = 10
}

export enum EnumRecommendStatus {
    PENDING = 1,
    PROCESSING = 2,
    COMPLETED = 3,
    CANCELED = 4,
    CLOSED = 5
}

export enum EnumReportType {
    RECOMMEND = 1,
    REPORT = 2
}

export enum EnumClassify {
    ADVICE_SUPPORT = 1,
    COMPLAIN = 2,
    OTHER = 3
}
export enum EnumLevel {
    NORMAL = 1,
    HOT = 2
}
export default interface Report extends Document {
    id: number;
    _id: mongoose.Types.ObjectId;
    booking_id?: number;

    report_user: User;
    report_user_id: number;
    report_content: any;
    report_teacher: User;
    report_teacher_id: number;
    report_teacher_feedback: string;
    report_solution: string;

    resolve_user: Admin;
    resolve_user_id: number;

    created_user_id: number;
    teacher: number;

    recommend_content: string;
    recommend_section: EnumRecommendSection;
    recommend_status: EnumRecommendStatus;

    classify: EnumClassify;
    level: EnumLevel;
    processing_department_id: number;
    department_staff_id: number;
    department_staff_feedback: string;
    error_cause: string;

    type: EnumReportType;
    support_timeline: string;
    created_time: Date;
    updated_time: Date;
}

const ReportSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    booking_id: {
        type: Number
    },
    created_user_id: {
        type: Number
    },
    report_user: {
        type: Schema.Types.Mixed,
        required: true
    },
    report_user_id: {
        type: Number,
        required: true
    },
    teacher: {
        type: Number
    },
    report_content: {
        type: Schema.Types.Mixed
    },
    report_teacher: {
        type: Schema.Types.Mixed
    },
    report_teacher_id: {
        type: Number
    },
    report_teacher_feedback: {
        type: String
    },
    report_solution: {
        type: String
    },

    resolve_user: {
        type: Schema.Types.Mixed
    },
    resolve_user_id: {
        type: Number
    },

    recommend_content: {
        type: String
    },
    recommend_section: {
        type: EnumRecommendSection,
        required: true,
        default: EnumRecommendSection.TEACHER_OTHER_REPORT
    },
    recommend_status: {
        type: EnumRecommendStatus,
        required: true,
        default: EnumRecommendStatus.PENDING
    },

    classify: {
        type: Number
    },
    level: {
        type: Number
    },
    processing_department_id: { type: Number },
    department_staff_id: { type: Number },
    department_staff_feedback: { type: String },
    error_cause: { type: String },

    support_timeline: {
        type: String
    },
    type: {
        type: EnumReportType,
        default: EnumReportType.RECOMMEND
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const ReportModel = model<Report>(
    DOCUMENT_NAME,
    ReportSchema,
    COLLECTION_NAME
);
