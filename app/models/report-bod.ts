import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'ReportBOD';
export const COLLECTION_NAME = 'report-bod';

export default interface ReportBOD extends Document {
    date: number;
    total_booked: number;
    total_done: number;
    total_done_ca: number;
    total_done_vn: number;
    total_done_bn: number;
    total_not_done: number;
    total_student_absent: number;
    total_student_cancel: number;
    total_teacher_absent: number;
    total_teacher_cancel: number;
    total_trial_booked: number;
    total_trial_done: number;
    list_top_10_teacher: any;
    cost_ca: number;
    rate_ca_vnd: number;
    total_cost_ca: number;
    cost_vn: number;
    rate_vn_vnd: number;
    total_cost_vn: number;
    cost_bn: number;
    rate_bn_vnd: number;
    total_cost_bn: number;
    total_cost: number;
    cost_120: number;
    revenue_day: number;
    cost_revenue_day: number;
    created_time?: Date;
    updated_time?: Date;
}

const ReportBODSchema = new Schema({
    date: {
        type: Number,
        required: true
    },
    total_booked: {
        type: Number,
        required: true
    },
    total_done: {
        type: Number,
        required: true
    },
    total_done_ca: {
        type: Number,
        required: true
    },
    total_done_vn: {
        type: Number,
        required: true
    },
    total_done_bn: {
        type: Number,
        required: true
    },
    total_not_done: {
        type: Number,
        required: true
    },
    total_student_absent: {
        type: Number,
        required: true
    },
    total_student_cancel: {
        type: Number,
        required: true
    },
    total_teacher_absent: {
        type: Number,
        required: true
    },
    total_teacher_cancel: {
        type: Number,
        required: true
    },
    total_trial_booked: {
        type: Number,
        required: true
    },
    total_trial_done: {
        type: Number,
        required: true
    },
    list_top_10_teacher: {
        type: Array,
        required: true
    },
    cost_ca: {
        type: Number,
        required: true
    },
    rate_ca_vnd: {
        type: Number,
        required: true
    },
    total_cost_ca: {
        type: Number,
        required: true
    },
    cost_vn: {
        type: Number,
        required: true
    },
    total_cost_vn: {
        type: Number,
        required: true
    },
    cost_bn: {
        type: Number,
        required: true
    },
    rate_bn_vnd: {
        type: Number,
        required: true
    },
    total_cost_bn: {
        type: Number,
        required: true
    },
    total_cost: {
        type: Number,
        required: true
    },
    cost_120: {
        type: Number,
        required: true
    },
    revenue_day: {
        type: Number,
        required: true
    },
    cost_revenue_day: {
        type: Number,
        required: true
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const ReportBODModel = model<ReportBOD>(
    DOCUMENT_NAME,
    ReportBODSchema,
    COLLECTION_NAME
);
