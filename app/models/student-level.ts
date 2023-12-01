import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'StudentLevel';
export const COLLECTION_NAME = 'student-levels';

export default interface StudentLevel extends Document {
    id: number;
    name: string;
    vocabulary_description?: string;
    skill_description?: string;
    grammar_description?: string;
    speaking_description?: string;
    created_time?: Date;
    updated_time?: Date;
}

const StudentLevelSchema = new Schema({
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
    vocabulary_description: {
        type: String
    },
    skill_description: {
        type: String
    },
    grammar_description: {
        type: String
    },
    speaking_description: {
        type: String
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: Date
});

export const StudentLevelModel = model<StudentLevel>(
    DOCUMENT_NAME,
    StudentLevelSchema,
    COLLECTION_NAME
);
