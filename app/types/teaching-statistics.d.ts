export default class TeachingStatistics {

    total_done: number;
    total_absence_in_time: number;
    total_absence_report_late_normal:number;
    total_absence_report_late_nearly_missed: number;
    total_missed_class: number;
    total_absence: number;
    total_subclas: number; /* NOT_YET */
    total_student_absent: number;
    total_weekend_lesson: number;
    total_booked: number;
    total_enrollment: number; /* NOT_YET */
    total_referral: number; /* NOT_YET */
    total_best_memo: number; /* NOT_YET */
    total_late_memo: number; /* NOT_YET */
    total_open_calendar: number

    constructor() {
        this.total_done = 0;
        this.total_absence_in_time = 0;
        this.total_absence_report_late_normal = 0;
        this.total_absence_report_late_nearly_missed = 0;
        this.total_missed_class = 0;
        this.total_absence = 0;
        this.total_subclas = 0; /* NOT_YET */
        this.total_student_absent = 0;
        this.total_weekend_lesson = 0;
        this.total_booked = 0;
        this.total_enrollment = 0; /* NOT_YET */
        this.total_referral = 0; /* NOT_YET */
        this.total_best_memo = 0; /* NOT_YET */
        this.total_late_memo = 0; /* NOT_YET */
        this.total_open_calendar = 0
    }
}