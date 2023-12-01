import { Schema, Document, model } from 'mongoose';
import User from './user';

export const DOCUMENT_NAME = 'AdviceLetter';
export const COLLECTION_NAME = 'advice-letter';

export enum EnumAdviceLetterStatus {
    Published = 1,
    Private = 2
}

export default interface AdviceLetter extends Document {
    student_id: number;
    student: User;
    booking_id: number;
    file_name: string;
    file: string;
    status: EnumAdviceLetterStatus;
    created_time: Date;
    updated_time?: Date;
}

const AdviceLetterSchema = new Schema({
    student_id: {
        type: Number,
        required: true
    },
    booking_id: {
        type: Number,
    },
    file_name: {
        type: String,
        required: true
    },
    file: {
        type: String,
        required: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: Number,
        enum: [
            EnumAdviceLetterStatus
        ],
        required: true,
        default: EnumAdviceLetterStatus.Published
    },
    created_time: {
        type: Date,
        default: Date.now,
        required: true
    },
    updated_time: {
        type: Date,
        default: Date.now,
        required: true
    }
});

export const AdviceLetterModel = model<AdviceLetter>(
    DOCUMENT_NAME,
    AdviceLetterSchema,
    COLLECTION_NAME
);