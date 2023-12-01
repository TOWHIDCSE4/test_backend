import { Schema, Document, model, Mongoose } from 'mongoose';

const DOCUMENT_NAME = 'Appotapay-history';
const COLLECTION_NAME = 'appotapay-history';

const AppotapaySchema = new Schema(
    {
        data: {}
    },
    { timestamps: true }
);

export const AppotapayModel = model<any>(
    DOCUMENT_NAME,
    AppotapaySchema,
    COLLECTION_NAME
);
