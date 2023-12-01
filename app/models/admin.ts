import { model, Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from 'config';
import Role from './role';
import Department, { DepamentOfAdmin } from './department';
import { EnumRole } from './department';
const SALT: number = config.get('server.salt_work_factor');

export const DOCUMENT_NAME = 'Admin';
export const COLLECTION_NAME = 'admins';

export default interface Admin extends Document {
    id: number;
    username: string;
    password: string;
    fullname: string;
    email?: string;
    bod: number;
    phoneNumber: string;
    IDCard: string;
    bankingNumber: number;
    bankingName: string;
    IDCardBOD: number;
    gender: number;
    role: Role[];
    department: {
        department: Department;
        isRole: EnumRole;
    };
    canUpdate: boolean;
    lock_permission: boolean;
    is_active?: boolean;
    login_counter?: number;
    last_login_ip?: string;
    permissions?: any;
    last_login?: Date;
    created_time?: Date;
    updated_time?: Date;
    comparePassword: (password: string) => Promise<boolean>;
}

const AdminSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    username: {
        type: String,
        unique: true,
        index: true,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    role: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
            default: []
        }
    ],
    department: {
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department'
        },
        isRole: {
            type: String,
            default: EnumRole.Staff,
            enum: EnumRole
        }
    },
    email: {
        type: String
    },
    gender: {
        type: Number,
        enum: [0, 1, 2], //0: other, 1: male, 2: female
        default: 0
    },
    bod: {
        type: Number
    },
    phoneNumber: {
        type: String
    },
    IDCard: {
        type: String
    },
    bankingNumber: {
        type: Number
    },
    bankingName: {
        type: String
    },
    IDCardBOD: {
        type: Number
    },
    canUpdate: {
        type: Boolean,
        required: true,
        default: true
    },
    lock_permission: {
        type: Boolean,
        default: false
    },
    is_active: {
        type: Boolean,
        required: true,
        default: false
    },
    login_counter: {
        type: Number,
        required: true,
        default: 0
    },
    last_login_ip: {
        type: String
    },
    last_login: {
        type: Date,
        index: true
    },
    permissions: [
        {
            type: Schema.Types.String,
            default: []
        }
    ],
    created_time: {
        type: Date,
        index: true,
        immutable: true
    },
    updated_time: Date
});

AdminSchema.pre<Admin>('save', function (next) {
    const user = this;

    // only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT, function (err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

// @ts-ignore
AdminSchema.methods.comparePassword = function (
    this: Admin,
    candidatePassword: string
) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const AdminModel = model<Admin>(
    DOCUMENT_NAME,
    AdminSchema,
    COLLECTION_NAME
);
