import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'customer_support_student';
export const COLLECTION_NAME = 'customer_support_student';

export default interface Student extends Document {
    user_id: number;
    staff_id?: number;
    supporter: {};
    ref: {};
    customer_care: {};
}

const CustomerSupportStudentSchema = new Schema(
    {
        user_id: {
            type: Number, // Ref to user_id in user schema
            unique: true,
            required: true
        },
        supporter: {
            type: Object,
            index: true
        },
        ref: {
            type: Object,
            index: true
        },
        customer_care: {
            type: Object,
            index: true
        },
        created_time: {
            type: Date,
            index: true,
            immutable: true
        },
        updated_time: Date
    },
    {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    }
);

export const CustomerSupportStudentModel = model<Student>(
    DOCUMENT_NAME,
    CustomerSupportStudentSchema,
    COLLECTION_NAME
);
