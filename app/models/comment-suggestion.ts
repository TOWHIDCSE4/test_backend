import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'CommentSuggestion';
export const COLLECTION_NAME = 'comment-suggestions';

export enum EnumCommentType {
    NORMAL_MEMO = 'normal_memo',
    TRIAL_MEMO = 'trial_memo',
    COURSE_MEMO = 'course_memo',
    MONTHLY_MEMO = 'monthly_memo'
}

export default interface CommentSuggestion extends Document {
    id: number;
    keyword: string;
    type: EnumCommentType;
    min_point: number;
    max_point: number;
    vi_comment: string;
    en_comment: string;
    created_time?: Date;
    updated_time?: Date;
}

const CommentSuggestionSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    keyword: {
        type: String,
        index: true,
        required: true,
        immutable: true
    },
    type: {
        type: String,
        enum: EnumCommentType,
        index: true,
        required: true
    },
    min_point: {
        type: Number,
        index: true,
        required: true
    },
    max_point: {
        type: Number,
        index: true,
        required: true
    },
    vi_comment: {
        type: String,
        required: true
    },
    en_comment: {
        type: String,
        required: true
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const CommentSuggestionModel = model<CommentSuggestion>(
    DOCUMENT_NAME,
    CommentSuggestionSchema,
    COLLECTION_NAME
);
