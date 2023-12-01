import { Schema, Document, model, Mongoose } from 'mongoose';

const DOCUMENT_NAME = 'Alepay-history';
const COLLECTION_NAME = 'alepay-history';

const AlepaySchema = new Schema(
    {
        data: {}
    },
    { timestamps: true }
);

export const AlepayModel = model<any>(
    DOCUMENT_NAME,
    AlepaySchema,
    COLLECTION_NAME
);
