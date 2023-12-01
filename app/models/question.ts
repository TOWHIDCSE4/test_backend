import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'Question';
export const COLLECTION_NAME = 'questions';

export enum EnumQuestionType {
    ONE_CHOICE = 1,
    MULTI_CHOICE,
    MATCH,
    TEXT
}

export interface IAnswers {
    content: string;
    is_correct: boolean;
}

export default interface Question extends Document {
    id: number;
    name: string;
    description?: string;
    answers: IAnswers[];
    question_type: EnumQuestionType;
    quiz_id: number;
    display_order: number;
    created_time?: Date;
    updated_time?: Date;
}

const QuestionSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    name: {
        type: String,
        index: true,
        required: true
    },
    description: {
        type: String
    },
    answers: {
        type: [
            {
                content: {
                    type: String,
                    required: true
                },
                is_correct: {
                    type: Boolean,
                    required: true
                }
            }
        ]
    },
    question_type: {
        type: Number,
        enum: EnumQuestionType,
        required: true
    },
    quiz_id: {
        type: Number,
        required: true
    },
    quiz: {
        type: Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    display_order: {
        type: Number
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const QuestionModel = model<Question>(
    DOCUMENT_NAME,
    QuestionSchema,
    COLLECTION_NAME
);
