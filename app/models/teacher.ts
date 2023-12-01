import { Schema, Document, model } from 'mongoose';
import Location from './location';
import TeacherLevel from './teacher-level';

import { TEACHER_LEVEL_STATUS } from '../const';
import { DEFAULT_TEACHER_LEVEL_ID } from '../const/default-id';
import User from './user';
import TeacherSalary from './teacher-salary';

export const DOCUMENT_NAME = 'Teacher';
export const COLLECTION_NAME = 'teachers';

export enum EnumReviewStatus {
    REJECT = -1,
    PENDING = 0,
    CONFIRMED = 1
}
export default interface Teacher extends Document {
    user_id: number;
    location_id: number;
    teacher_level_id: number;
    teacher_level_status: number;
    staff_id?: number;
    hourly_rate: number;
    intro_video?: string;
    experience?: string;
    about_me?: string;
    average_rating?: number;
    skills?: any[];
    job_qualification?: number;
    cv?: string;
    degree?: string;
    english_certificate: EnglishCertificate;
    teaching_certificate: TeachingCertificate;
    total_lesson?: number;
    total_lesson_ispeak?: number;
    total_lesson_english_plus?: number;
    total_lesson_this_level?: number;
    location: Location;
    level: TeacherLevel;
    user: UserObject;
    is_reviewed?: EnumReviewStatus;
    created_time?: Date;
    updated_time?: Date;
    user_info?: User;
    teacher_salary?: TeacherSalary;
    ref_code?: string;
    ref_by_teacher?: refTeacherObject;
    count: number;
}

type refTeacherObject = {
    id: number;
    ref_date: Date;
};

type UserObject = {
    full_name: string;
    username: string;
    email: string;
    avatar?: string;
    is_active: boolean;
};

type EnglishCertificate = {
    ielts?: string;
    toeic?: string;
};
type TeachingCertificate = {
    tesol?: string;
    tefl?: string;
};

const TeacherSchema = new Schema(
    {
        user_id: {
            type: Number, // Ref to user_id in user schema
            unique: true,
            index: true,
            required: true,
            immutable: true
        },
        location_id: {
            type: Number,
            index: true,
            required: true
        },
        teacher_level_id: {
            type: Number,
            index: true,
            required: true,
            default: DEFAULT_TEACHER_LEVEL_ID
        },
        staff_id: {
            // Admin schema
            type: Number,
            index: true
        },
        teacher_level_status: {
            type: Number,
            default: TEACHER_LEVEL_STATUS.KEEP
        },
        hourly_rate: {
            type: Number,
            required: true
        },
        intro_video: {
            type: String
        },
        experience: {
            type: String
        },
        about_me: {
            type: String
        },
        average_rating: {
            type: Number,
            required: true,
            default: 0
        },
        skills: [
            {
                subject_id: {
                    required: true,
                    type: Number
                },
                subject_skills: [
                    Number
                ] /*Later we need to define the skill enum to change this property type to that enum*/
            }
        ],
        job_qualification: {
            type: Number,
            required: true,
            enum: [1, 2] /* 1: Professional Teacher, 2: Tutor */,
            default: 1
        },
        cv: String,
        degree: String,
        english_certificate: {
            type: Schema.Types.Mixed
        },
        teaching_certificate: {
            type: Schema.Types.Mixed
        },
        total_lesson: {
            type: Number,
            required: true,
            default: 0
        },
        total_lesson_ispeak: {
            type: Number,
            required: true,
            default: 0
        },
        total_lesson_english_plus: {
            type: Number,
            required: true,
            default: 0
        },
        total_lesson_this_level: {
            type: Number,
            required: true,
            default: 0
        },
        location: {
            type: Schema.Types.ObjectId,
            ref: 'Location',
            required: true
        },
        level: {
            type: Schema.Types.ObjectId,
            ref: 'TeacherLevel',
            required: true
        },
        user: {
            type: Schema.Types.Mixed,
            index: true,
            required: true
        },
        is_reviewed: {
            type: Number,
            required: true,
            enum: EnumReviewStatus,
            default: 0
        },
        created_time: {
            type: Date
        },
        ref_code: {
            type: String
        },
        ref_by_teacher: {
            type: Schema.Types.Mixed
        },
        updated_time: Date
    },
    {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    }
);

TeacherSchema.virtual('user_info', {
    ref: 'User',
    localField: 'user_id',
    foreignField: 'id',
    justOne: true
});

TeacherSchema.virtual('staff', {
    ref: 'Admin',
    localField: 'staff_id',
    foreignField: 'id',
    justOne: true
});

TeacherSchema.virtual('teacher_salary', {
    ref: 'TeacherSalary',
    localField: 'user_id',
    foreignField: 'teacher_id',
    justOne: true,
    options: {
        sort: { created_time: -1 }
    }
});

TeacherSchema.virtual('trial_teacher', {
    ref: 'TrialTeacher',
    localField: 'user_id',
    foreignField: 'teacher_id',
    justOne: true
});

export const TeacherModel = model<Teacher>(
    DOCUMENT_NAME,
    TeacherSchema,
    COLLECTION_NAME
);
