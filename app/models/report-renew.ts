import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'ReportReNew';
export const COLLECTION_NAME = 'report-renew';

export default interface ReportReNew extends Document {
    date: number;
    staff_id: number;
    staff_name: string;
    students_renew: any;
    total_revenue_renew: number;
    students_extend: any;
    total_revenue_extend: number;
    students_exprire: any;
    created_time?: Date;
    updated_time?: Date;
}

const ReportReNewSchema = new Schema({
    date: {
        type: Number,
        required: true
    },
    staff_id: {
        type: Number,
        required: true
    },
    staff_name: {
        type: String,
        required: true
    },
    students_renew: {
        type: Array,
        required: true
    },
    total_revenue_renew: {
        type: Number,
        required: true
    },
    students_extend: {
        type: Array,
        required: true
    },
    total_revenue_extend: {
        type: Number,
        required: true
    },
    students_exprire: {
        type: Array,
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

export const ReportReNewModel = model<ReportReNew>(
    DOCUMENT_NAME,
    ReportReNewSchema,
    COLLECTION_NAME
);
