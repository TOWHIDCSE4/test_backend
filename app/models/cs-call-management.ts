import { Schema, Document, model } from 'mongoose';
import Admin from './admin';

export const DOCUMENT_NAME = 'cs_call_management';
export const COLLECTION_NAME = 'cs_call_management';

export enum EnumRegularCare {
    WAITING_NEXT_BOOKING = 3,
    NOT_DONE = 1,
    DONE = 2
}

export enum TestType {
    MID = 'MID',
    FINAL = 'FINAL'
}

export enum CallType {
    GREETING = 'greeting',
    CHECKING = 'checking',
    UPCOMING_TEST = 'upcoming_test',
    TEST_REPORTS = 'test_reports',
    PERIODIC_REPORTS = 'periodic_reports',
    OBSERVATION = 'observation'
}

export const CHECKING_CALL = {
    LIST_LESSONS_STUDENT_COMPLETES: [3]
};

export const UPCOMING_TEST = {
    LIST_LESSONS_STUDENT_COMPLETES: [12, 26, 41, 56, 71, 86, 101, 116]
};

export const TEST_REPORTS = {
    LIST_LESSONS_STUDENT_COMPLETES: [15, 30, 45, 60, 75, 90, 105, 120]
};

export const REGULAR_TEST = {
    LIST_LESSONS_STUDENT_COMPLETES: [15, 30, 45, 60, 75, 90, 105, 120]
};

export const REGULAR_TEST_DISPLAY_ORDER = [14, 29, 44, 59, 74, 89, 104, 119];

export const PERIODIC_REPORTS = {
    LIST_LESSONS_STUDENT_COMPLETES: [20, 40, 70, 90]
};
export const OBSERVATION = {
    LIST_LESSONS_CAN_OBSERVE: [1, 12, 41, 56, 86]
};

export enum EnumDetailGreeting {
    NOT_DONE = 1,
    DONE = 2
}

export const STATUS = {
    NONE: '',
    GOOD: 'good',
    NOT_GOOD: 'not_good',
    DIFFICULT: 'difficult',
    SUITABLE: 'suitable',
    EASY: 'easy',
    NORMAL: 'normal',
    UNDERSTOOD: 'understood',
    NOT_UNDERSTOOD: 'not_understood'
};

export const NONE = '';

export enum EnumPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    URGENT = 4
}

export enum REPORT_UPLOAD_STATUS {
    ALL = '',
    NOT_DONE = 1,
    UPLOADER = 2
}

export enum EnumPeriodicType {
    PERIODIC = 1,
    END_TERM = 2,
    NONE = 3
}

export interface INoteHistory {
    note?: string;
    staff_id?: number;
    created_time?: Date;
}

export default interface CSCallManagement extends Document {
    student_user_id: number;
    ordered_package_id?: number;
    deadline: number;
    status: EnumRegularCare;
    booking_id?: number;
    lesson_index_in_course?: number;
    test_type?: string;
    call_type?: string;
    note_history?: any;
    detail_greeting?: any;
    detail_checking?: any;
    detail_test_reports?: any;
    detail_data?: any;
    input_level?: number;
    reporter_id?: number;
    periodic_report_id?: number;
    periodic_report_time?: number;
    priority?: EnumPriority;
    periodic_type?: EnumPeriodicType;
    periodic_sync_data?: boolean;
    periodic_number_completed?: number;
    periodic_number_absent?: number;
    created_time?: Date;
    updated_time?: Date;
}

const CSCallManagementSchema = new Schema({
    student_user_id: {
        type: Number,
        required: true,
        index: true
    },
    ordered_package_id: {
        type: Number,
        required: true
    },
    deadline: {
        type: Number,
        index: true
    },
    status: {
        type: Number,
        required: true,
        enum: EnumRegularCare,
        index: true,
        default: 1
    },
    note_history: {
        type: Array
    },
    booking_id: {
        type: Number
    },
    lesson_index_in_course: {
        type: Number
    },
    test_type: {
        type: String
    },
    call_type: {
        type: String
    },
    detail_greeting: {
        type: Object
    },
    detail_checking: {
        type: Object
    },
    detail_test_reports: {
        type: Object
    },
    detail_data: {
        type: Object
    },
    input_level: {
        type: Number,
        default: 0
    },
    reporter_id: {
        type: Number
    },
    periodic_report_id: {
        type: Number
    },
    periodic_report_time: {
        type: Number
    },
    periodic_type: {
        type: Number
    },
    priority: {
        type: EnumPriority,
        index: true,
        default: EnumPriority.NORMAL
    },
    periodic_sync_data: {
        type: Boolean
    },
    periodic_number_completed: {
        type: Number
    },
    periodic_number_absent: {
        type: Number
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const CSCallManagementModel = model<CSCallManagement>(
    DOCUMENT_NAME,
    CSCallManagementSchema,
    COLLECTION_NAME
);
