import { Schema, Document, model } from 'mongoose';
import User from './user';
export const DOCUMENT_NAME = 'Wallet';
export const COLLECTION_NAME = 'wallets';
export const POINT_VND_RATE = 100;

export default interface Wallet extends Document {
    total_balance: number;
    user_id: number;
    token_alepay: String;
    user: User;
    created_time?: Date;
    updated_time?: Date;
}

const WalletSchema = new Schema({
    total_balance: {
        type: Number,
        required: true
    },
    token_alepay: {
        type: String
    },
    user_id: {
        type: Number,
        index: true,
        required: true,
        immutable: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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

export const WalletModel = model<Wallet>(
    DOCUMENT_NAME,
    WalletSchema,
    COLLECTION_NAME
);
