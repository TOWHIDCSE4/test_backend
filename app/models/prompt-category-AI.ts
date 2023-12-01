import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'PromptCategoryAI';
export const COLLECTION_NAME = 'prompt-category-AI';

export enum EnumPromptCategoryAIStatus {
    ALL = '',
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}

export default interface PromptCategoryAI extends Document {
    title: string;
    is_active: boolean;
    created_time?: Date;
    updated_time?: Date;
}

const CourseSchema = new Schema({
    title: {
        type: String,
        index: true,
        unique: true,
        required: true
    },
    is_active: {
        type: Boolean,
        index: true,
        required: true,
        default: true
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const PromptCategoryAIModel = model<PromptCategoryAI>(
    DOCUMENT_NAME,
    CourseSchema,
    COLLECTION_NAME
);
