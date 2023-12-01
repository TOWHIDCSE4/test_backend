import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'Location';
export const COLLECTION_NAME = 'locations';

export default interface Location extends Document {
    id: number;
    name: string;
    currency: string;
    percent_salary_student_absent: number;
    weekend_bonus: number;
    conversion_bonus: number;
    attendance_bonus: number;
    referral_bonus: number;
    percent_substitute_bonus: number;
    percent_absent_punish: number;
    percent_absent_punish_trial: number;
    percent_absent_punish_1h: number;
    percent_absent_punish_2h: number;
    percent_absent_punish_3h: number;
    absent_punish_greater_3h: number;
    late_memo_punish: number;
    over_limit_punish: number;
    accept_time: number;
    cancel_time: number;
    created_time?: number;
    updated_time?: number;
}

const LocationSchema = new Schema({
    id: {
        type: Number,
        unique: true,
        index: true,
        required: true,
        immutable: true
    },
    name: {
        type: String,
        index: true,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    percent_salary_student_absent: {
        //% lương khi học viên absent
        type: Number,
        required: true,
        default: 0
    },
    weekend_bonus: {
        //thưởng cuối tuần
        type: Number,
        required: true,
        default: 0
    },
    conversion_bonus: {
        //thưởng chuyển đổi
        type: Number,
        required: true,
        default: 0
    },
    attendance_bonus: {
        // thưởng chuyên cần
        type: Number,
        required: true,
        default: 0
    },
    referral_bonus: {
        // thưởng giới thiệu
        type: Number,
        required: true,
        default: 0
    },
    percent_substitute_bonus: {
        // thưởng dạy thay
        type: Number,
        required: true,
        default: 0
    },
    percent_absent_punish: {
        // phạt khi giáo viên nghỉ không phép
        type: Number,
        required: true,
        default: 0
    },
    percent_absent_punish_trial: {
        // phạt khi giáo viên nghỉ trial
        type: Number,
        required: true,
        default: 0
    },
    percent_absent_punish_first_3_slot: {
        // phạt khi giáo viên nghỉ first 3 regular booking
        type: Number,
        required: true,
        default: 0
    },
    percent_absent_punish_1h: {
        // phạt khi giáo viên xin nghỉ trước 1h
        type: Number,
        required: true,
        default: 0
    },
    percent_absent_punish_2h: {
        // phạt khi giáo viên xin nghỉ trước 1-2h
        type: Number,
        required: true,
        default: 0
    },
    percent_absent_punish_3h: {
        // phạt khi giáo viên xin nghỉ trước 2-3h
        type: Number,
        required: true,
        default: 0
    },
    absent_punish_greater_3h: {
        // phạt khi giáo viên xin nghỉ lớn hơn 3h
        type: Number,
        required: true,
        default: 0
    },
    late_memo_punish: {
        // phạt giáo viên viết memo muộn
        type: Number,
        required: true,
        default: 0
    },
    over_limit_punish: {
        // phạt giáo viên nghỉ quá thời hạn
        type: Number,
        required: true,
        default: 0
    },
    accept_time: {
        type: Number,
        required: true
    },
    cancel_time: {
        type: Number
    },

    created_time: {
        type: Date,
        immutable: true
    },
    updated_time: {
        type: Date
    }
});

export const LocationModel = model<Location>(
    DOCUMENT_NAME,
    LocationSchema,
    COLLECTION_NAME
);
