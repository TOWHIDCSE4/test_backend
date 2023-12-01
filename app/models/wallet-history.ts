import { Schema, Document, model } from 'mongoose';
import Wallet from './wallet';
import User from './user';
export const DOCUMENT_NAME = 'WalletHistory';
export const COLLECTION_NAME = 'wallet-histories';

export enum EnumWalletHistoryType {
    DEPOSIT = 0,
    WITHDRAW = 1
}

export enum EnumWalletHistoryStatus {
    FAILED = 0,
    DONE = 1,
    PROCESSING = 2,
    PENDING = 3,
    CANCEL = 4,
    REJECTED = 5
}

export const OrderSource = {
    BANK: 'BANK',
    VISA: 'VISA',
    CC_APPOTAPAY: 'CC_APPOTAPAY',
    ATM_APPOTAPAY: 'ATM_APPOTAPAY',
    BANK_APPOTAPAY: 'BANK_APPOTAPAY',
    EWALLET_APPOTAPAY: 'EWALLET_APPOTAPAY'
};
export const HistoryAction = {
    DEPOSIT: 'DEPOSIT',
    WITHDRAW: 'WITHDRAW',
    MARK_PAID: 'MARK_PAID',
    ACCEPT_DEPOSIT: 'ACCEPT_DEPOSIT',
    CANCEL_DEPOSIT: 'CANCEL_DEPOSIT',
    REJECT_DEPOSIT: 'REJECT_DEPOSIT'
};

export default interface WalletHistory extends Document {
    user_id: number;
    wallet?: Wallet;
    description: String;
    code: String;
    type: EnumWalletHistoryType;
    source: String;
    source_data: Object;
    history: Array<any>;
    transactionId: String;
    price: number;
    coin: number;
    status: EnumWalletHistoryStatus;
    created_time?: Date;
    updated_time?: Date;
}

const WalletHistorySchema = new Schema({
    user_id: {
        type: Number,
        index: true,
        required: true,
        immutable: true
    },
    wallet: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet'
    },
    description: {
        type: String
    },
    code: {
        type: String
    },
    type: {
        type: EnumWalletHistoryType
    },
    source: {
        type: String
    },
    source_data: {
        type: Object
    },
    history: {
        type: Array
    },
    transactionId: {
        type: String
    },
    price: {
        type: Number
    },
    coin: {
        type: Number
    },
    status: {
        type: EnumWalletHistoryStatus
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const WalletHistoryModel = model<WalletHistory>(
    DOCUMENT_NAME,
    WalletHistorySchema,
    COLLECTION_NAME
);
