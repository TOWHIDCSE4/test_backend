import { model, Schema, Document } from 'mongoose';

export const DOCUMENT_NAME = 'OperationIssue';
export const COLLECTION_NAME = 'operation-issue';

export enum EnumStatus {
    NOT_RESOLVED = 0,
    RESOLVED = 1
}

export interface OperationIssue extends Document {
    booking_id?: number;
    issue_description?: string;
    status?: number;
    resolved_staff_id?: number;
    resolved_time?: number;
}

const OperationIssueSchema = new Schema(
    {
        booking_id: {
            type: Number,
            index: true,
            default: null
        },
        issue_description: {
            type: String,
            trim: true,
            default: ''
        },
        status: {
            type: Number,
            index: true,
            required: true,
            default: 0
        },
        resolved_staff_id: {
            type: Number,
            index: true,
            default: null
        },
        resolved_time: {
            type: Number,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: 'created_time',
            updatedAt: 'updated_time'
        }
    }
);

const OperationIssueModel = model<OperationIssue>(
    DOCUMENT_NAME,
    OperationIssueSchema,
    COLLECTION_NAME
);

export default OperationIssueModel;
