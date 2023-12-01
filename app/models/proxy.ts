import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'Proxy';
export const COLLECTION_NAME = 'proxies';

export enum EnumProxySkypeStatus {
    AVAILABLE = 1,
    BLOCK = 2
}

export default interface Proxy extends Document {
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    skype_call_status?: EnumProxySkypeStatus;
    last_time_use?: Date;
    error_msg?: string;
    created_time?: Date;
    updated_time?: Date;
}
const ProxySchema = new Schema({
    host: {
        type: String,
        unique: true,
        index: true,
        trim: true
    },
    port: {
        type: String,
        trim: true
    },
    username: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        trim: true
    },
    skype_call_status: {
        type: Number,
        required: true,
        enum: EnumProxySkypeStatus,
        default: EnumProxySkypeStatus.AVAILABLE
    },
    last_time_use: {
        type: Date
    },
    error_msg: {
        type: String,
        trim: true
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

export const ProxyModel = model<Proxy>(
    DOCUMENT_NAME,
    ProxySchema,
    COLLECTION_NAME
);
