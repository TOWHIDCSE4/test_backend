import config from 'config';
import axios from 'axios';
import User from '../../models/user';
import Unit from '../../models/unit';
import Course from '../../models/course';
import { EmailTemplate } from '../../const/notification';
import UserActions from '../../actions/user';
const logger = require('dy-logger');

const JOB_QUEUE_URL = config.get('services.job_queue_api');

export interface IMailTeacherLateToClass {
    student_name: string;
    teacher_name: string;
    start_time: number;
    teacher_skype: string;
    student_skype: string;
}

export interface IMailRelatedToBooking {
    student_name: string;
    teacher_name: string;
    course_name: string;
    unit_name: string;
    start_time: number;
    teacher_avatar: string;
    join_url: string;
    course_preview: string;
    teacher_skype: string;
    student_skype: string;
}

export interface IMailRequestReviewToAdmin {
    email: string;
    first_name: string;
    last_name: string;
    gender: any;
    phone_number: string;
    date_of_birth: string;
}

export interface IMailUpdateStatusBooking {
    student_name: string;
    teacher_name: string;
    old_status: string;
    new_status: string;
    start_time: number;
    teacher_skype: string;
    student_skype: string;
    booking_id: number;
}

export interface IMailNewAdminAccount {
    name: string;
    username: string;
    password: string;
}

export default class JobQueueServices {
    /*
     * Summary: make request to send mail in Email services
     * Params:
     * template: string / loai email muon gui
     * to: dia chi nguoi nhan
     * name: ten nguoi nhan
     * url: (neu co) link de verify mail hoac reset mat khau
     */
    public static async sendMailWithUrl(
        template: EmailTemplate,
        to: string,
        name: string,
        url?: string
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    name,
                    url
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    /*
     * @description make request to send mail in Email services related to booking
     * @param {string} template - email template to send
     * @param {string} to - received email
     * @param {string} student_name - name of the student booked the lesson
     * @param {string} teacher_name - name of the teacher that will teach the lesson
     * @param {string} course_name - name of the course
     * @param {string} unit_name - name of the unit that will be taught
     * @param {number} status - new status of the booking
     * @param {string} communicate_tool - communicate account of the teacher used for the lesson
     * @return Success or BadRequestError from email worker service
     */
    public static async sendMailRelatedToBooking(
        template: EmailTemplate,
        to: string,
        payload: IMailRelatedToBooking
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    ...payload
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMailRequestReviewToAdmin(
        template: EmailTemplate,
        to: string,
        payload: IMailRequestReviewToAdmin
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    ...payload
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMailLessonTeachingOverTime(
        template: EmailTemplate,
        to: string,
        teacher: User,
        student: User,
        course: Course,
        unit: Unit
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    teacher,
                    student,
                    course,
                    unit
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMailTeacherLateToClass(
        template: EmailTemplate,
        to: string,
        payload: IMailTeacherLateToClass
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    ...payload
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMailUpdateStatusBooking(
        template: EmailTemplate,
        to: string,
        payload: IMailUpdateStatusBooking
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    ...payload
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMailNewAdminAccount(
        template: EmailTemplate,
        to: string,
        payload: IMailNewAdminAccount
    ) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: {
                    template,
                    to,
                    ...payload
                }
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMailWithTemplate(data: {
        to: string;
        subject: string;
        body: string;
        data: any;
    }) {
        try {
            const route = `${JOB_QUEUE_URL}/email/template`;
            await axios({
                method: 'post',
                url: route,
                data: data
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendUnicastMail(data: {
        to: string;
        subject: string;
        body: string;
    }) {
        try {
            const route = `${JOB_QUEUE_URL}/email`;
            await axios({
                method: 'post',
                url: route,
                data: data
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }

    public static async sendMultticastMail(data: {
        to: string[];
        subject: string;
        body: string;
    }) {
        try {
            const route = `${JOB_QUEUE_URL}/email/multiple`;
            await axios({
                method: 'post',
                url: route,
                data: data
            });
        } catch (err: any) {
            logger.error(err.message);
        }
    }
}
