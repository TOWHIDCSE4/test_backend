import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'ApiKeyAI';
export const COLLECTION_NAME = 'api-key-AI';

export enum apiKeyType {
    openAPI = 1
}

export enum EnumApiKeyAIStatus {
    ALL = '',
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}

export default interface ApiKeyAI extends Document {
    title: string;
    is_active: boolean;
    api_key: string;
    type: number;
    balance?: number;
    msg_error?: string;
    last_used_time: number;
    created_time?: Date;
    updated_time?: Date;
}

const ApiKeyAISchema = new Schema({
    title: {
        type: String,
        index: true,
        required: true
    },
    type: {
        type: Number,
        index: true,
        required: true,
        default: apiKeyType.openAPI
    },
    is_active: {
        type: Boolean,
        index: true,
        required: true,
        default: true
    },
    api_key: {
        type: String,
        index: true,
        required: true
    },
    balance: {
        type: Number,
        index: true,
        required: true,
        default: 0
    },
    msg_error: {
        type: String
    },
    last_used_time: {
        type: Number,
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

export const ApiKeyAIModel = model<ApiKeyAI>(
    DOCUMENT_NAME,
    ApiKeyAISchema,
    COLLECTION_NAME
);
