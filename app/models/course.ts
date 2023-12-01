import { Schema, Document, model } from 'mongoose';
import Curriculum from './curriculum';
import Subject from './subject';
import Package from './package';
import Unit from './unit';
import { DEFAULT_SUBJECT_ID } from '../const/default-id';

export const DOCUMENT_NAME = 'Course';
export const COLLECTION_NAME = 'courses';

/** @TODO Check with BA if later we should change this to a separate module */
export enum EnumCourseTag {
    HOT = 'hot',
    POPULAR = 'popular',
    NEW = 'new',
    SPECIAL_OFFER = 'special_offer'
}

export enum EnumCourseType {
    EN_COMMON = 'EN_COMMON',
    IELTS = 'IELTS'
}

export enum EnumCourseStatus {
    ACTIVE = 1,
    INACTIVE = 2,
    ALL_STATUS = ''
}

export default interface Course extends Document {
    id: number;
    is_active: boolean;
    subject_id: number;
    package_id_list: number[];
    curriculum_id?: number;
    display_order?: number;
    name: string;
    alias: string;
    description?: string;
    slug?: string;
    image?: string;
    tags: EnumCourseTag[];
    subject: Subject;
    packages: Package[];
    units?: Unit[];
    curriculum?: Curriculum;
    course_type?: string;
    created_time?: Date;
    updated_time?: Date;
}

const CourseSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    is_active: {
        type: Boolean,
        index: true,
        required: true,
        default: true
    },
    subject_id: {
        type: Number,
        index: true,
        required: true,
        default: DEFAULT_SUBJECT_ID
    },
    package_id_list: {
        type: [
            {
                type: Number,
                index: true
            }
        ],
        default: []
    },
    curriculum_id: {
        type: Number
    },
    display_order: {
        type: Number
    },
    name: {
        type: String,
        index: true,
        required: true
    },
    alias: {
        type: String,
        index: true,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        index: true,
        required: true,
        unique: true
    },
    image: {
        type: String,
        required: true
    },
    tags: {
        type: [
            {
                type: String,
                enum: EnumCourseTag
            }
        ],
        default: []
    },
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    packages: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Package'
            }
        ],
        default: []
    },
    curriculum: {
        type: Schema.Types.ObjectId,
        ref: 'Curriculum'
    },
    course_type: {
        type: String,
        enum: EnumCourseType,
        default: EnumCourseType.EN_COMMON
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const CourseModel = model<Course>(
    DOCUMENT_NAME,
    CourseSchema,
    COLLECTION_NAME
);
