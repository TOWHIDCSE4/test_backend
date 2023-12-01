import { Schema, Document, model } from 'mongoose';
import User from './user';
import Course from './course';
import Calendar from './calendar';
import Unit from './unit';
import OrderedPackage from './ordered-package';
import Report from './report';
import { EnumAlertType } from '../const/package';
import {
    ENUM_MEMO_NOTE_FIELD,
    ENUM_MEMO_OTHER_NOTE_FIELD,
    IOriginMemo,
    MAX_ASSESSMENT_POINT
} from '../const/memo';
import AdviceLetter from './advice-letter';

export const DOCUMENT_NAME = 'Booking';
export const COLLECTION_NAME = 'bookings';

//1: completed, 2: pending, 3: confirmed, 4: teaching, 5: student_absent, 6: teacher_absent, 7: cancel_by_student, 8: cancel_by_teacher

export enum EnumBookingStatus {
    COMPLETED = 1,
    PENDING = 2,
    CONFIRMED = 3,
    TEACHING = 4,
    STUDENT_ABSENT = 5,
    TEACHER_ABSENT = 6,
    CANCEL_BY_STUDENT = 7,
    CANCEL_BY_TEACHER = 8,
    CANCEL_BY_ADMIN = 9,
    TEACHER_CONFIRMED = 10,
    CHANGE_TIME = 11
}

export enum EnumBookingMediumType {
    HAMIA_MEET = 1,
    SKYPE = 2
}

export default interface Booking extends Document {
    id: number;
    student_id: number;
    teacher_id: number;
    course_id: number;
    ordered_package_id: number;
    calendar_id: number;
    unit_id: number;
    calendar: Calendar;
    student_note?: string;
    teacher_note?: string;
    admin_note?: string;
    cskh_note?: string;
    status: number;
    reason?: string;
    started_at?: number;
    finished_at?: number;
    reported_absence_at?: number;
    student_rating?: number;
    memo?: IOriginMemo;
    admin_unit_lock?: boolean;
    is_regular_booking: boolean;
    record_link?: any;
    learning_medium: {
        medium_type: EnumBookingMediumType;
        info?: any;
    };
    homework?: any;
    student: User;
    teacher: User;
    course: Course;
    ordered_package: OrderedPackage;
    unit: Unit;
    best_memo?: boolean;
    is_late?: boolean;
    late_memo?: boolean;
    report?: Report;
    alerted: EnumAlertType[];
    substitute_for_teacher_id?: number;
    ispeak_booking_id?: number;
    source?: string;
    test_topic_id?: number;
    test_result_id?: number;
    test_result_code?: string;
    test_result: any;
    test_start_time: number;
    test_topic_name?: string;
    trial_test_url?: string;
    schedule_teacher_id?: number;
    is_show_hmp?: boolean;
    created_time?: Date;
    updated_time?: Date;
    advice_letter?: AdviceLetter;
}

const BookingSchema = new Schema({
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
        required: true
    },
    teacher_id: {
        type: Number,
        index: true,
        required: true
    },
    course_id: {
        type: Number,
        index: true,
        required: true
    },
    ordered_package_id: {
        type: Number,
        index: true,
        required: true
    },
    unit_id: {
        type: Number,
        index: true,
        required: true
    },
    calendar_id: {
        type: Number,
        required: true
    },
    calendar: {
        type: Schema.Types.Mixed,
        required: true
    },
    student_note: {
        type: String
    },
    teacher_note: {
        type: String
    },
    admin_note: {
        type: String
    },
    cskh_note: {
        type: String
    },
    status: {
        type: Number,
        index: true,
        required: true,
        enum: EnumBookingStatus,
        default: 2
    },
    started_at: {
        type: Number
    },
    finished_at: {
        type: Number
    },
    reported_absence_at: {
        type: Number
    },
    student_rating: {
        type: Number,
        index: true,
        enum: [1, 2, 3, 4, 5]
    },
    memo: {
        note: {
            type: [
                {
                    keyword: {
                        type: String,
                        enum: ENUM_MEMO_NOTE_FIELD,
                        required: true
                    },
                    point: {
                        type: Number,
                        required: true,
                        default: 0,
                        min: 0,
                        max: MAX_ASSESSMENT_POINT
                    },
                    comment: {
                        type: String
                    }
                }
            ],
            default: []
        },
        other: {
            type: [
                {
                    keyword: {
                        type: String,
                        enum: ENUM_MEMO_OTHER_NOTE_FIELD,
                        required: true
                    },
                    comment: {
                        type: String
                    }
                }
            ],
            default: []
        },
        student_starting_level: {
            id: {
                type: Number
            },
            name: {
                type: String
            }
        },
        created_time: Date
    },
    admin_unit_lock: {
        type: Boolean,
        default: false
    },
    is_regular_booking: {
        type: Boolean,
        default: false
    },
    record_link: Object,
    learning_medium: {
        type: {
            medium_type: {
                type: Number,
                required: true,
                enum: EnumBookingMediumType,
                default: EnumBookingMediumType.HAMIA_MEET
            },
            info: {
                type: Schema.Types.Mixed
            }
        }
    },
    test_result: Object,
    homework: {
        type: Object // when lesson absent or cancel
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
    unit: {
        type: Schema.Types.ObjectId,
        ref: 'Unit',
        required: true
    },
    reason: {
        type: String // when lesson absent or cancel
    },
    best_memo: {
        type: Boolean,
        default: false
    },
    is_late: {
        type: Boolean,
        default: false
    },
    report: {
        type: Schema.Types.ObjectId,
        ref: 'Report'
    },
    alerted: [
        {
            type: Number,
            enum: EnumAlertType,
            index: true
        }
    ],
    substitute_for_teacher_id: {
        type: Number
    },
    ispeak_booking_id: {
        type: Number
    },
    source: {
        type: String
    },
    test_topic_id: {
        type: Number
    },
    test_result_id: {
        type: Number
    },
    test_result_code: {
        type: String
    },
    test_start_time: {
        type: Number
    },
    test_topic_name: {
        type: String
    },
    trial_test_url: {
        type: String
    },
    schedule_teacher_id: {
        type: Number
    },
    is_show_hmp: {
        type: Boolean,
        default: false
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date,
    advice_letter: {
        type: Schema.Types.ObjectId,
        ref: 'AdviceLetter',
        index: true,
    },
});

export const BookingModel = model<Booking>(
    DOCUMENT_NAME,
    BookingSchema,
    COLLECTION_NAME
);
