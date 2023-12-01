import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import moment from 'moment';
import config from 'config';
import axios from 'axios';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import StudentActions from '../actions/student';
import StudentLevelActions from '../actions/student-level';
import UserActions from '../actions/user';
import AdminActions from '../actions/admin';
import OrderedPackageController from './ordered-package.controller';
import UserControllers from './user.controller';
import Student from '../models/student';
import { RoleCode } from '../const/role';
import LogServices from '../services/logger';
import { EnumTypeChangeData } from '../services/logger';
import { EnumBookingStatus } from '../models/booking';
import BookingActions from '../actions/booking';
import { CODE_CACHE_CRM } from '../const';
import User from '../models/user';
const logger = require('dy-logger');
const pickUpData = ['_id', 'user_id', 'staff_id', 'student_level_id'];
const cacheService = require('../services/redis/cache-service');
const CRM_API_URL = config.get('services.crm.url');
export default class StudentController {
    public static async getStudentFullInfo(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const student = await StudentActions.findOne({ user_id: id });
        if (!student)
            throw new BadRequestError(req.t('errors.student.not_found'));
        const user = await UserActions.findOne({ id: student.user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const res_payload = {
            ...student.toJSON(),
            user_info: {
                avatar: user.avatar,
                full_name: user.full_name,
                skype_account: user.skype_account
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    private static async editStudent(
        req: ProtectedRequest,
        res: Response,
        id: number
    ) {
        const student = await StudentActions.findOne({ user_id: id });
        if (!student) throw new BadRequestError(req.t('errors.user.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'StudentModel',
            student,
            pickUpData
        );
        const diff = { ...req.body };
        if (diff.user_id) delete diff.user_id;
        if (diff.student_level_id) {
            const student_level = await StudentLevelActions.findOne({
                id: diff.student_level_id
            });
            if (!student_level) {
                throw new BadRequestError(
                    req.t('errors.student_level.not_found')
                );
            }
        }
        const new_data = await StudentActions.update(student._id, diff);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'StudentModel',
            new_data,
            pickUpData
        );
        return { message: 'Updated successfully' };
    }

    public static async editStudentByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.params;
        const mesg = await StudentController.editStudent(
            req,
            res,
            parseInt(student_id as string)
        );
        return new SuccessResponse('success', mesg).send(res, req);
    }

    /*
     * Summary: Tao mot profile hoc vien. Tuy vao role va cach tao profile,
     *          ham nay se duoc goi boi cac controller khac nhau
     * Request type: POST
     * Parameters: - user_id: : ma id cua user hoc vien
     * Response: - 200, ok: tao thanh cong profile hoc vien
     *           - 400, bad request
     */
    public static async createStudent(req: ProtectedRequest, user_id: number) {
        const user = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));

        const student = await StudentActions.findOne({ user_id });
        if (student) throw new BadRequestError(req.t('errors.student.exist'));

        const user_info: any = {
            user_id
        };

        if (req.body.staff_id) {
            const staff = await AdminActions.findOne({ id: req.body.staff_id });
            if (staff) {
                user_info.staff = staff;
            }
        }
        await StudentActions.create(user_info as Student);
        return 'Student created';
    }

    /*
     * Summary: Admin tao mot profile user kem mot profile hoc vien
     * Request type: POST
     * Role: Admin
     * Parameters: - role: body: Role can o day la hoc vien
     * Response: - 200, ok: tao thanh cong profile user va student
     *           - 400, bad request
     */
    public static async createStudentUserByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        req.body['role'] = [RoleCode.STUDENT];

        const user = await UserControllers.createUserByAdmin(req);

        const msg = await StudentController.createStudent(req, user.id);

        const res_payload = {
            ok: true,
            data: user
        };

        return new SuccessResponse(msg, res_payload).send(res, req);
    }

    /*
     * Summary: Admin tao mot student profile tu mot user_id da co
     * Request type: POST
     * Role: ADmin
     * Parameters: - user_id: params: ID cua user
     * Response: - 200, ok: tao thanh cong student profile
     *           - 400, bad request
     */
    public static async createStudentInfoByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id } = req.params;
        const msg = await StudentController.createStudent(
            req,
            parseInt(user_id as string)
        );
        return new SuccessResponse('success', msg).send(res, req);
    }

    /*
     * Summary: User tu dang ky thong tin hoc vien cua minh
     * Request type: POST
     * Role: User - Student
     * Parameters: role: body: Role can thiet o day la Student
     * Response: - 200, ok: tao thanh cong profile student
     *           - 400, bad request
     */
    public static async registerStudentUser(
        req: ProtectedRequest,
        res: Response
    ) {
        const { crm_user_id } = req.body;
        logger.info(`crm_user_id register: ` + crm_user_id);
        if (crm_user_id) {
            const code_cache = CODE_CACHE_CRM + crm_user_id;
            const data = await cacheService.get(code_cache);
            if (data) {
                req.body.gender = data.gender;
                req.body.date_of_birth = data.date_of_birth;
                req.body.skype_account = data.skype_account;
                req.body.address = data.address;
                req.body.intro = data.intro;
                req.body.sale_name = data.sale_name;
                req.body.sale_user_id = data.sale_user_id;
                req.body.sale_email = data.sale_email;
                req.body.source = data.source;
                req.body.skype_info = data.skype_info;
            }
        }
        req.body['role'] = [RoleCode.STUDENT];
        const user: any = await UserControllers.createUserByGuest(req);
        const msg = await StudentController.createStudent(req, user.id);

        // verify phone qua OTP
        if (!user.is_verified_phone && user.phone_number) {
            const otpCode = await UserControllers.sendOtpZaloZNS(
                user.phone_number
            );
            console.log(otpCode)
            if (otpCode) {
                await UserActions.update(user._id, {
                    otp_code: otpCode,
                    otp_sent_time: moment().valueOf()
                } as User);
            }
        }
        const userData: any = await UserActions.findOne({ id: user.id });
        // if (!user.is_verified_email) {
        //     await UserControllers.createVerifyUrl(
        //         user.id,
        //         user.email,
        //         user.first_name
        //     );
        // }
        const res_payload = {
            message: msg,
            user: userData
        };

        if (CRM_API_URL && userData?.crm_user_id) {
            logger.info('start call api crm create user customer');
            try {
                const route = `${CRM_API_URL}/api/create-user-customer/${userData?.crm_user_id}`;
                const headers = {
                    'Content-Type': 'application/json; charset=utf-8'
                };
                const response: any = await axios({
                    method: 'post',
                    url: route,
                    headers,
                    data: {
                        username : userData?.username
                    }
                });
                logger.info(`respone data:  ${JSON.stringify(response?.data)}`);
                if(!response && (response.data && response.data.message == 'error')){
                    logger.error('call api crm create user customer error');
                    throw new BadRequestError(req.t('Tạo user customer bên CRM có lỗi xảy ra. vui lòng liên hệ quản trị viên'));
                }
                logger.info(`create user customer crm success`);
            } catch (err: any) {
                logger.error(
                    'create user customer, error: ',
                    err?.message
                );
                throw new BadRequestError(err?.message);
            }
        }

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: User tu dang ky thong tin hoc vien cua minh
     * Request type: POST
     * Role: User - Student
     * Parameters: <none>
     * Response: - 200, ok: tao thanh cong profile student
     *           - 400, bad request
     */
    public static async registerStudentInfo(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const msg = await StudentController.createStudent(req, id);
        return new SuccessResponse('success', msg).send(res, req);
    }

    public static async assignStaff(req: ProtectedRequest, user_id: number) {
        const student = await StudentActions.findOne({ user_id });
        if (!student)
            throw new BadRequestError(req.t('errors.student.not_found'));
        if (req.body.staff_id) {
            const staff = await AdminActions.findOne({ id: req.body.staff_id });
            if (!staff)
                throw new BadRequestError(req.t('errors.admin.not_found'));
            await StudentActions.update(student._id, { staff } as Student);
        }
        return { message: 'Updated successfully' };
    }

    public static async getRenewStudentStatistics(
        req: ProtectedRequest,
        res: Response
    ) {
        let month = parseInt(req.query.month as string);
        let year = parseInt(req.query.year as string);
        if (!month || month < 0 || month >= 12) {
            month = moment().utc().get('month');
            year = moment().utc().get('year');
        } else if (!year) {
            year = moment().utc().get('year');
        }
        const start_time = moment()
            .utc()
            .year(year)
            .month(month)
            .startOf('month')
            .valueOf();
        const end_time = moment()
            .utc()
            .year(year)
            .month(month)
            .add(1, 'month')
            .startOf('month')
            .valueOf();

        const renew_student_list =
            await OrderedPackageController.getRenewStudentList(
                start_time,
                end_time
            );

        const current_time_expired_student_list =
            await OrderedPackageController.getExpiredStudentList(
                start_time,
                end_time
            );
        const renew_for_current_expired_package = _.intersection(
            renew_student_list,
            current_time_expired_student_list
        );

        const previous_expired_student_list =
            await OrderedPackageController.getExpiredStudentList(
                null,
                start_time
            );
        const renew_for_previous_expired_package = _.difference(
            _.intersection(renew_student_list, previous_expired_student_list),
            renew_for_current_expired_package /** If renew students are in both current and previous list, put them in current list only */
        );

        const future_expired_student_list =
            await OrderedPackageController.getExpiredStudentList(
                end_time,
                null
            );
        const renew_for_future_expired_package = _.difference(
            _.intersection(renew_student_list, future_expired_student_list),
            renew_for_current_expired_package /** If renew students are in both current and future list, put them in current list only */
        );

        const res_payload = {
            current_time_expired_count:
                current_time_expired_student_list.length,
            renew_for_previous_expired_package_count:
                renew_for_previous_expired_package.length,
            renew_for_current_epxired_package_count:
                renew_for_current_expired_package.length,
            renew_for_future_epxired_package_count:
                renew_for_future_expired_package.length
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTrialProportionReport(
        req: ProtectedRequest,
        res: Response
    ) {
        const { start_time, end_time } = req.query;
        const res_payload = {
            data: new Array<any>()
        };
        if (parseInt(start_time as string) && parseInt(end_time as string)) {
            const filter = {
                min_start_time: parseInt(start_time as string),
                max_end_time: parseInt(end_time as string),
                status: {
                    $in: [
                        EnumBookingStatus.COMPLETED,
                        EnumBookingStatus.STUDENT_ABSENT
                    ]
                }
            } as any;
            const res_agg = await UserActions.getTrialAndPaidStudentsBySale(
                filter
            );
            let arrayDataReport = new Array<any>();
            let totaltrialStudent = 0;
            let totalPaidStudent = 0;
            if (res_agg && Array.isArray(res_agg)) {
                for await (const item of res_agg) {
                    totaltrialStudent += item.trial_student_number;
                    totalPaidStudent += item.paid_student_number;
                }
                arrayDataReport = res_agg;
                arrayDataReport.unshift({
                    sale_id: 1,
                    sale_name: 'Tổng',
                    trial_student_number: totaltrialStudent,
                    paid_student_number: totalPaidStudent
                });
                // for(const item of res_agg){
                //     arrayDataReport.push(item)
                // }
            } else {
                arrayDataReport.push({
                    sale_id: 1,
                    sale_name: 'Tổng',
                    trial_student_number: totaltrialStudent,
                    paid_student_number: totalPaidStudent
                });
            }
            res_payload.data = arrayDataReport;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTrialBookingsOfSale(
        req: ProtectedRequest,
        res: Response
    ) {
        const { sale_id } = req.params;
        const { start_time, end_time, page_size, page_number } = req.query;
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        if (
            parseInt(start_time as string) &&
            parseInt(end_time as string) &&
            parseInt(sale_id as string)
        ) {
            const filter = {
                min_start_time: parseInt(start_time as string),
                max_end_time: parseInt(end_time as string),
                sale_id: parseInt(sale_id as string),
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                status: [
                    EnumBookingStatus.COMPLETED,
                    EnumBookingStatus.STUDENT_ABSENT
                ]
            };
            const res_agg = await BookingActions.getTrialBookingsOfSale(filter);
            if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
                res_payload.data = res_agg[0].data;
                res_payload.pagination.total = res_agg[0].pagination.total;
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
    public static async getAllTrialStudentBuyMainPackage(
        req: ProtectedRequest,
        res: Response
    ) {
        const { sale_id } = req.params;
        const { start_time, end_time, page_size, page_number } = req.query;
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        if (
            parseInt(start_time as string) &&
            parseInt(end_time as string) &&
            parseInt(sale_id as string)
        ) {
            const filter = {
                min_start_time: parseInt(start_time as string),
                max_end_time: parseInt(end_time as string),
                sale_id: parseInt(sale_id as string),
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                status: {
                    $in: [
                        EnumBookingStatus.COMPLETED,
                        EnumBookingStatus.STUDENT_ABSENT
                    ]
                }
            };
            const res_agg = await UserActions.getListTrialStudentBuyMainPackage(
                filter
            );
            if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
                res_payload.data = res_agg[0].data;
                res_payload.pagination.total = res_agg[0].pagination.total;
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
