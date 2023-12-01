import { Schema, Document, model } from 'mongoose';
import Department from './department';
import Admin from './admin';

const DOCUMENT_NAME = 'Team';
const COLLECTION_NAME = 'teams';

export default interface Team extends Document {
    id: number;
    name: string;
    description?: string;
    department: Department;
    leader: Admin;
    members: Admin[];
    isActive: boolean;
    createdAt?: number;
}

const TeamSchema = new Schema({
    id: {
        type: Number,
        index: true
    },
    name: {
        type: String
    },
    description: {
        type: String
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },
    leader: {
        type: Schema.Types.ObjectId,
        ref: 'Admin'
    },
    members: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Admin'
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Number,
        default: Date.now
    }
});

export const TeamModel = model<Team>(
    DOCUMENT_NAME,
    TeamSchema,
    COLLECTION_NAME
);
