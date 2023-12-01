import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'Subject';
export const COLLECTION_NAME = 'subjects';

export default interface Subject extends Document {
    id: number;
    name: string;
    alias: string;
    slug: string;
    is_active: boolean;
    created_time?: Date;
    updated_time?: Date;
}
const SubjectSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        index: true,
        immutable: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 255
    },
    alias: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: 255,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: 255
    },
    is_active: {
        type: Boolean,
        required: true,
        default: true
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

export const SubjectModel = model<Subject>(
    DOCUMENT_NAME,
    SubjectSchema,
    COLLECTION_NAME
);
