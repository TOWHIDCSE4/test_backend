import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'Log';
export const COLLECTION_NAME = 'logs';

export enum EnumPartner {
    ISPEAK = 'ISPEAK',
    UNKNOWN = 'UNKNOWN'
}

export enum EnumMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
}
export default interface Log extends Document {
    user: any;
    code: number;
    change_data?: any;
    body_data: any;
    params_data: any;
    route: string;
    original_url: string;
    method: string;
    description: string;
    full_text_search: string;
    created_time: Date;
    updated_time: Date;
}
const LogSchema = new Schema({
    user: {
        type: Schema.Types.Mixed
    },
    code: {
        type: Number
    },
    change_data: {
        type: Schema.Types.Mixed
    },
    body_data: {
        type: Schema.Types.Mixed
    },
    params_data: {
        type: Schema.Types.Mixed
    },
    route: {
        type: String
    },
    original_url: {
        type: String
    },
    method: {
        type: String,
        enum: EnumMethod
    },
    description: {
        type: String
    },
    full_text_search: {
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

LogSchema.index({
    change_data: 'text',
    body_data: 'text',
    params_data: 'text',
    original_url: 'text'
});

export const LogModel = model<Log>(DOCUMENT_NAME, LogSchema, COLLECTION_NAME);
