import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'MergedPackage';
export const COLLECTION_NAME = 'merged-package';

export enum EnumMergedPackageStatus {
    ACTIVE = 1,
    INACTIVE = 2
}

export default interface MergedPackage extends Document {
    student_id: number;
    package_one_id: number;
    package_two_id: number;
    status: EnumMergedPackageStatus;
    created_time?: Date;
    updated_time?: Date;
}
const MergedPackageSchema = new Schema({
    student_id: {
        type: Number,
        required: true
    },
    package_one_id: {
        type: Number,
        required: true
    },
    package_two_id: {
        type: Number,
        required: true
    },
    status: {
        type: Number,
        required: true,
        enum: EnumMergedPackageStatus
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

export const MergedPackageModel = model<MergedPackage>(
    DOCUMENT_NAME,
    MergedPackageSchema,
    COLLECTION_NAME
);
