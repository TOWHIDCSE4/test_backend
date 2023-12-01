import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'ActionHistory';
export const COLLECTION_NAME = 'action-history';

export enum EnumParentType {
    PERIODIC_REPORT = 1,
    BOOKING = 2
}
export enum EnumTypeAction {
    PR_ADD_REPORT = 1,
    PR_ASSIGNED_ACADEMIC = 2,
    PR_CHANGE_REPORTER = 3,
    PR_UPDATE_STATUS = 4,
    PR_UPDATE_TYPE_REPORT = 5,
    PR_UPDATE_PRIORITY = 6,
    PR_UPDATE_LEVEL = 7,
    PR_SYNC_DATA = 8
}

export default interface ActionHistory extends Document {
    parent_type: number;
    parent_obj_id: string;
    user_action?: number;
    type: number;
    content?: string;
    data_old?: string;
    data_new?: string;
    created_time?: Date;
    updated_time?: Date;
}

const ActionHistorySchema = new Schema({
    parent_type: {
        type: Number,
        index: true,
        required: true
    },
    parent_obj_id: {
        type: String,
        index: true,
        required: true
    },
    type: {
        type: Number,
        index: true,
        required: true
    },
    content: {
        type: String
    },
    data_old: {
        type: String
    },
    data_new: {
        type: String
    },
    user_action: {
        type: Number,
        index: true
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const ActionHistoryModel = model<ActionHistory>(
    DOCUMENT_NAME,
    ActionHistorySchema,
    COLLECTION_NAME
);
