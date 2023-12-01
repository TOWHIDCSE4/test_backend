import { Schema, Document, model } from 'mongoose';
import Booking from './booking';
import Curriculum from './curriculum';

import {
    ENUM_MEMO_NOTE_FIELD,
    ENUM_MEMO_OTHER_NOTE_FIELD,
    IOriginMemo,
    MAX_ASSESSMENT_POINT
} from '../const/memo';

export const DOCUMENT_NAME = 'TrialBooking';
export const COLLECTION_NAME = 'trial-booking';

export interface TrialAssessment {
    keyword: string;
    point: number;
    comment: string;
}

export enum EnumTrialBookingStatus {
    CREATED_FOR_LEARNING = 1,
    SUCCESS = 2,
    FAIL_BY_STUDENT = 3,
    FAIL_BY_TEACHER = 4,
    FAIL_BY_TECHNOLOGY = 5,
    CHANGE_TIME = 6
}

export enum EnumRecommendationType {
    KINDERGARTEN = 1,
    KIDS = 2,
    TEENS = 3,
    ADULT = 4
}

export default interface TrialBooking extends Document {
    booking_id: number;
    booking: Booking;
    status: EnumTrialBookingStatus;
    memo?: IOriginMemo;
    admin_assessment?: TrialAssessment[];
    recommendation_type?: EnumRecommendationType;
    curriculum_id?: number;
    curriculum?: Curriculum;
    recommendation_letter_link?: string;
    created_time?: Date;
    updated_time?: Date;
}

const TrialBookingSchema = new Schema({
    booking_id: {
        type: Number,
        required: true,
        index: true,
        immutable: true
    },
    booking: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    status: {
        type: Number,
        enum: EnumTrialBookingStatus,
        index: true,
        required: true,
        default: EnumTrialBookingStatus.CREATED_FOR_LEARNING
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
    admin_assessment: {
        type: [
            {
                keyword: {
                    type: String,
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
        ]
    },
    recommendation_type: {
        type: Number,
        enum: EnumRecommendationType
    },
    curriculum_id: {
        type: Number
    },
    curriculum: {
        type: Schema.Types.ObjectId,
        ref: 'Curriculum'
    },
    recommendation_letter_link: {
        type: String,
        index: true
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    },
});

export const TrialBookingModel = model<TrialBooking>(
    DOCUMENT_NAME,
    TrialBookingSchema,
    COLLECTION_NAME
);
