import { Schema, Document, model } from 'mongoose';
export const DOCUMENT_NAME = 'Contact';
export const COLLECTION_NAME = 'contacts';

import Department from './department';

export default interface Contact extends Document {
    contact_name: string;
    phone: string;
    email: string;
    course: string;
    content: string;
    created_time?: Date;
    updated_time?: Date;
    change_time?: Date;
    department: Department;
}

const ContactSchema = new Schema({
    contact_name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    },
    change_time: {
        type: Date
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },
    department_id: {
        type: Number
    }
});

export const ContactModel = model<Contact>(
    DOCUMENT_NAME,
    ContactSchema,
    COLLECTION_NAME
);
