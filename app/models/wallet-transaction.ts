import { Schema, Document, model } from 'mongoose';
import Wallet from './wallet';
export const DOCUMENT_NAME = 'WalletTransaction';
export const COLLECTION_NAME = 'wallet-transactions';

export enum EnumTransactionType {
    IN = 0,
    OUT = 1
}

export enum EnumTransactionStatus {
    FAILED = 0,
    DONE = 1,
    PROCESSING = 2
}

export const TransactionSource = {
    MANUAL: 'MANUAL',
    BANK: 'BANK',
    VISA: 'VISA',
    CC_APPOTAPAY: 'CC_APPOTAPAY',
    ATM_APPOTAPAY: 'ATM_APPOTAPAY',
    BANK_APPOTAPAY: 'BANK_APPOTAPAY',
    EWALLET_APPOTAPAY: 'EWALLET_APPOTAPAY'
};

export default interface WalletTransaction extends Document {
    old_balance: Number;
    new_balance: Number;
    price: number;
    coin: number;
    user_id: String;
    wallet_id: String;
    description: String;
    type: EnumTransactionType;
    status: EnumTransactionStatus;
    payment_id?: string;
    payment_type?: number;
    error_text?: string;
    created_time?: Date;
    updated_time?: Date;
}

const WalletTransactionSchema = new Schema({
    old_balance: {
        type: Number
    },
    new_balance: {
        type: Number
    },
    price: {
        type: Number
    },
    coin: {
        type: Number
    },
    user_id: {
        type: Number,
        index: true,
        required: true,
        immutable: true
    },
    wallet_id: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet'
    },
    description: {
        type: String
    },
    type: {
        type: EnumTransactionType
    },
    source: {
        name: String,
        id: String
    },
    status: {
        type: EnumTransactionStatus
    },
    payment_id: {
        type: String
    },
    payment_type: {
        type: Number
    },
    error_text: {
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

export const WalletTransactionModel = model<WalletTransaction>(
    DOCUMENT_NAME,
    WalletTransactionSchema,
    COLLECTION_NAME
);
