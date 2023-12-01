import { Schema, Document, model } from 'mongoose';

import OrderedPackage from './ordered-package';
import User from './user';

export const DOCUMENT_NAME = 'StudentReservationRequest';
export const COLLECTION_NAME = 'student-reservation-requests';

export enum EnumStudentReservationRequestStatus {
    PENDING = 1,
    REJECT_BY_ADMIN = 2,
    APPROVED = 3,
    PAID = 4,
    CANCEL = 5
}

export default interface StudentReservationRequest extends Document {
    id: number;
    student_id: number;
    start_time: number;
    end_time: number;
    ordered_package_id: number;
    status: EnumStudentReservationRequestStatus;
    price: number;
    student: User;
    ordered_package: OrderedPackage;
    student_note?: string;
    admin_note?: string;
    created_time?: Date;
    updated_time?: Date;
}

const StudentReservationRequestSchema = new Schema({
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
    start_time: {
        type: Number,
        index: true,
        required: true
    },
    end_time: {
        type: Number,
        index: true,
        required: true
    },
    ordered_package_id: {
        type: Number,
        index: true,
        required: true
    },
    status: {
        type: Number,
        enum: EnumStudentReservationRequestStatus,
        default: EnumStudentReservationRequestStatus.PENDING,
        required: true
    },
    price: {
        type: Number,
        index: true,
        required: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ordered_package: {
        type: Schema.Types.ObjectId,
        ref: 'OrderedPackage',
        required: true
    },
    student_note: {
        type: String
    },
    admin_note: {
        type: String
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const StudentReservationRequestModel = model<StudentReservationRequest>(
    DOCUMENT_NAME,
    StudentReservationRequestSchema,
    COLLECTION_NAME
);
