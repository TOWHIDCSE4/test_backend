import { model, Schema, Document } from 'mongoose';

export const DOCUMENT_NAME = 'CMSHamiaMeetPlusInfo';
export const COLLECTION_NAME = 'cms-hamia-meet-plus-info';

export default interface CMSHamiaMeetPlusInfo extends Document {
    id: number;
    booking_id: number;
    student_id: number;
    teacher_id: number;
    cms_student_id: number;
    cms_student_username: string;
    cms_teacher_id: number;
    cms_teacher_username: string;
    cms_room_id: number;
    cms_room_name: string;
    cms_student_room_id: number;
    cms_teacher_room_id: string;
    cms_student_room_token_id: number;
    cms_student_room_token: string;
    cms_teacher_room_token_id: number;
    cms_teacher_room_token: string;
    cms_room_schedule_id?: number;
    created_time?: Date;
    updated_time?: Date;
}

const AdminSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    booking_id: {
        type: Number,
        index: true,
        required: true
    },
    student_id: {
        type: Number,
        index: true,
        required: true
    },
    teacher_id: {
        type: Number,
        index: true,
        required: true
    },
    cms_student_id: {
        type: Number,
        required: true
    },
    cms_student_username: {
        type: String,
        required: true
    },
    cms_teacher_id: {
        type: Number,
        required: true
    },
    cms_teacher_username: {
        type: String,
        required: true
    },
    cms_room_id: {
        type: Number,
        required: true
    },
    cms_room_name: {
        type: String,
        required: true
    },
    cms_student_room_id: {
        type: Number,
        required: true
    },
    cms_teacher_room_id: {
        type: Number,
        required: true
    },
    cms_student_room_token_id: {
        type: Number,
        required: true
    },
    cms_student_room_token: {
        type: String,
        required: true
    },
    cms_teacher_room_token_id: {
        type: Number,
        required: true
    },
    cms_teacher_room_token: {
        type: String,
        required: true
    },
    cms_room_schedule_id: {
        type: Number
    },
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

export const CMSHamiaMeetPlusInfoModel = model<CMSHamiaMeetPlusInfo>(
    DOCUMENT_NAME,
    AdminSchema,
    COLLECTION_NAME
);
