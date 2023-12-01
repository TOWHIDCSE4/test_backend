import { model, Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from 'config';
import { RoleCode } from '../const/role';
import Teacher from './teacher';
import { EnumGender } from '../const';
const SALT: number = config.get('server.salt_work_factor');

export const DOCUMENT_NAME = 'User';
export const COLLECTION_NAME = 'users';

interface BankAccount extends Document {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    paypal_email?: string;
    note?: string;
}

export enum EnumSourceCRM {
    cskh = 'cskh',
    office_hamia = 'office_hamia'
}

// export enum EnumLearningMediumType {
//     HMP = 1, // Hamia Meet Plus
//     SKYPE = 2
// }

export enum linkHMPType {
    STUDENT = 1,
    TEACHER = 2
}

export interface ICrmInfo {
    sale_user_id: string;
    sale_name: string;
    sale_email?: string;
    source: EnumSourceCRM;
}

export default interface User extends Document {
    id: number;
    zalo_id: string;
    email: string;
    username: string;
    password: string;
    phone_number?: string;
    first_name: string;
    last_name: string;
    full_name: string /* Just for searching */;
    gender?: EnumGender;
    date_of_birth?: Date;
    skype_account?: string;
    address?: string;
    avatar?: string;
    intro?: string;
    role: RoleCode[];
    is_active?: boolean;
    is_verified_phone?: boolean;
    is_verified_email?: boolean;
    is_password_null?: boolean;
    regular_times?: number[];
    login_counter?: number;
    last_login_ip?: string;
    last_login?: Date;
    country?: string;
    currency?: string;
    timezone?: string;
    created_time?: Date;
    updated_time?: Date;
    permissions?: any;
    teacher?: Teacher;
    bank_account?: BankAccount;
    ispeak_user_id?: number;
    crm?: ICrmInfo;
    trial_class_skype_url?: any;
    is_enable_receive_mail?: boolean;
    crm_user_id?: number;
    otp_code?: string;
    otp_sent_time?: number;
    // learning_medium_type?: number;
    // comparePassword?: () => Promise<boolean>
}

export const IGNORE_SENSITIVE_FIELDS = {
    // is_active: 0,
    // is_verified_phone: 0,
    // is_verified_email: 0,
    // regular_time: 0,
    last_login_ip: 0,
    last_login: 0,
    currency: 0,
    timezone: 0,
    password: 0,
    role: 0,
    bank_account: 0,
    is_password_null: 0,
    login_counter: 0,
    created_time: 0,
    updated_time: 0
};

const UserSchema = new Schema(
    {
        id: {
            type: Number,
            unique: true,
            index: true,
            required: true,
            immutable: true
        },
        zalo_id: {
            type: String
        },
        email: {
            type: String,
            index: true,
            required: false,
            trim: true
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
        phone_number: {
            type: String,
            default: ''
        },
        first_name: {
            type: String,
            default: ''
        },
        last_name: {
            type: String,
            default: ''
        },
        full_name: {
            type: String,
            default: ''
        },
        gender: {
            type: Number
        },
        date_of_birth: {
            type: Date
        },
        skype_account: {
            type: String,
            index: true
        },
        address: {
            type: String,
            default: ''
        },
        avatar: {
            type: String,
            default: ''
        },
        intro: {
            type: String,
            default: ''
        },
        role: [
            {
                type: Number,
                default: RoleCode.STUDENT,
                required: true,
                index: true
            }
        ],
        permissions: [
            {
                type: Schema.Types.String,
                default: []
            }
        ],
        is_active: {
            type: Boolean,
            required: true,
            index: true,
            default: false
        },
        is_verified_phone: {
            type: Boolean,
            required: true,
            default: false
        },
        is_verified_email: {
            type: Boolean,
            required: true,
            default: false
        },
        is_password_null: {
            type: Boolean,
            default: false
        },
        regular_times: {
            type: [
                {
                    type: Number
                }
            ],
            default: []
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
        country: {
            type: String,
            default: ''
        },
        currency: {
            type: String,
            default: ''
        },
        timezone: {
            type: String,
            default: ''
        },
        bank_account: {
            type: Schema.Types.Mixed
        },
        ispeak_user_id: {
            type: Number
        },
        crm: {
            sale_user_id: {
                type: Number
            },
            sale_name: {
                type: String
            },
            sale_email: {
                type: String
            },
            source: {
                type: String,
                enum: EnumSourceCRM
            }
        },
        created_time: {
            type: Date,
            index: true,
            immutable: true
        },
        trial_class_skype_url: {
            type: Object
        },
        is_enable_receive_mail: {
            type: Boolean,
            default: false
        },
        crm_user_id: {
            type: Number,
            index: true
        },
        otp_code: {
            type: String,
            index: true
        },
        otp_sent_time: {
            type: Number
        },
        // learning_medium_type: {
        //     type: Number
        // },
        updated_time: Date
    },
    {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    }
);

UserSchema.index({
    email: 'text',
    username: 'text',
    phone_number: 'text',
    full_name: 'text',
    skype_account: 'text'
});

UserSchema.virtual('teacher', {
    ref: 'Teacher',
    localField: 'id',
    foreignField: 'user_id',
    justOne: true,
    options: {
        populate: 'level'
    }
});

UserSchema.pre<User>('save', function (next) {
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
UserSchema.methods.comparePassword = function (
    this: User,
    candidatePassword: string
) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = model<User>(
    DOCUMENT_NAME,
    UserSchema,
    COLLECTION_NAME
);
