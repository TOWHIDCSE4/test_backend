import { Schema, Document, model } from 'mongoose';
import PromptCategoryAI from './prompt-category-AI';

export const DOCUMENT_NAME = 'PromptTemplateAI';
export const COLLECTION_NAME = 'prompt-template-AI';

export enum EnumPromptTemplateAIStatus {
    ALL = '',
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}

export default interface PromptTemplateAI extends Document {
    id: number;
    is_active: boolean;
    title: string;
    category_obj_id: string;
    category?: PromptCategoryAI;
    description?: string;
    prompt: string;
    created_time?: Date;
    updated_time?: Date;
}

const CourseSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
    is_active: {
        type: Boolean,
        index: true,
        required: true,
        default: true
    },
    title: {
        type: String,
        index: true,
        required: true
    },
    category_obj_id: {
        type: String
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'PromptCategoryAI'
    },
    description: {
        type: String
    },
    prompt: {
        type: String,
        index: true,
        required: true
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const PromptTemplateAIModel = model<PromptTemplateAI>(
    DOCUMENT_NAME,
    CourseSchema,
    COLLECTION_NAME
);
