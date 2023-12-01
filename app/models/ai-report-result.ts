import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'AIReportResults';
export const COLLECTION_NAME = 'ai-report-results';

export enum EnumPromptCategoryAIStatus {
    ALL = '',
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}

export default interface AIReportResult extends Document {
    id: number;
    title: string;
    content: string;
    user_id?: number;
    prompt_template_id: number;
    number_lesson?: number;
    from_date?: string;
    to_date?: string;
    params?: any;
    created_time?: Date;
    updated_time?: Date;
}

const AIReportSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    title: {
        type: String,
        index: true,
        unique: true,
        required: true
    },
    content: {
        type: String,
        index: true,
        required: true
    },
    user_id: {
        type: Number,
        index: true
    },
    prompt_template_id: {
        type: Number,
        index: true,
        required: true
    },
    number_lesson: {
        type: Number,
        index: true
    },
    from_date: {
        type: String,
        index: true
    },
    to_date: {
        type: String,
        index: true
    },
    params: {
        type: Object
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const AIReportResultModel = model<AIReportResult>(
    DOCUMENT_NAME,
    AIReportSchema,
    COLLECTION_NAME
);
