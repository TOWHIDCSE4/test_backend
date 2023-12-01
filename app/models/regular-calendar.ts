import { Schema, Document, model } from 'mongoose';

import Course from './course';
import OrderedPackage from './ordered-package';
import { EnumAlertType } from '../const/package';
import User from './user';
import Unit from './unit';

export const DOCUMENT_NAME = 'RegularCalendar';
export const COLLECTION_NAME = 'regular-calendar';

export default interface RegularCalendar extends Document {
    id: number;
    student_id: number;
    teacher_id: number;
    course_id: number;
    ordered_package_id: number;
    regular_start_time: number;
    status: number;
    cancel_reason?: string;
    admin_note?: string;
    student: User;
    teacher: User;
    course: Course;
    ordered_package: OrderedPackage;
    alerted: EnumAlertType[];
    ispeak_regular_id?: number;
    auto_schedule: any;
    auto_schedule_history: any;
    finish_at?: Date;
    unit_id?: number;
    unit?: any;
    created_time?: Date;
    updated_time?: Date;
}

export enum EnumRegularCalendarStatus {
    ACTIVE = 1,
    ACTIVE_TEACHER_REQUEST_CANCELING = 2,
    ADMIN_CANCEL = 3,
    TEACHER_CANCEL = 4,
    EXPIRED = 5 /** Order expired */,
    FINISHED = 6 /** Student finish course */
}

/**
 * @TODO Should we put student, teacher, course here for references?
 * If so, let's do it later
 */

const RegularCalendarSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    student_id: {
        type: Number,
        required: true,
        immutable: true
    },
    teacher_id: {
        type: Number,
        required: true
    },
    course_id: {
        type: Number,
        required: true
    },
    ordered_package_id: {
        type: Number,
        required: true
    },
    regular_start_time: {
        type: Number,
        required: true
    },
    status: {
        type: Number,
        enum: EnumRegularCalendarStatus,
        default: EnumRegularCalendarStatus.ACTIVE
    },
    cancel_reason: {
        type: String
    },
    admin_note: {
        type: String
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    ordered_package: {
        type: Schema.Types.ObjectId,
        ref: 'OrderedPackage',
        required: true
    },
    alerted: [
        {
            type: Number,
            enum: EnumAlertType
        }
    ],
    auto_schedule: {
        time: { type: Date },
        success: { type: Boolean },
        message: { type: String },
        booking_id: { type: Number },
        meta_data: {}
    },
    auto_schedule_history: {
        type: Array
    },
    ispeak_regular_id: {
        type: Number
    },
    finish_at: {
        type: Date
    },
    unit_id: {
        type: Number
    },
    unit: {
        type: Schema.Types.ObjectId,
        ref: 'Unit'
    },
    created_time: {
        type: Date
    },
    updated_time: {
        type: Date
    }
});

RegularCalendarSchema.index(
    { student_id: 1, teacher_id: 1, regular_start_time: 1, course_id: 1 }, // @ts-ignore
    { unique: true }
);

export const RegularCalendarModel = model<RegularCalendar>(
    DOCUMENT_NAME,
    RegularCalendarSchema,
    COLLECTION_NAME
);
