import { Schema, Document, model, Mongoose } from 'mongoose';

const DOCUMENT_NAME = 'ScreenConfiguration';
const COLLECTION_NAME = 'screen-configuration';

export enum EnumScreenType {
    student_leave_request = 1
}

export const serverScreenConfig = {
    ADMIN: 'admin',
    WEBAPP: 'webapp'
};

export default interface ScreenConfig extends Document {
    _id?: string;
    server: string;
    screen: EnumScreenType;
    is_show: boolean;
    config?: any;
    created_time?: Date;
    updated_time?: Date;
}

const ScreenConfigSchema = new Schema({
    server: {
        type: String,
        required: true,
        index: true
    },
    screen: {
        type: Number,
        required: true,
        unique: true,
        default: EnumScreenType.student_leave_request
    },
    is_show: {
        type: Boolean,
        default: true
    },
    config: {
        type: Object
    },
    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const ScreenConfigModel = model<ScreenConfig>(
    DOCUMENT_NAME,
    ScreenConfigSchema,
    COLLECTION_NAME
);
