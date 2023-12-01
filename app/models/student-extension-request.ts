import { Schema, Document, model } from 'mongoose';

import OrderedPackage from './ordered-package';
import User from './user';

export const DOCUMENT_NAME = 'StudentExtensionRequest';
export const COLLECTION_NAME = 'student-extension-requests';

export enum EnumStudentExtensionRequestStatus {
    PENDING = 1,
    REJECTED = 2,
    APPROVED = 3
}

export default interface StudentExtensionRequest extends Document {
    id: number;
    student_id: number;
    number_of_days: number;
    ordered_package_id: number;
    status: EnumStudentExtensionRequestStatus;
    price: number;
    coin: number;
    student: User;
    ordered_package: OrderedPackage;
    student_note?: string;
    admin_note?: string;
    created_time?: Date;
    updated_time?: Date;
    proof_files?: any;
}

const StudentExtensionRequestSchema = new Schema({
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
    number_of_days: {
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
        enum: EnumStudentExtensionRequestStatus,
        default: EnumStudentExtensionRequestStatus.PENDING,
        required: true
    },
    price: {
        type: Number,
        index: true,
        required: true
    },
    coin: {
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
    proof_files: {
        type: Array
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const StudentExtensionRequestModel = model<StudentExtensionRequest>(
    DOCUMENT_NAME,
    StudentExtensionRequestSchema,
    COLLECTION_NAME
);
