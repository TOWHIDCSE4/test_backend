import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'Curriculum';
export const COLLECTION_NAME = 'curriculums';

export enum EnumCurriculumAgeList {
    KINDERGARTEN = 1,
    KIDS = 2,
    TEENS = 3,
    ADULT = 4
}

export default interface Curriculum extends Document {
    id: number;
    //    subject_id: number;
    name: string;
    alias: string;
    description?: string;
    image?: string;
    age_list: EnumCurriculumAgeList[];
    created_time?: Date;
    updated_time?: Date;
}

const CurriculumSchema = new Schema({
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
    alias: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    age_list: {
        type: [
            {
                type: Number,
                enum: EnumCurriculumAgeList
            }
        ],
        default: []
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const CurriculumModel = model<Curriculum>(
    DOCUMENT_NAME,
    CurriculumSchema,
    COLLECTION_NAME
);
