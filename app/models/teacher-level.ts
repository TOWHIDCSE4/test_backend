import { Schema, Document, model } from 'mongoose';

import Location from './location';

export const DOCUMENT_NAME = 'TeacherLevel';
export const COLLECTION_NAME = 'teacher-levels';

export default interface TeacherLevel extends Document {
    id: number;
    name: string;
    alias: string;
    is_active: boolean;
    hourly_rates: LocationRate[];
    min_calendar_per_circle: number;
    min_peak_time_per_circle: number;
    max_missed_class_per_circle: number;
    max_absent_request_per_circle: number;
    class_accumulated_for_promotion: number;
    created_time?: Date;
    updated_time?: Date;
}

export interface LocationRate {
    location_id: number;
    hourly_rate: number;
    location: Location;
}

const TeacherLevelSchema = new Schema({
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
        index: true,
        required: true
    },
    is_active: {
        type: Boolean,
        index: true,
        required: true
    },
    hourly_rates: {
        type: [
            {
                location_id: {
                    type: Number,
                    required: true
                },
                hourly_rate: {
                    type: Number,
                    required: true
                },
                location: {
                    type: Schema.Types.ObjectId,
                    ref: 'Location'
                }
            }
        ],
        required: true,
        default: []
    },
    min_calendar_per_circle: {
        type: Number,
        required: true
    },
    min_peak_time_per_circle: {
        type: Number,
        required: true
    },
    max_missed_class_per_circle: {
        type: Number,
        required: true,
        default: 0
    },
    max_absent_request_per_circle: {
        type: Number,
        required: true,
        default: 0
    },
    class_accumulated_for_promotion: {
        type: Number,
        required: true
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: Date
});

export const TeacherLevelModel = model<TeacherLevel>(
    DOCUMENT_NAME,
    TeacherLevelSchema,
    COLLECTION_NAME
);
