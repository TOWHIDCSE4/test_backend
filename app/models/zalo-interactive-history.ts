import { Schema, Document, model } from 'mongoose';
import Wallet from './wallet';
import User from './user';
import { boolean } from 'webidl-conversions';
export const DOCUMENT_NAME = 'ZaloInteractiveHistory';
export const COLLECTION_NAME = 'zalo-interactive-history';

export enum EnumEventType {
    SEND_MESSAGE = 1,
    SEND_IMAGE = 2,
    SEND_STICKER = 3,
    CARE = 4,
    CALL_AWAY = 5,
    SEND_ZALO_FAIL = 6
}

export enum EventType {
    SEND_MESSAGE = 'user_send_text',
    SEND_IMAGE = 'user_send_image',
    SEND_STICKER = 'user_send_sticker',
    CARE = 'follow',
    CALL_AWAY = 'user_call_oa'
}

export default interface ZaloInteractiveHistory extends Document {
    user_id: number;
    zalo_id?: string;
    interaction_time: number;
    last_event?: EnumEventType;
    student: User;
    sent_in_day: boolean;
    created_time?: Date;
    updated_time?: Date;
}

const ZaloInteractiveHistorySchema = new Schema({
    user_id: {
        type: Number,
        index: true,
        required: true
    },
    zalo_id: {
        type: String,
        index: true,
        required: true
    },
    interaction_time: {
        type: Number,
        required: true
    },
    last_event: {
        type: EnumEventType
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sent_in_day: {
        type: Boolean,
        default: false
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const ZaloInteractiveHistoryModel = model<ZaloInteractiveHistory>(
    DOCUMENT_NAME,
    ZaloInteractiveHistorySchema,
    COLLECTION_NAME
);
