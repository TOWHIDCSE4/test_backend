import { Schema, Document, model, Mongoose } from 'mongoose';

const DOCUMENT_NAME = 'Role';
const COLLECTION_NAME = 'roles';

export type RoleDocument = Role & Document;

export default class Role {
    _id?: string;
    id?: number;
    code?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    canUpdate?: boolean;
    createdAt?: number;
    createdBy?: string;
    updatedAt?: number;
    updatedBy?: string;

    constructor(props: Partial<Role>) {
        Object.assign(this, props);
    }
}

const RoleSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    code: {
        type: String,
        index: true
    },
    name: {
        type: String
    },
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    canUpdate: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Number,
        default: Date.now
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    updatedAt: {
        type: Number
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

export const RoleModel = model<RoleDocument>(
    DOCUMENT_NAME,
    RoleSchema,
    COLLECTION_NAME
);
