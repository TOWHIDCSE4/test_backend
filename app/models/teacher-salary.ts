import { Schema, Document, model } from 'mongoose';
import { TeacherSalaryCircleStatus } from '../const/salary';

export const DOCUMENT_NAME = 'TeacherSalary';
export const COLLECTION_NAME = 'teacher-salaries';

export default interface TeacherSalary extends Document {
    teacher_id: number;
    location_id: number;
    start_time: number;
    end_time: number;
    total_salary: number;
    currency: string;
    // thông số lương
    hourly_rate: number;
    salary_slot: number;
    percent_salary_student_absent: number;
    // thống số thưởng
    weekend_bonus: number;
    conversion_bonus: number;
    attendance_bonus: number;
    referral_bonus: number;
    percent_substitute_bonus: number;
    // thông số phạt
    percent_absent_punish: number;
    percent_absent_punish_trial: number;
    percent_absent_punish_first_3_slot: number;
    // percent_absent_punish_first_3_premium: number;
    percent_absent_punish_1h: number;
    percent_absent_punish_2h: number;
    percent_absent_punish_3h: number;
    absent_punish_greater_3h: number;
    late_memo_punish: number;
    over_limit_punish: number;

    base_salary: {
        // tổng lương cơ bản
        total_salary: number;
        // tổng số lớp hoàn thành + viết memo
        total_salary_slot_done: number;
        list_slot_done: [];
        list_slot_done_without_memo: [];
        // tổng số lớp học viên absent
        total_salary_slot_student_absent: number;
        list_slot_student_absent: [];
    };
    bonus: {
        // tổng thưởng
        total_bonus: number;
        // tổng thưởng dạy cuối tuần
        total_bonus_weekend: number;
        list_slot_weekend: [];
        // tổng thưởng chuyển đổi
        total_bonus_conversion: number;
        list_conversion: [];
        // tổng thưởng dạy chuyên cần
        total_bonus_attendance: number;
        list_slot_attendance: [];
        // tổng thưởng giới thiệu
        total_bonus_referral: number;
        list_referral: [];
        // tổng thưởng dạy thay
        total_bonus_substitute_class: number;
        list_slot_substitute_class: [];
    };
    punish: {
        // tổng phạt
        total_punish: number;
        // tổng phạt absent các lớp trial
        total_punish_absent_trial: number;
        list_absent_trial: [];
        // tổng phạt absent 3 lớp đầu tiên
        total_punish_absent_first_3_slot: number;
        list_absent_first_3_slot: [];
        // tổng phạt absent 3 lớp đầu tiên
        total_punish_absent_first_3_premium: number;
        list_absent_first_3_premium: [];
        // tổng phạt absent 3 lịch đầu tiên
        total_punish_absent_regular_first_3_slot: number;
        list_absent_regular_first_3_slot: [];
        // tổng phạt absent các lớp mà không xin phép
        total_punish_absent_without_leave: number;
        list_absent_without_leave: [];
        // tổng phạt absent các lớp có xin phép trong vòng 1h
        total_punish_absent_with_leave_1h: number;
        list_absent_with_leave_1h: [];
        // tổng phạt absent các lịch có xin phép trong vòng 1h
        total_punish_absent_regular_with_leave_1h: number;
        list_absent_regular_with_leave_1h: [];
        // tổng phạt absent các lớp có xin phép trong vòng 2h
        total_punish_absent_with_leave_2h: number;
        list_absent_with_leave_2h: [];
        // tổng phạt absent các lịch có xin phép trong vòng 2h
        total_punish_absent_regular_with_leave_2h: number;
        list_absent_regular_with_leave_2h: [];
        // tổng phạt absent các lớp có xin phép trong vòng 3h
        total_punish_absent_with_leave_3h: number;
        list_absent_with_leave_3h: [];
        // tổng phạt absent các lớp có xin phép trong vòng 3h
        total_punish_absent_regular_with_leave_3h: number;
        list_absent_regular_with_leave_3h: [];
        // tổng phạt absent các lớp có xin phép hơn 3h
        total_punish_absent_with_leave_greater_3h: number;
        list_absent_with_leave_greater_3h: [];
        // tổng phạt absent các lớp có xin phép hơn 3h
        total_punish_absent_regular_with_leave_greater_3h: number;
        list_absent_regular_with_leave_greater_3h: [];
        // tổng phạt các lớp viết memo muộn
        total_punish_with_late_memo: number;
        list_late_memo: [];
    };

    created_time?: Date;
    updated_time?: Date;
    status?: TeacherSalaryCircleStatus;
    admin_note?: string;
    teacher_note?: string;
}

const TeacherSalarySchema = new Schema({
    teacher_id: {
        type: Number,
        required: true
    },
    location_id: {
        type: Number,
        required: true
    },
    start_time: {
        type: Number,
        required: true
    },
    end_time: {
        type: Number,
        required: true
    },
    total_salary: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    // thông số lương
    hourly_rate: {
        type: Number,
        required: true
    },
    salary_slot: {
        type: Number,
        required: true
    },
    percent_salary_student_absent: {
        type: Number,
        required: true
    },
    // thống số thưởng
    weekend_bonus: {
        type: Number,
        required: true
    },
    conversion_bonus: {
        type: Number,
        required: true
    },
    attendance_bonus: {
        type: Number,
        required: true
    },
    referral_bonus: {
        type: Number,
        required: true
    },
    percent_substitute_bonus: {
        type: Number,
        required: true
    },
    // thông số phạt
    percent_absent_punish: {
        type: Number,
        required: true
    },
    percent_absent_punish_trial: {
        type: Number,
        required: true
    },
    percent_absent_punish_first_3_slot: {
        type: Number,
        required: true
    },
    // percent_absent_punish_first_3_premium: {
    //     type: Number,
    //     required: true
    // },
    percent_absent_punish_1h: {
        type: Number,
        required: true
    },
    percent_absent_punish_2h: {
        type: Number,
        required: true
    },
    percent_absent_punish_3h: {
        type: Number,
        required: true
    },
    absent_punish_greater_3h: {
        type: Number,
        required: true
    },
    late_memo_punish: {
        type: Number,
        required: true
    },
    over_limit_punish: {
        type: Number,
        required: true
    },
    base_salary: {
        // tổng lương cơ bản
        total_salary: {
            type: Number,
            default: 0
        },
        // tổng số lớp hoàn thành + viết memo
        total_salary_slot_done: {
            type: Number,
            default: 0
        },
        list_slot_done: [],
        list_slot_done_without_memo: [],
        // tổng số lớp học viên absent
        total_salary_slot_student_absent: {
            type: Number,
            default: 0
        },
        list_slot_student_absent: []
    },
    bonus: {
        // tổng thưởng
        total_bonus: {
            type: Number,
            default: 0
        },
        // tổng thưởng dạy cuối tuần
        total_bonus_weekend: {
            type: Number,
            default: 0
        },
        list_slot_weekend: [],
        // tổng thưởng chuyển đổi
        total_bonus_conversion: {
            type: Number,
            default: 0
        },
        list_conversion: [],
        // tổng thưởng dạy chuyên cần
        total_bonus_attendance: {
            type: Number,
            default: 0
        },
        list_slot_attendance: [],
        // tổng thưởng giới thiệu
        total_bonus_referral: {
            type: Number,
            default: 0
        },
        list_referral: [],
        // tổng thưởng dạy thay
        total_bonus_substitute_class: {
            type: Number,
            default: 0
        },
        list_slot_substitute_class: []
    },
    punish: {
        // tổng phạt
        total_punish: {
            type: Number,
            default: 0
        },
        // tổng phạt absent các lớp trial
        total_punish_absent_trial: {
            type: Number,
            default: 0
        },
        list_absent_trial: [],
        // tổng phạt absent 3 lớp  đầu tiên
        total_punish_absent_first_3_slot: {
            type: Number,
            default: 0
        },
        list_absent_first_3_slot: [],
        // total_punish_absent_first_3_premium: {
        //     type: Number,
        //     default: 0
        // },
        // list_absent_first_3_premium: [],
        // tổng phạt absent 3 lịch đầu tiên
        total_punish_absent_regular_first_3_slot: {
            type: Number,
            default: 0
        },
        list_absent_regular_first_3_slot: [],
        // tổng phạt absent các lớp  mà không xin phép
        total_punish_absent_without_leave: {
            type: Number,
            default: 0
        },
        list_absent_without_leave: [],
        // tổng phạt absent các lớp  có xin phép trong vòng 1h
        total_punish_absent_with_leave_1h: {
            type: Number,
            default: 0
        },
        list_absent_with_leave_1h: [],
        // tổng phạt absent các lịch có xin phép trong vòng 1h
        total_punish_absent_regular_with_leave_1h: {
            type: Number,
            default: 0
        },
        list_absent_regular_with_leave_1h: [],
        // tổng phạt absent các lớp  có xin phép trong vòng 2h
        total_punish_absent_with_leave_2h: {
            type: Number,
            default: 0
        },
        list_absent_with_leave_2h: [],
        // tổng phạt absent các lịch có xin phép trong vòng 2h
        total_punish_absent_regular_with_leave_2h: {
            type: Number,
            default: 0
        },
        list_absent_regular_with_leave_2h: [],
        // tổng phạt absent các lớp  có xin phép trong vòng 3h
        total_punish_absent_with_leave_3h: {
            type: Number,
            default: 0
        },
        list_absent_with_leave_3h: [],
        // tổng phạt absent các lịch có xin phép trong vòng 3h
        total_punish_absent_regular_with_leave_3h: {
            type: Number,
            default: 0
        },
        list_absent_regular_with_leave_3h: [],
        // tổng phạt absent các lớp  có xin phép hơn 3h
        total_punish_absent_with_leave_greater_3h: {
            type: Number,
            default: 0
        },
        list_absent_with_leave_greater_3h: [],
        // tổng phạt absent các lớp có xin phép hơn 3h
        total_punish_absent_regular_with_leave_greater_3h: {
            type: Number,
            default: 0
        },
        list_absent_regular_with_leave_greater_3h: [],
        // tổng phạt các lớp viết memo muộn
        total_punish_with_late_memo: {
            type: Number,
            default: 0
        },
        list_late_memo: [],
        // tổng phạt absent các lớp quá từ 3 buổi
        total_punish_with_over_limit: {
            type: Number,
            default: 0
        },
        list_over_limit: [],
        // tổng phạt absent các lịch quá từ 3 buổi
        total_punish_regular_with_over_limit: {
            type: Number,
            default: 0
        },
        list_regular_over_limit: []
    },

    status: {
        type: TeacherSalaryCircleStatus,
        default: TeacherSalaryCircleStatus.UNPAID
    },
    admin_note: {
        type: String,
        default: ''
    },
    teacher_note: {
        type: String,
        default: ''
    },
    created_time: {
        type: Date
    },
    updated_time: Date
});

export const TeacherSalaryModel = model<TeacherSalary>(
    DOCUMENT_NAME,
    TeacherSalarySchema,
    COLLECTION_NAME
);
