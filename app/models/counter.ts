import { Schema, Document, model } from 'mongoose';

export const DOCUMENT_NAME = 'Counter';
export const COLLECTION_NAME = 'counters';

export default interface Counter extends Document {
    user_id: number;
    admin_id: number;
    calendar_id: number;
    course_id: number;
    booking_id: number;
    subject_id: number;
    package_id: number;
    order_id: number;
    location_id: number;
    unit_id: number;
    teacher_regular_request_id: number;
    regular_calendar_id: number;
    role_id: number;
    department_id: number;
    team_id: number;
    teacher_level_id: number;
    teacher_absent_request_id: number;
    teacher_upgrade_request_id: number;
    report_id: number;
    scheduled_memo_id: number;
    student_reservation_request_id: number;
    coupon_id: number;
    ordered_package_id: number;
    student_extension_request_id: number;
    curriculum_id: number;
    suggestion_id: number;
    trial_test_ielts_result_id: number;
    homework_test_result_id: number;
    prompt_template_id: number;
    cms_hmp_info_id: number;
    learning_assessment_reports_id: number;
    ai_report_result_id: number;
    student_leave_request_id: number;
}
const CounterSchema = new Schema({
    user_id: {
        type: Number
    },
    admin_id: {
        type: Number
    },
    calendar_id: {
        type: Number
    },
    course_id: {
        type: Number
    },
    booking_id: {
        type: Number
    },
    subject_id: {
        type: Number
    },
    package_id: {
        type: Number
    },
    order_id: {
        type: Number
    },
    location_id: {
        type: Number
    },
    unit_id: {
        type: Number
    },
    teacher_regular_request_id: {
        type: Number
    },
    regular_calendar_id: {
        type: Number
    },
    department_id: {
        type: Number
    },
    team_id: {
        type: Number
    },
    teacher_level_id: {
        type: Number
    },
    teacher_absent_request_id: {
        type: Number
    },
    teacher_upgrade_request_id: {
        type: Number
    },
    report_id: {
        type: Number
    },
    scheduled_memo_id: {
        type: Number
    },
    student_reservation_request_id: {
        type: Number
    },
    coupon_id: {
        type: Number
    },
    ordered_package_id: {
        type: Number
    },
    student_extension_request_id: {
        type: Number
    },
    curriculum_id: {
        type: Number
    },
    suggestion_id: {
        type: Number
    },
    trial_test_ielts_result_id: {
        type: Number
    },
    homework_test_result_id: {
        type: Number
    },
    prompt_template_id: {
        type: Number
    },
    cms_hmp_info_id: {
        type: Number
    },
    learning_assessment_reports_id: {
        type: Number
    },
    ai_report_result_id: {
        type: Number
    },
    student_leave_request_id: {
        type: Number
    }
});

export const CounterModel = model<Counter>(
    DOCUMENT_NAME,
    CounterSchema,
    COLLECTION_NAME
);
