import { Schema, Document, model } from 'mongoose';
import PromptTemplateAI from './prompt-template-AI';
export const DOCUMENT_NAME = 'learningAssessmentReports';
export const COLLECTION_NAME = 'learning-assessment-reports';

export enum EnumLAReportStatus {
    PRIVATE = 1,
    PUBLISHED = 2
}

export enum EnumLAReportType {
    OTHER = 1,
    DILIGENCE = 2,
    PERIODIC = 3,
    END_TERM = 4
}

export enum EnumLAReportSource {
    SYSTEM = 1,
    ADMIN = 2
}

export default interface LearningAssessmentReports extends Document {
    id: number;
    student_id: number;
    start_time?: number;
    end_time?: number;
    status: EnumLAReportStatus;
    type: EnumLAReportType;
    prompt_obj_id?: string;
    prompt_template?: PromptTemplateAI;
    memo?: string;
    booking_ids?: number[];
    source?: EnumLAReportSource;
    note?: any;
    time_create: number;
    package_id?: number;
    file_upload?: string;
    created_time?: Date;
    updated_time?: Date;
}
const OrderSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
    student_id: {
        type: Number,
        required: true,
        index: true
    },
    start_time: {
        type: Number,
        index: true
    },
    end_time: {
        type: Number,
        index: true
    },
    status: {
        type: Number,
        require: true,
        index: true,
        enum: EnumLAReportStatus,
        default: EnumLAReportStatus.PRIVATE
    },
    prompt_obj_id: {
        type: String,
        index: true
    },
    prompt_template: {
        type: Schema.Types.ObjectId,
        ref: 'PromptTemplateAI'
    },
    memo: {
        type: String,
        index: true
    },
    type: {
        type: Number,
        require: true,
        index: true,
        enum: EnumLAReportType,
        default: EnumLAReportType.OTHER
    },
    source: {
        type: Number,
        require: true,
        index: true,
        enum: EnumLAReportSource,
        default: EnumLAReportSource.ADMIN
    },
    booking_ids: {
        type: [
            {
                type: Number
            }
        ],
        default: []
    },
    note: {
        type: Object,
        default: {
            cskh: '',
            ht: ''
        }
    },
    time_create: {
        type: Number,
        require: true,
        index: true
    },
    package_id: {
        type: Number,
        index: true
    },
    file_upload: {
        type: String
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const LearningAssessmentReportsModel = model<LearningAssessmentReports>(
    DOCUMENT_NAME,
    OrderSchema,
    COLLECTION_NAME
);
