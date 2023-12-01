import { Schema, Document, model } from 'mongoose';

import Course from './course';
import User from './user';

export const DOCUMENT_NAME = 'ScheduledMemo';
export const COLLECTION_NAME = 'scheduled-memos';

export interface Assessment {
    point: number;
    comment?: string;
}

export enum EnumScheduledMemoType {
    MONTHLY = 1,
    COURSE = 2
}

export interface SegmentPoint {
    start_time: number;
    end_time: number;
    attendance_point?: number;
    attitude_point?: number;
    homework_point?: number;
    exam_result?: number;
}

export default interface ScheduledMemo extends Document {
    id: number;
    student_id: number;
    type: EnumScheduledMemoType;
    month?: number;
    year?: number;
    course_id?: number;
    teacher_id?: number;
    registered_class: number;
    completed_class: number;
    attendance: Assessment;
    attitude: Assessment;
    homework: Assessment;
    exam_result: number;
    segments: SegmentPoint[];
    student_start_level?: number;
    student_current_level?: number;
    curriculum_for_next_course?: string;
    teacher_note?: string;
    admin_note?: string;
    teacher_commented: boolean;
    report_link?: string;
    student: User;
    teacher?: User;
    course?: Course;
    created_time?: Date;
    updated_time?: Date;
}

const ScheduledMemoSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    student_id: {
        type: Number,
        index: true,
        required: true,
        immutable: true
    },
    type: {
        type: Number,
        enum: EnumScheduledMemoType,
        index: true,
        required: true,
        immutable: true
    },
    month: {
        type: Number,
        min: 1,
        max: 12,
        index: true,
        immutable: true
    },
    year: {
        type: Number,
        min: 2016,
        index: true,
        immutable: true
    },
    course_id: {
        type: Number,
        index: true,
        immutable: true
    },
    teacher_id: {
        type: Number,
        index: true
    },
    registered_class: {
        type: Number,
        required: true
    },
    completed_class: {
        type: Number,
        required: true
    },
    attendance: {
        point: {
            type: Number,
            required: true
        },
        comment: {
            type: String
        }
    },
    attitude: {
        point: {
            type: Number,
            required: true
        },
        comment: {
            type: String
        }
    },
    homework: {
        point: {
            type: Number
            // required: true
        },
        comment: {
            type: String
        }
    },
    exam_result: {
        type: Number
        // required: true
    },
    segments: Schema.Types.Mixed,
    student_start_level: {
        type: Number,
        index: true
    },
    student_current_level: {
        type: Number,
        index: true
    },
    teacher_note: {
        type: String
    },
    admin_note: {
        type: String
    },
    teacher_commented: {
        type: Boolean,
        index: true,
        required: true,
        default: false
    },
    report_link: {
        type: String,
        index: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course'
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

ScheduledMemoSchema.index(
    { student_id: 1, month: 1, year: 1, course_id: 1 }, //@ts-ignore
    { unique: true }
);

export const ScheduledMemoModel = model<ScheduledMemo>(
    DOCUMENT_NAME,
    ScheduledMemoSchema,
    COLLECTION_NAME
);
