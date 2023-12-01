import { EmailTemplate } from '../const/notification';
import {
    BackEndEvent,
    BackEndNotification,
    ZaloOANotification
} from '../const/notification';
import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'Template';
export const COLLECTION_NAME = 'templates';

export enum EnumTemplateType {
    EMAIL = 1,
    NOTIFICATION = 2,
    EVENT = 3,
    PDF = 4,
    ZALOOA = 5
}
export const EnumTemplateCode = {
    ...EmailTemplate,
    ...BackEndNotification,
    ...BackEndEvent,
    ...ZaloOANotification
};
export type EnumTemplateCode = typeof EnumTemplateCode;

export default interface Template extends Document {
    type: EnumTemplateType;
    code: string;
    // name: string
    description?: string;
    title: string;
    content: string;
    created_time?: Date;
    updated_time?: Date;
}

const TemplateSchema = new Schema(
    {
        type: {
            type: Number,
            enum: EnumTemplateType,
            required: true,
            index: true
        },
        code: {
            type: String,
            index: true,
            required: true,
            unique: true
        },
        name: {
            type: String,
            index: true
        },
        description: {
            type: String
        },
        title: {
            type: String,
            default: ''
        },
        content: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: {
            createdAt: 'created_time',
            updatedAt: 'updated_time'
        }
    }
);

export const TemplateModel = model<Template>(
    DOCUMENT_NAME,
    TemplateSchema,
    COLLECTION_NAME
);
