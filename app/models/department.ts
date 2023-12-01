import { Schema, Document, model } from 'mongoose';
import Admin from './admin';

const DOCUMENT_NAME = 'Department';
const COLLECTION_NAME = 'departments';

export enum EnumRole {
    Manager = 'manager',
    Deputy_manager = 'deputy_manager',
    Leader = 'leader',
    Staff = 'staff'
}
export interface DepamentOfAdmin {
    depament: Department;
    role: EnumRole[];
}

export interface PermissionOfMember {
    manager: [];
    deputy_manager: [];
    leader: [];
    staff: [];
}

export default interface Department extends Document {
    id: number;
    name: string;
    unsignedName: string;
    description?: string;
    canUpdateManager: boolean;
    canDelete: boolean;
    permissionOfMember: PermissionOfMember;
    isActive: boolean;
    createdAt?: number;
}

const DepartmentSchema = new Schema({
    id: {
        type: Number,
        unique: true
    },
    name: {
        type: String
    },
    unsignedName: {
        type: String,
        index: true
    },
    description: {
        type: String
    },
    permissionOfMember: {
        manager: [],
        deputy_manager: [],
        leader: [],
        staff: []
    },
    canUpdateManager: {
        type: Boolean,
        default: true
    },
    canDelete: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Number,
        default: Date.now
    }
});

export const DepartmentModel = model<Department>(
    DOCUMENT_NAME,
    DepartmentSchema,
    COLLECTION_NAME
);
