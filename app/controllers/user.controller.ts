import { DEFAULT_TEACHER_LEVEL_ID } from './../const/default-id';
import { PublicRequest, ProtectedRequest } from 'app-request';
import { Request, Response } from 'express';
import { StatusCode } from '../core/ApiResponse';
import _, { forEach } from 'lodash';
import config from 'config';
import { RedirectResponse, SuccessResponse } from './../core/ApiResponse';
import {
    BadRequestError,
    InternalError,
    EmailNotVerifyError
} from '../core/ApiError';
import CounterActions from '../actions/counter';
import OrderedPackageActions from '../actions/ordered-package';
import StudentActions from '../actions/student';
import TeacherActions from '../actions/teacher';
import TemplateActions from '../actions/template';
import UserActions from '../actions/user';
import User, { EnumSourceCRM, UserModel } from '../models/user';
import { createToken } from '../auth/auth-utils';
import {
    emailCacheTokenUtils,
    resetPassCacheTokenUtils
} from '../utils/hash-token-utils';
import {
    isTheSameTimestampSet,
    isValidStartTimestamp
} from '../utils/datetime-utils';
import axios from 'axios';
import CalendarControllers from './calendar.controller';
import RegularCalendarController from './regular-calendar.controller';
import StudentControllers from './student.controller';
import TeacherRegularRequestControllers from './teacher-regular-request.controller';
import TrialBookingController from './trial-booking.controller';
import JobQueueServices from '../services/job-queue';
import moment from 'moment';
import {
    CODE_CACHE_CRM,
    DEFAULT_PASSWORD,
    MAX_STUDENTS_WITH_THE_SAME_EMAIL,
    OTP_PHONE_CACHE
} from '../const';
import { DAY_TO_MS, WEEK_TO_MS } from '../const/date-time';
import { RoleCode } from '../const/role';
import { countries } from 'countries-list';
import timeZones from '../const/timezones.json';
import {
    EmailTemplate,
    BackEndNotification,
    ZALO_OA_MESSAGE_TYPE,
    ZNS_TEMPLATE
} from '../const/notification';
import { EnumPackageOrderType } from '../const/package';
import CalendarActions from '../actions/calendar';
import Calendar from '../models/calendar';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import * as natsClient from '../services/nats/nats-client';
import { ZaloOANotification } from '../const/notification';
import StudentController from './student.controller';
import { BankList } from '../const/bank-list';
import SkypeApiServices from '../services/skype';
import SkypeMeetingPoolActions from '../actions/skype-meeting-pool';
import { EnumStatus } from '../models/skype-meeting-pool';
import SkypeMeetingPool from '../models/skype-meeting-pool';
import TeamActions from '../actions/team';
import AdminActions from '../actions/admin';
import { AdminModel } from '../models/admin';
import { CODE_DEPARTMENT } from '../const/department';
import { DepartmentModel, EnumRole } from '../models/department';
import OperationIssueActions from '../actions/operation-issue';
import { StudentModel } from '../models/student';

const logger = require('dy-logger');
const USER_SECRET: string = config.get('server.secret_token');
const cacheService = require('../services/redis/cache-service');
const BASE_URL = config.get('server.url');
const WEBAPP_URL = config.get('server.webapp_url');
const EXPIRE_TIME = config.get('server.expire_time_email');
const CRM_API_URL = config.get('services.crm.url');

/*
 * Special fields on User schema that only admin can set or edit
 * In user register, these fields will be set as default
 *
 * Cac truong dac biet trong schema User ma chi admin moi set hoac chinh sua
 * duoc. Khi nguoi dung dang ky user, cac truong nay se duoc set theo mac dinh
 */
type AdminSetField = {
    role: RoleCode[];
    regular_times?: number[];
    is_active?: boolean;
    is_verified_phone?: boolean;
    is_verified_email?: boolean;
    is_password_null?: boolean;
    login_counter?: number;
};
const pickUpData = [
    '_id',
    'id',
    'email',
    'username',
    'phone_number',
    'first_name',
    'last_name',
    'full_name',
    'gender',
    'date_of_birth',
    'skype_account',
    'address',
    'avatar',
    'intro',
    'is_active',
    'is_verified_phone',
    'is_verified_email',
    'is_password_null',
    'regular_times',
    'login_counter',
    'last_login_ip',
    'last_login',
    'country',
    'currency',
    'timezone',
    'permissions',
    'bank_account'
];

export default class UserController {
    public static async login(req: PublicRequest, res: Response) {
        const { email, password, zalo_id } = req.body;
        const user:any = await UserActions.findOne(
            { $or: [{ email }, { username: email }] },
            {
                password: 1,
                _id: 1,
                id: 1,
                role: 1,
                email: 1,
                first_name: 1,
                last_name: 1,
                full_name: 1,
                zalo_id: 1,
                username: 1,
                avatar: 1,
                permissions: 1,
                is_verified_email: 1,
                is_verified_phone: 1,
                is_active: 1,
                login_counter: 1,
                last_login: 1
            }
        );
        if (!user)
            throw new BadRequestError(
                req.t('errors.authentication.login_failure')
            );
        // @ts-ignore
        const isMatch = await user.comparePassword(password);
        if (!isMatch)
            throw new BadRequestError(
                req.t('errors.authentication.login_failure')
            );
        const roleUser = parseInt(user.role as string);
        if (roleUser === RoleCode.STUDENT && !user.is_active && user.is_verified_phone) {
            throw new BadRequestError(req.t('errors.user.inactive'));
        }
        if (
            roleUser === RoleCode.TEACHER &&
            user.email &&
            !user.is_verified_email
        ) {
            throw new EmailNotVerifyError(
                req.t('errors.user.email_not_verified')
            );
        }

        if (zalo_id) {
            user.zalo_id = zalo_id;
            user.last_login = new Date();
            user.login_counter = (user.login_counter || 0) + 1;
            await user.save();
        }
        const access_token = await createToken(user, false, USER_SECRET);
        res.cookie('token', access_token);
        return new SuccessResponse('Login success', {
            user: _.pick(user, [
                '_id',
                'id',
                'role',
                'first_name',
                'last_name',
                'email',
                'is_verified_phone'
            ]),
            access_token
        }).send(res, req);
    }

    /*
     * Summary: Tao mot user moi. Tuy theo role cua nguoi tao, ham nay duoc
     *          goi boi cac ham controller khac nhau
     * Request type: POST
     * Parameters: - email            : body: Email cua user moi
     *             - password         : body: Mat khau cua user moi
     *             - phone_number     : body: SDT cua user
     *             - first_name       : body: Ten cua user
     *             - last_name        : body: Ho cua user
     *             - gender           : body: Gioi tinh
     *             - date_of_birth    : body: Ngay sinh
     *             - address          : body: Dia chi
     *             - avatar           : body: Duong dan den hinh avatar
     *             - intro            : body: Loi gioi thieu user
     *             - admin_set        :     : Mot so truong chi co admin duoc
     *                                        chinh sua, luc user tu dang ky,
     *                                        gia tri object nay se theo mot
     *                                        mac dinh
     * Response: - 200: OK, tao thanh cong user, tra ve user
     *           - 400: Bad Request
     */
    private static async createUser(
        req: ProtectedRequest,
        admin_set: AdminSetField
    ) {
        const {
            email,
            password,
            phone_number,
            first_name,
            username,
            last_name,
            gender,
            date_of_birth,
            skype_account,
            address,
            avatar,
            intro,
            skype_info,
            crm_user_id
        } = req.body;
        if (admin_set.role.includes(RoleCode.STUDENT)) {
            const user = await UserActions.findOne({
                username
            });
            if (user) {
                if (user.username === username) {
                    throw new BadRequestError(
                        req.t('errors.user.username_exist')
                    );
                }
                throw new BadRequestError(req.t('errors.user.exist'));
            }
        } else {
            const user = await UserActions.findOne({
                username
            });
            if (user && user.is_verified_email) {
                if (user.username === username) {
                    throw new BadRequestError(
                        req.t('errors.user.username_exist')
                    );
                }
                throw new BadRequestError(req.t('errors.user.exist'));
            } else if (user && !user.is_verified_email) {
                throw new BadRequestError(
                    req.t('errors.user.verification_sent')
                );
            }
        }

        const counter = await CounterActions.findOne({});
        const user_id = counter.user_id;

        let crm = null;
        if (req.body.sale_name && req.body.sale_user_id && req.body.source) {
            crm = {
                sale_user_id: req.body.sale_user_id,
                sale_email: req.body.sale_email,
                sale_name: req.body.sale_name,
                source: req.body.source
            };
        }
        console.log('>>>>> typeof skype_info: ', typeof skype_info);
        console.log('>>>>> skype_info: ', skype_info);

        const user_info: any = {
            id: user_id,
            email: email || '',
            username,
            password: password ? password : DEFAULT_PASSWORD,
            phone_number,
            first_name,
            last_name,
            full_name: `${first_name} ${last_name}`,
            gender: gender ? gender : null,
            date_of_birth,
            skype_account,
            address,
            avatar,
            intro,
            regular_times: admin_set.regular_times,
            role: admin_set.role,
            is_active: admin_set.is_active,
            is_verified_phone: admin_set.is_verified_phone,
            is_verified_email: admin_set.is_verified_email,
            login_counter: admin_set.login_counter,
            crm,
            crm_user_id: req?.body?.sale_user_id ? crm_user_id : null,
            trial_class_skype_url: skype_info,
            is_enable_receive_mail: admin_set.is_verified_email ? true : false
        };

        const user = await UserActions.create({ ...user_info } as User);
        return user;
    }

    /*
     * Summary: Admin tao mot user moi. Tuy theo viec admin chi muon tao
     *          user profile thoi hay con muon tao them teacher/student
     *          profile, ham nay co the duoc goi boi cac ham controller khac nhau
     * Request type: POST
     * Role: Admin
     * Parameters: - email            : body: Email cua user moi
     *             - password         : body: Mat khau cua user moi
     *             - phone_number     : body: SDT cua user
     *             - first_name       : body: Ten cua user
     *             - last_name        : body: Ho cua user
     *             - gender           : body: Gioi tinh
     *             - date_of_birth    : body: Ngay sinh
     *             - address          : body: Dia chi
     *             - avatar           : body: Duong dan den hinh avatar
     *             - intro            : body: Loi gioi thieu user
     *             - role             : body: Student/Teacher/Admin?
     *             - is_active        : body: User da duoc active chua?
     *             - is_verified_phone: body: SDT da duoc xac minh chua?
     *             - is_verified_email: body: Mail da duoc xac minh chua?
     *             - login_counter    : body: So lan user da dang nhap truoc do
     * Response: - 200: OK, tao thanh cong user, tra ve user
     *           - 400: Bad Request
     */
    public static async createUserByAdmin(req: ProtectedRequest) {
        const {
            role,
            is_active,
            is_verified_phone,
            is_verified_email,
            login_counter,
            regular_times
            // learning_medium_type
        } = req.body;
        const admin_set = {
            role: role
                ? [parseInt(role as string)]
                : [RoleCode.STUDENT] /* Default role as STUDENT */,
            regular_times:
                regular_times && Array.isArray(regular_times)
                    ? regular_times
                    : [],
            is_active: is_active ? true : false,
            is_verified_phone: is_verified_phone ? true : false,
            is_verified_email: is_verified_email ? true : false,
            login_counter: login_counter ? login_counter : 0
            // learning_medium_type
        };
        const user = await UserController.createUser(req, admin_set);
        return _.pick(user, ['id', 'role', 'email', 'is_verified_email']);
    }

    public static async createUserByCRM(req: ProtectedRequest, res: Response) {
        const admin_set = {
            role: [RoleCode.STUDENT] /* Default role as STUDENT */,
            regular_times: [],
            is_active: true,
            is_verified_phone: true,
            is_verified_email: false,
            login_counter: 0
        };
        const user = await UserController.createUser(req, admin_set);
        const student = await StudentController.createStudent(req, user.id);
        const res_payload = _.pick(user, [
            'id',
            'email',
            'username',
            'phone_number',
            'first_name',
            'last_name',
            'full_name',
            'address',
            'avatar',
            'intro'
        ]);

        const notiTemplate = await TemplateActions.findOne({
            code: BackEndNotification.DUPLICATE_STUDENT_INFORMATION
        });

        if (notiTemplate) {
            const arrContentOfDuplicateColumns = [];

            if (res_payload.phone_number) {
                const countUserByPhoneNumber = await UserActions.count({
                    phone_number: res_payload.phone_number
                });

                if (countUserByPhoneNumber > 1) {
                    arrContentOfDuplicateColumns.push(
                        `SĐT: ${res_payload.phone_number}`
                    );
                }
            }

            if (res_payload.email) {
                const countUserByEmail = await UserActions.count({
                    email: res_payload.email
                });

                if (countUserByEmail > 1) {
                    arrContentOfDuplicateColumns.push(
                        `email: ${res_payload.email}`
                    );
                }
            }

            if (res_payload.username) {
                const newUsernameLength: any = res_payload.username.length;
                const lstUsersWithLargerUsername = await UserActions.findAll({
                    $expr: {
                        $gt: [{ $strLenCP: '$username' }, newUsernameLength]
                    },
                    username: {
                        $regex: res_payload.username,
                        $options: 'i'
                    }
                });

                let isUsernameDuplicate = false;
                for (const user of lstUsersWithLargerUsername) {
                    const percent =
                        (newUsernameLength / user.username.length) * 100;
                    if (percent > 80) {
                        isUsernameDuplicate = true;
                        break;
                    }
                }

                if (isUsernameDuplicate) {
                    arrContentOfDuplicateColumns.push(
                        `username: ${res_payload.username} trùng trên 80% kí tự`
                    );
                }
            }

            const templatePayload = {
                student_name: `${res_payload.full_name} - ${res_payload.username}`,
                content_of_duplicate_columns:
                    arrContentOfDuplicateColumns.join(', '),
                email: res_payload.email,
                phone_number: res_payload.phone_number,
                username: res_payload.username
            };

            // Thông báo cho admin
            const adminOwner = await AdminActions.findOne({
                username: 'admin'
            });
            if (adminOwner) {
                natsClient.publishEventWithTemplate({
                    template: notiTemplate.content,
                    data: templatePayload,
                    receiver: adminOwner._id,
                    template_obj_id: notiTemplate._id
                });
            }

            // Thông báo cho HCNS
            const hcnsDepartment = await DepartmentModel.findOne({
                unsignedName: CODE_DEPARTMENT.HCNS
            });
            if (hcnsDepartment) {
                const listHCNS = await AdminModel.find({
                    'department.department': hcnsDepartment._id
                });

                if (listHCNS.length) {
                    listHCNS.forEach((element) => {
                        natsClient.publishEventWithTemplate({
                            template: notiTemplate.content,
                            data: templatePayload,
                            receiver: element._id,
                            template_obj_id: notiTemplate._id
                        });
                    });
                }
            }
        }

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Y het nhu ham createUserByAdmin, chi la duoc forward boi
     * route POST request sang controller khi admin chi muon tao
     * user profile, khong muon tao teacher hay student profile
     */
    public static async createUserAdminRequest(
        req: ProtectedRequest,
        res: Response
    ) {
        const res_payload = await UserController.createUserByAdmin(req);
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Mot nguoi register mot user profile
     * Request type: POST
     * Role: User
     * Parameters: - email            : body: Email cua user moi
     *             - password         : body: Mat khau cua user moi
     *             - phone_number     : body: SDT cua user
     *             - first_name       : body: Ten cua user
     *             - last_name        : body: Ho cua user
     *             - gender           : body: Gioi tinh
     *             - date_of_birth    : body: Ngay sinh
     *             - address          : body: Dia chi
     *             - avatar           : body: Duong dan den hinh avatar
     *             - intro            : body: Loi gioi thieu user
     * Response: - 200: OK, tao thanh cong user, tra ve user
     *           - 400: Bad Request
     */
    public static async createUserByGuest(req: ProtectedRequest) {
        const default_admin_set_field = {
            role: req.body.role
                ? req.body.role
                : [RoleCode.STUDENT] /* Default role as STUDENT */,
            regular_times: [],
            is_active: false,
            is_verified_phone: false,
            is_verified_email: false,
            login_counter: 0
        };
        const user = await UserController.createUser(
            req,
            default_admin_set_field
        );
        const userInfo = _.pick(user, [
            '_id',
            'id',
            'role',
            'email',
            'first_name',
            'last_name',
            'login_counter',
            'phone_number',
            'is_verified_email',
            'is_verified_phone'
        ]);
        return userInfo;
    }

    /*
     * Summary: Create a verifyUrl and send an email to user
     */
    public static async createVerifyUrl(
        userId: number,
        email: string,
        name: string
    ) {
        const token = emailCacheTokenUtils(email ? email : '');
        const cache_user = await cacheService.get(token);
        if (!cache_user) {
            const objCache = {
                id: userId,
                need_email_verification: true
            };
            await cacheService.set(token, objCache, EXPIRE_TIME);
            const url = `${BASE_URL}/user/verify-email?token=${token}`;
            const template = await TemplateActions.findOne({
                code: EmailTemplate.VERIFY_EMAIL_FOR_TEACHER
            });
            if (template)
                JobQueueServices.sendMailWithTemplate({
                    to: email,
                    subject: template.title,
                    body: template.content,
                    data: { name, url }
                });
        }
        return { message: 'Verify URL created' };
    }

    public static async resendVerifyUrl(req: ProtectedRequest, res: Response) {
        const { email, user_name } = req.body;
        if (!email || email.length <= 0) {
            throw new BadRequestError(req.t('errors.user.email_required'));
        }
        if (!user_name || user_name.length <= 0) {
            throw new BadRequestError(req.t('errors.user.username_required'));
        }
        const token = emailCacheTokenUtils(email);

        const resendToken = token + '-resending-verify';
        const cacheResending = await cacheService.get(resendToken);
        if (cacheResending && cacheResending.resending_verify) {
            throw new BadRequestError(req.t('errors.user.verification_sent'));
        }
        const filter: any = {
            email,
        }
        if(user_name){
            filter.username = user_name;
        }
        const user = await UserActions.findOne(filter);
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        if (user.is_verified_email && user_name) {
            throw new BadRequestError(req.t('errors.user.verified'));
        }

        await cacheService.set(resendToken, { resending_verify: true }, 5 * 60);

        const cacheUser = await cacheService.get(token);
        if (!cacheUser) {
            /* In case the existing token has timed out */
            await UserController.createVerifyUrl(
                user.id,
                user.email,
                user.first_name
            );
        } else {
            const url = `${BASE_URL}/user/verify-email?token=${token}`;
            const template = await TemplateActions.findOne({
                code: EmailTemplate.VERIFY_EMAIL_FOR_TEACHER
            });
            if (template)
                JobQueueServices.sendMailWithTemplate({
                    to: email,
                    subject: template.title,
                    body: template.content,
                    data: {
                        name: user.first_name,
                        url
                    }
                });
        }

        return new SuccessResponse('success', {
            message: 'Verification Email Resent'
        }).send(res, req);
    }

    /*
     * Summary: For users to verify their own email
     */
    public static async verifyEmail(req: ProtectedRequest, res: Response) {
        const { token } = req.query;
        let verify_result = StatusCode.SUCCESS;
        let access_token;

        const cacheUser = await cacheService.get(token);

        if (!cacheUser || !cacheUser.need_email_verification) {
            verify_result = StatusCode.FAILURE;
        }

        if (StatusCode.SUCCESS == verify_result) {
            const user = await UserActions.findOne({ id: cacheUser.id });

            if (user && !user.is_verified_email) {
                if (user.role.includes(RoleCode.STUDENT)) {
                    /** Update other student users with the same email */
                    await UserActions.verifyEmailForMultipleStudents(
                        user.email
                    );
                    const DataStudentEmail = await UserActions.findAll({ email: user.email });
                    if(DataStudentEmail){
                        for await (const student of DataStudentEmail){
                            const notification_template = await TemplateActions.findOne({
                                code: BackEndNotification.NOTIFICATION_VIA_STUDENT_EMAIL
                            });
                            if (notification_template) {
                                    const payload = {
                                        student_name: student?.full_name,
                                        user_name: student?.username,
                                        email: student?.email,
                                        status: 'ON'
                                    };
                                    // send to admin
                                    const adminOwner = await AdminActions.findOne({
                                        username: 'admin'
                                    });
                                    if (adminOwner) {
                                        natsClient.publishEventWithTemplate({
                                            template: notification_template.content,
                                            data: payload,
                                            receiver: adminOwner._id,
                                            template_obj_id: notification_template._id
                                        });
                                    }
            
                                    // send to CS
                                    const operationIssue =
                                        await OperationIssueActions.create({
                                            booking_id: null,
                                            issue_description:
                                                'Student on notification via email',
                                            resolved_staff_id: null
                                        } as any);
                                    const operationIssueId = operationIssue?._id;
            
                                    const cskhDepartment = await DepartmentModel.findOne({
                                        unsignedName: CODE_DEPARTMENT.CSKH
                                    });
                                    if (cskhDepartment) {
                                        const managerCskh = await AdminModel.findOne({
                                            department: {
                                                department: cskhDepartment._id,
                                                isRole: EnumRole.Manager
                                            }
                                        });
                                        if (managerCskh) {
                                            natsClient.publishEventWithTemplate({
                                                template: notification_template.content,
                                                data: payload,
                                                receiver: managerCskh._id,
                                                template_obj_id: notification_template._id,
                                                operation_issue_id: operationIssueId
                                            });
                                        }
                                        const listDeputy = await AdminModel.find({
                                            'department.department': cskhDepartment._id,
                                            'department.isRole': EnumRole.Deputy_manager
                                        });
                                        if (listDeputy.length) {
                                            listDeputy.forEach((element) => {
                                                natsClient.publishEventWithTemplate({
                                                    template: notification_template.content,
                                                    data: payload,
                                                    receiver: element._id,
                                                    template_obj_id:
                                                        notification_template._id,
                                                    operation_issue_id: operationIssueId
                                                });
                                            });
                                        }
                                        const listLeader = await AdminModel.find({
                                            'department.department': cskhDepartment._id,
                                            'department.isRole': EnumRole.Leader
                                        });
                                        if (listLeader.length) {
                                            listLeader.forEach((element: any) => {
                                                natsClient.publishEventWithTemplate({
                                                    template: notification_template.content,
                                                    data: payload,
                                                    receiver: element._id,
                                                    template_obj_id:
                                                        notification_template._id,
                                                    operation_issue_id: operationIssueId
                                                });
                                            });
                                        }
                                        // thông báo cho nhân viên quản lý
                                        const studentUser = await StudentModel.findOne({
                                            user_id: student.id
                                        }).populate('staff');
                                        const checkExits = listLeader.find(
                                            (e) => e.id === studentUser?.staff?.id
                                        );
                                        if (
                                            studentUser &&
                                            studentUser?.staff &&
                                            !checkExits
                                        ) {
                                            natsClient.publishEventWithTemplate({
                                                template: notification_template.content,
                                                data: payload,
                                                receiver: studentUser.staff._id,
                                                template_obj_id: notification_template._id,
                                                operation_issue_id: operationIssueId
                                            });
                                        }
                                    }
                            }
                        }
                    }
                } else {
                    await UserActions.update(user?._id, {
                        is_verified_email: true
                    } as User);
                }
                /** Create access token so that we can log the new student in right away */
                access_token = await createToken(user, false, USER_SECRET);
            } else {
                verify_result = StatusCode.FAILURE;
            }
        }
        let verify_page = `${WEBAPP_URL}/verify-email?status=${verify_result}`;
        if (StatusCode.SUCCESS == verify_result) {
            verify_page = `${verify_page}&access_token=${access_token}`;
        }
        return new RedirectResponse(verify_page).redirect(res);
    }

    /*
     * Summary: Send a reset password url to user emails so users can reset
     *          their password in case they forget their password
     */
    public static async sendResetPasswordUrl(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_name, email } = req.body;
        const token = resetPassCacheTokenUtils(email);

        const resendToken = token + '-resending-reset-pass';
        const cacheResending = await cacheService.get(resendToken);
        if (cacheResending && cacheResending.resending_reset) {
            throw new BadRequestError(req.t('errors.user.reset_pass_sent'));
        }

        const user = await UserActions.findOne({ username: user_name, email });
        /*
         * In case someone wants to check if others' emails are already registered,
         * we will give them no such information, return success nevertheless
         */
        if (!user)
            throw new BadRequestError(req.t('errors.user.username_or_email_incorrect'));
        if (!user.is_active)
            throw new BadRequestError(req.t('errors.user.inactive'));

        await cacheService.set(resendToken, { resending_reset: true }, 5 * 60);

        const objCache = {
            id: user.id,
            email,
            need_reset_password: true
        };
        await cacheService.set(token, objCache, 15 * 60);
        /*
         * For now we will use the reset password request URL. When webclient
         * creates a new page just for setting password, we will use that URL
         * instead
         */
        const url = `${WEBAPP_URL}/reset-password?key=${token}`;
        const template = await TemplateActions.findOne({
            code: EmailTemplate.FORGET_PASSWORD
        });
        if (!template)
            throw new BadRequestError(req.t('errors.template.not_found'));
        JobQueueServices.sendMailWithTemplate({
            to: email,
            subject: template.title,
            body: template.content,
            data: {
                name: user.first_name,
                url: url
            }
        });
        return new SuccessResponse('success', {
            message: 'Reset Email sent'
        }).send(res, req);
    }

    /*
     * Summary: User reset their password in case they forget their own
     */
    public static async resetPassword(req: PublicRequest, res: Response) {
        const { new_password, token } = req.body;

        const cacheUser = await cacheService.get(token);

        if (!cacheUser || !cacheUser.need_reset_password) {
            throw new BadRequestError(req.t('errors.user.token_exprire'));
        }

        const users = await UserActions.findAll({ email: cacheUser.email });
        if (!users || !users.length)
            throw new BadRequestError(req.t('errors.user.cant_reset_pass'));
        for (const user of users) {
            user.password = new_password;
            user.is_password_null = false;
            await user.save();
        }

        return new SuccessResponse('success', {
            message: 'Password updated'
        }).send(res, req);
    }

    /*
     * Summary: User change password or user set password the first time they
     *          sign-in by Google
     * Role: User
     * Request type: PUT
     * Parameters: - old_password: body: +) User's old password
     *                                   +) An empty string if this is the
     *                                      first time user log in by using
     *                                      Google sign-in
     */
    public static async changePassword(req: ProtectedRequest, res: Response) {
        const { id } = req.user;
        const { current_password, new_password } = req.body;

        const user = await UserActions.findOne(
            { id },
            { password: 1, is_password_null: 1 }
        );
        if (!user) throw new InternalError(req.t('errors.user.not_found'));

        // @ts-ignore
        const isMatch = await user.comparePassword(current_password);
        if (!user.is_password_null && !isMatch) {
            throw new BadRequestError(req.t('errors.user.incorrect_password'));
        }
        user.password = new_password;
        user.is_password_null = false;
        await user.save();

        return new SuccessResponse('success', {
            message: 'Password updated'
        }).send(res, req);
    }

    private static async editUser(req: ProtectedRequest, user: User) {
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'UserModel',
            user,
            pickUpData
        );
        const diff = { ...req.body };
        if (diff.id) delete diff.id;
        if (diff.password) delete diff.password;

        if (diff.first_name || diff.last_name) {
            diff.first_name = diff.first_name
                ? diff.first_name
                : user.first_name;
            diff.last_name = diff.last_name ? diff.last_name : user.last_name;
            diff.full_name = `${diff.first_name} ${diff.last_name}`;
        } else {
            diff.full_name = user.full_name;
        }

        if (diff.date_of_birth) {
            diff.date_of_birth = new Date(diff.date_of_birth);
        }

        if (diff.hasOwnProperty('regular_times')) {
            if (!Array.isArray(diff.regular_times)) {
                throw new BadRequestError(
                    req.t('errors.user.no_regular_times_array')
                );
            }
            const timestamp_set = new Set<number>();
            diff.regular_times.forEach((timestamp: any) => {
                if (
                    isNaN(timestamp) ||
                    timestamp >= WEEK_TO_MS ||
                    !isValidStartTimestamp(timestamp)
                ) {
                    throw new BadRequestError(
                        req.t('errors.user.invalid_time_input')
                    );
                }
                timestamp_set.add(timestamp);
            });
            const booked_regular_times =
                await RegularCalendarController.getAllBookedRegularTimesOfUser(
                    user
                );
            for (const time of booked_regular_times) {
                if (!timestamp_set.has(time)) {
                    throw new BadRequestError(
                        req.t('errors.user.remove_booked_regular')
                    );
                }
            }
            /**
             * If user's a teacher, remove all unbooked flexible calendar
             * in the future that matches the new regular calendar
             */
            if (user.role.includes(RoleCode.TEACHER)) {
                await CalendarControllers.removeAllCalendarMatchingRegularsOfTeacher(
                    user.id,
                    diff.regular_times
                );
            }
            diff.regular_times = Array.from(timestamp_set);
            diff.regular_times.sort((a: number, b: number) => {
                return a - b;
            });
        }

        // validate country, currency, timezone
        if (diff.hasOwnProperty('country') && diff.country) {
            const countryCode = Object.keys(countries).filter(
                (item, index) => item === diff.country
            );
            if (!countryCode[0])
                throw new BadRequestError(req.t('errors.user.invalid_country'));
        }

        if (diff.hasOwnProperty('currency')) {
            const checkCurrency = Object.keys(countries).filter(
                (item, index) =>
                    _.get(_.get(countries, item), 'currency') === diff.currency
            );
            if (!checkCurrency[0])
                throw new BadRequestError(
                    req.t('errors.user.invalid_currency')
                );
        }

        if (diff.hasOwnProperty('timezone') && diff.timezone) {
            logger.info(`---Timezone : ${diff.timezone}`);

            const hasTimezone = timeZones.some(
                (item) => item.t === diff.timezone || item.vl === diff.timezone
            );
            if (!hasTimezone) {
                throw new BadRequestError(
                    req.t('errors.user.invalid_timezone')
                );
            }
        }

        if (_.has(diff, 'staff_id')) {
            if (user.role.includes(RoleCode.STUDENT)) {
                /** Temporary codes: Merge staff in student and teacher in the next phase */
                await StudentControllers.assignStaff(req, user.id);
            }
        }
        console.log(diff)
        const new_data = await UserActions.update(user._id, diff as User);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'UserModel',
            new_data,
            pickUpData
        );
        if(_.has(diff, 'is_enable_receive_mail')) {
            const notification_template = await TemplateActions.findOne({
                code: BackEndNotification.NOTIFICATION_VIA_STUDENT_EMAIL
            });
            if (notification_template) {
                const student = await UserActions.findOne({ id: user.id});
                    const payload = {
                        student_name: student?.full_name,
                        user_name: student?.username,
                        email: student?.email,
                        status: diff?.is_enable_receive_mail ? 'ON' : 'OFF'
                    };
                    // send to admin
                    const adminOwner = await AdminActions.findOne({
                        username: 'admin'
                    });
                    if (adminOwner) {
                        natsClient.publishEventWithTemplate({
                            template: notification_template.content,
                            data: payload,
                            receiver: adminOwner._id,
                            template_obj_id: notification_template._id
                        });
                    }

                    // send to CS
                    const operationIssue =
                        await OperationIssueActions.create({
                            booking_id: null,
                            issue_description:
                                'Student on notification via email',
                            resolved_staff_id: null
                        } as any);
                    const operationIssueId = operationIssue?._id;

                    const cskhDepartment = await DepartmentModel.findOne({
                        unsignedName: CODE_DEPARTMENT.CSKH
                    });
                    if (cskhDepartment) {
                        const managerCskh = await AdminModel.findOne({
                            department: {
                                department: cskhDepartment._id,
                                isRole: EnumRole.Manager
                            }
                        });
                        if (managerCskh) {
                            natsClient.publishEventWithTemplate({
                                template: notification_template.content,
                                data: payload,
                                receiver: managerCskh._id,
                                template_obj_id: notification_template._id,
                                operation_issue_id: operationIssueId
                            });
                        }
                        const listDeputy = await AdminModel.find({
                            'department.department': cskhDepartment._id,
                            'department.isRole': EnumRole.Deputy_manager
                        });
                        if (listDeputy.length) {
                            listDeputy.forEach((element) => {
                                natsClient.publishEventWithTemplate({
                                    template: notification_template.content,
                                    data: payload,
                                    receiver: element._id,
                                    template_obj_id:
                                        notification_template._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        const listLeader = await AdminModel.find({
                            'department.department': cskhDepartment._id,
                            'department.isRole': EnumRole.Leader
                        });
                        if (listLeader.length) {
                            listLeader.forEach((element: any) => {
                                natsClient.publishEventWithTemplate({
                                    template: notification_template.content,
                                    data: payload,
                                    receiver: element._id,
                                    template_obj_id:
                                        notification_template._id,
                                    operation_issue_id: operationIssueId
                                });
                            });
                        }
                        // thông báo cho nhân viên quản lý
                        const studentUser = await StudentModel.findOne({
                            user_id: student?.id
                        }).populate('staff');
                        const checkExits = listLeader.find(
                            (e) => e.id === studentUser?.staff?.id
                        );
                        if (
                            studentUser &&
                            studentUser?.staff &&
                            !checkExits
                        ) {
                            natsClient.publishEventWithTemplate({
                                template: notification_template.content,
                                data: payload,
                                receiver: studentUser.staff._id,
                                template_obj_id: notification_template._id,
                                operation_issue_id: operationIssueId
                            });
                        }
                    }
            }
        }
        return { message: req.t('common.update_success') };
    }

    public static async editUserByAdmin(req: ProtectedRequest, res: Response) {
        const { user_id } = req.params;

        const user = await UserActions.findOne({
            id: parseInt(user_id as string)
        });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));

        const diff = { ...req.body };
        if (diff.username !== user.username) {
            const checkUsername = await UserActions.findOne({
                username: diff.username
            });
            if (checkUsername)
                throw new BadRequestError(req.t('errors.user.user_exist'));
        }
        if (diff.password) {
            await UserActions.updatePassword(
                _.toInteger(user_id),
                diff.password
            );
            delete diff.password;
        }
        const mesg = await UserController.editUser(req, user);

        return new SuccessResponse('success', mesg).send(res, req);
    }

    public static async editTeacherByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id } = req.params;

        const user = await UserActions.findOne({
            id: parseInt(user_id as string)
        });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const diff = { ...req.body };
        if (diff.username !== user.username) {
            const checkUsername = await UserActions.findOne({
                username: diff.username
            });
            if (checkUsername)
                throw new BadRequestError(req.t('errors.user.user_exist'));
        }
        if (diff.password) {
            await UserActions.updatePassword(
                _.toInteger(user_id),
                diff.password
            );
            delete diff.password;
        }
        const mesg = await UserController.editUserTeacher(req, user);
        return new SuccessResponse('success', mesg).send(res, req);
    }

    private static async editUserTeacher(req: ProtectedRequest, user: User) {
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'UserModel',
            user,
            pickUpData
        );

        const diff = { ...req.body };

        if (diff.id) delete diff.id;
        if (diff.password) delete diff.password;

        if (diff.first_name || diff.last_name) {
            diff.first_name = diff.first_name
                ? diff.first_name
                : user.first_name;
            diff.last_name = diff.last_name ? diff.last_name : user.last_name;
            diff.full_name = `${diff.first_name} ${diff.last_name}`;
        } else {
            diff.full_name = user.full_name;
        }

        if (diff.date_of_birth) {
            diff.date_of_birth = new Date(diff.date_of_birth);
        }

        if (diff.hasOwnProperty('regular_times')) {
            if (!Array.isArray(diff.regular_times)) {
                throw new BadRequestError(
                    req.t('errors.user.no_regular_times_array')
                );
            }
            const timestamp_set = new Set<number>();
            diff.regular_times.forEach((timestamp: any) => {
                if (
                    isNaN(timestamp) ||
                    timestamp >= WEEK_TO_MS ||
                    !isValidStartTimestamp(timestamp)
                ) {
                    throw new BadRequestError(
                        req.t('errors.user.invalid_time_input')
                    );
                }
                timestamp_set.add(timestamp);
            });
            const booked_regular_times =
                await RegularCalendarController.getAllBookedRegularTimesOfUser(
                    user
                );
            for (const time of booked_regular_times) {
                if (!timestamp_set.has(time)) {
                    throw new BadRequestError(
                        req.t('errors.user.remove_booked_regular')
                    );
                }
            }
            /**
             * If user's a teacher, remove all unbooked flexible calendar
             * in the future that matches the new regular calendar
             */
            if (user.role.includes(RoleCode.TEACHER)) {
                await CalendarControllers.removeAllCalendarMatchingRegularsOfTeacher(
                    user.id,
                    diff.regular_times
                );
            }
            diff.regular_times = Array.from(timestamp_set);
            diff.regular_times.sort((a: number, b: number) => {
                return a - b;
            });
        }

        // validate country, currency, timezone
        if (diff.hasOwnProperty('country')) {
            const countryCode = Object.keys(countries).filter(
                (item, index) => item === diff.country
            );
            if (!countryCode[0])
                throw new BadRequestError(req.t('errors.user.invalid_country'));
        }

        if (diff.hasOwnProperty('currency')) {
            const checkCurrency = Object.keys(countries).filter(
                (item, index) =>
                    _.get(_.get(countries, item), 'currency') === diff.currency
            );
            if (!checkCurrency[0])
                throw new BadRequestError(
                    req.t('errors.user.invalid_currency')
                );
        }

        if (diff.hasOwnProperty('timezone')) {
            logger.info(`---Timezone : ${diff.timezone}`);

            const hasTimezone = timeZones.some(
                (item) => item.t === diff.timezone || item.vl === diff.timezone
            );
            if (!hasTimezone) {
                throw new BadRequestError(
                    req.t('errors.user.invalid_timezone')
                );
            }
        }

        if (_.has(diff, 'staff_id')) {
            if (user.role.includes(RoleCode.STUDENT)) {
                /** Temporary codes: Merge staff in student and teacher in the next phase */
                await StudentControllers.assignStaff(req, user.id);
            }
        }

        if (user.is_active === true && diff.is_active === false) {
            await CalendarControllers.removeFutureCalendarMatchingOfTeacherInactive(
                req,
                user.id
            );
            //  clear regular_time off treacher inactice
            diff.regular_times = [];
        }
        const new_data = await UserActions.update(user._id, diff as User);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'UserModel',
            new_data,
            pickUpData
        );
        return { message: req.t('common.update_success') };
    }

    public static async editUserByThemShelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const user = req.user;

        /* There are some fields that can only be edited by admins */
        const diff = { ...req.body };
        const invalidFields = [
            'role',
            'is_active',
            'is_verified_phone',
            'is_verified_email',
            'login_counter',
            'last_login_ip',
            'last_login',
            'updated_time'
        ];
        invalidFields.forEach((field) => {
            if (diff.hasOwnProperty(field)) {
                throw new BadRequestError(
                    req.t('errors.user.edit_invalid_field')
                );
            }
        });
        if (diff.hasOwnProperty('regular_times')) {
            if (!req.user.role.includes(RoleCode.STUDENT)) {
                throw new BadRequestError(
                    req.t('errors.authentication.permission_denied')
                );
            }
        }

        const mesg = await UserController.editUser(req, user);
        return new SuccessResponse('success', mesg).send(res, req);
    }

    /*
     * @description Set the regular times for students to learn, for teachers to teach
     * @param regular_times <number[]> - An array of timestamp in week
     * @parma user_id <number> - ID of the user
     * @return OK message or BadRequestErro
     */
    public static async setUserRegularTimes(
        req: ProtectedRequest,
        regular_times: number[],
        user_id: number
    ) {
        const user = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        if (
            !user.regular_times ||
            !isTheSameTimestampSet(regular_times, user.regular_times)
        ) {
            /* Only change DB if there is a change */
            const regular_set_req = {
                body: { regular_times },
                t: req.t,
                user: req.user
            };
            await UserController.editUser(
                regular_set_req as ProtectedRequest,
                user
            );
        }
        const msg = { ok: true };
        return msg;
    }

    /*
     * @description get the regular timestamp array of an user
     * @param: id <number> - ID of the user
     * @return: the regular timestamp array or BadRequestError
     */
    private static async getAnUserRegularTimes(
        req: ProtectedRequest,
        id: number
    ): Promise<number[]> {
        const user = await UserActions.findOne({ id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const regular_times = user.regular_times ? user.regular_times : [];
        return regular_times;
    }

    /*
     * @description GET request from admin to get the regular times of an user
     * @return SuccessResponse or BadRequestError
     */
    public static async getUserRegularTimesByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id } = req.params;
        const regular_times = await UserController.getAnUserRegularTimes(
            req,
            parseInt(user_id as string)
        );
        return new SuccessResponse('success', regular_times).send(res, req);
    }

    /*
     * @description GET request from users to check their own regular times
     * @return SuccessResponse or BadRequestError
     */
    public static async getUserRegularTimesByThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const regular_times = await UserController.getAnUserRegularTimes(
            req,
            id
        );
        return new SuccessResponse('success', regular_times).send(res, req);
    }

    public static async getFullInfoUser(
        id: number,
        req: ProtectedRequest,
        res: Response
    ) {
        const user = await UserActions.findOne({ id: id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        return new SuccessResponse('success', user).send(res, req);
    }

    /**
     * @description GET request from admin to get profile of a specific user
     * @urlParam user_id <number> - ID of the user
     * @returns SuccessResponse with user profile or BadRequestError
     */
    public static async getFullInfoUserByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id } = req.params;
        await UserController.getFullInfoUser(
            parseInt(user_id as string),
            req,
            res
        );
    }

    /**
     * @description GET request from users to get profile of themshelves
     * @returns SuccessResponse with user profile or BadRequestError
     */
    public static async getFullInfoUserByThemshelves(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        await UserController.getFullInfoUser(id, req, res);
    }

    private static async getUsersByRoleAndActiveStatus(
        req: Request,
        res: Response,
        role: RoleCode
    ) {
        const { status, page_size, page_number, search, q } = req.query;
        const filter: any = {
            role: [role],
            search: search ? (search as string) : '',
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            filter.is_active = status === 'active';
        }
        if (q) _.set(filter, 'name', q as string);
        let users = await UserActions.findAllAndPaginated(filter);
        users = await Promise.all(
            users.map(async (u) => {
                const tmp: any = {
                    ...u.toJSON()
                };
                const student = await StudentActions.findOne({ user_id: u.id });
                if (student) {
                    tmp.student = student;
                }
                return tmp;
            })
        );
        _.sortBy(users, '-created_time');
        const count = await UserActions.count(filter);
        const res_payload = {
            data: users,
            pagination: {
                total: count
            }
        };
        return res_payload;
    }

    private static async getUsersByRoleAndSupporter(
        req: Request,
        res: Response,
        role: RoleCode,
        staff_id: any
    ) {
        const { status, page_size, page_number, search, q } = req.query;
        const filter: any = {
            role: [role],
            search: search ? (search as string) : '',
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            filter.is_active = status === 'active';
        }
        if (staff_id) {
            filter['student.staff_id'] = staff_id;
        }
        if (q) _.set(filter, 'name', q as string);
        const users: any = await UserActions.findAllAndPaginatedBySupported(
            filter
        );
        let res_payload = {
            data: {},
            pagination: {
                total: 0
            }
        };
        if (users && Array.isArray(users) && users.length > 0) {
            res_payload = {
                data: users[0].data,
                pagination: {
                    total: users[0].pagination.total
                }
            };
        }
        return res_payload;
    }

    public static async getStudentByActiveStatus(
        req: ProtectedRequest,
        res: Response
    ) {
        const res_payload = await UserController.getUsersByRoleAndActiveStatus(
            req,
            res,
            RoleCode.STUDENT
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllStudentBySupporter(
        req: ProtectedRequest,
        res: Response
    ) {
        let staff_id = null;
        if (
            req.user.department.isRole === EnumRole.Manager ||
            req.user.department.isRole === EnumRole.Deputy_manager
        ) {
            staff_id = null;
        } else if (req.user.department.isRole === EnumRole.Leader) {
            let arrStaff: any = [];
            let team = await TeamActions.findOne({
                filter: { leader: req.user._id }
            } as any);
            arrStaff.push(req.user.id);
            if (team) {
                team.members.forEach((element) => {
                    arrStaff.push(element.id);
                });
            }
            staff_id = { $in: arrStaff };
        } else {
            staff_id = Number(req.user.id);
        }
        const res_payload = await UserController.getUsersByRoleAndSupporter(
            req,
            res,
            RoleCode.STUDENT,
            staff_id
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTeacherByActiveStatus(
        req: ProtectedRequest,
        res: Response
    ) {
        const res_payload = await UserController.getUsersByRoleAndActiveStatus(
            req,
            res,
            RoleCode.TEACHER
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getUsersByString(req: Request, res: Response) {
        const { page_size, page_number, q, role } = req.query;
        const filter: any = {
            is_active: true,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (role && role === 'STUDENT') filter.role = [RoleCode.STUDENT];
        if (role && role === 'TEACHER') filter.role = [RoleCode.TEACHER];
        if (q) {
            _.set(filter, 'search', q as string);
        }
        const users = await UserActions.findAllAndPaginated(filter);
        const count = await UserActions.count(filter);
        const res_payload = {
            data: users,
            pagination: {
                total: count
            }
        };
        new SuccessResponse('Success', res_payload).send(res, req);
    }

    public static async updateUserBankAccount(
        req: ProtectedRequest,
        res: Response
    ) {
        const user_id = req.user.id || req.body.user_id;
        const user = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        await UserActions.update(user._id, {
            bank_account: req.body.bank_account
        } as User);
        return new SuccessResponse('Success', { message: 'Successful' }).send(
            res,
            req
        );
    }

    public static async isValuableUser(req: ProtectedRequest, res: Response) {
        const user = req.user;
        let is_valuable = true;
        if (user.role.includes(RoleCode.STUDENT)) {
            is_valuable =
                is_valuable && (await UserActions.checkUserValuable(user.id));
        }
        return new SuccessResponse('Success', { is_valuable }).send(res, req);
    }

    public static async getAllStudentsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { type } = req.query;
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };

        switch (type) {
            case 'standard': {
                const { page_size, page_number, search } = req.query;
                const student_filter: any = {
                    page_size: parseInt(page_size as string),
                    page_number: parseInt(page_number as string),
                    search: search as string
                };
                const order_filter = {
                    type: [EnumPackageOrderType.STANDARD],
                    activation_date: { $ne: null },
                    $expr: {
                        $gte: [
                            {
                                $sum: [
                                    '$activation_date',
                                    { $multiply: ['$day_of_use', DAY_TO_MS] }
                                ]
                            },
                            new Date().getTime()
                        ]
                    }
                };
                const excluding_filter = {
                    type: [EnumPackageOrderType.PREMIUM]
                };
                const res_agg =
                    await OrderedPackageActions.getStudentsFromOrderType(
                        student_filter,
                        order_filter,
                        excluding_filter
                    );
                if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
                    res_payload.data = res_agg[0].data;
                    res_payload.pagination.total = res_agg[0].pagination.total;
                }
                break;
            }
            case 'premium': {
                const { page_size, page_number, search } = req.query;
                const student_filter: any = {
                    page_size: parseInt(page_size as string),
                    page_number: parseInt(page_number as string),
                    search: search as string
                };
                const order_filter = {
                    type: [EnumPackageOrderType.PREMIUM],
                    activation_date: { $lte: new Date().getTime() },
                    $and: [
                        {
                            $expr: {
                                $lt: ['$number_class', '$original_number_class']
                            }
                        },
                        {
                            $expr: {
                                $gte: [
                                    {
                                        $sum: [
                                            '$activation_date',
                                            {
                                                $multiply: [
                                                    '$day_of_use',
                                                    DAY_TO_MS
                                                ]
                                            }
                                        ]
                                    },
                                    new Date().getTime()
                                ]
                            }
                        }
                    ]
                };
                const excluding_filter = {
                    type: [EnumPackageOrderType.STANDARD]
                };
                const res_agg =
                    await OrderedPackageActions.getStudentsFromOrderType(
                        student_filter,
                        order_filter,
                        excluding_filter
                    );
                if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
                    res_payload.data = res_agg[0].data;
                    res_payload.pagination.total = res_agg[0].pagination.total;
                }
                break;
            }
            case 'trial': {
                /** Need to do more test to confirm the above methods work for trial too */
                await TrialBookingController.getTrialStudentList(req, res);
                return;
            }
            default: {
                await UserController.getStudentByActiveStatus(req, res);
                return;
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async loginByAdmin(req: ProtectedRequest, res: Response) {
        const user_id = req.params.user_id;
        const user = await UserActions.findOne({
            id: parseInt(user_id as string)
        });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        if (!user.is_active)
            throw new BadRequestError(req.t('errors.user.inactive'));
        // if (!user.is_verified_email) {
        //     throw new EmailNotVerifyError(
        //         req.t('errors.user.email_not_verified')
        //     );
        // }
        const access_token = await createToken(user, false, USER_SECRET);
        return new SuccessResponse('Success', {
            url: `${WEBAPP_URL}/?token=${access_token}`
        }).send(res, req);
    }

    public static async updateActiveStatusByCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        let count = 0;
        const users = await UserActions.findAll({ is_active: true });
        await Promise.all(
            users.map(async (user) => {
                if (
                    user.last_login &&
                    moment().diff(user.last_login, 'days') > 90
                ) {
                    await UserActions.update(user._id, {
                        is_active: false
                    } as User);
                    count += 1;
                    if (user.role.includes(RoleCode.TEACHER)) {
                        const teacher = await TeacherActions.findOne({
                            user_id: user.id
                        });
                        if (teacher) {
                            await TeacherActions.update(teacher._id, {
                                'user.is_active': false
                            } as any);
                        }
                    }
                }
            })
        );
        return new SuccessResponse('Success', { count }).send(res, req);
    }

    public static async notiHappyBirthDay(
        req: ProtectedRequest,
        res: Response
    ) {
        const users = await UserModel.aggregate([
            {
                $match: {
                    date_of_birth: { $exists: true },
                    $expr: {
                        $and: [
                            {
                                $eq: [
                                    { $dayOfMonth: '$date_of_birth' },
                                    { $dayOfMonth: new Date() }
                                ]
                            },
                            {
                                $eq: [
                                    { $month: '$date_of_birth' },
                                    { $month: new Date() }
                                ]
                            }
                        ]
                    }
                }
            }
        ]);
        for (const iterator of users) {
            const dataPayload = {};
            await natsClient.publishEventZalo(
                iterator,
                ZaloOANotification.HAPPY_BIRTHDAY,
                dataPayload
            );
        }
        return new SuccessResponse('Success', '').send(res, req);
    }

    public static async recoverAllBankName(
        req: ProtectedRequest,
        res: Response
    ) {
        try {
            logger.info('recoverAllBankName');
            const arrayUser = await UserActions.findAll({});
            logger.info(arrayUser.length);
            let responseCall = '';
            let index = 0;
            for await (const user of arrayUser) {
                logger.info(`------------------------------${index}`);
                const bankName = user?.bank_account?.bank_name;
                if (bankName) {
                    const objBank = BankList.find(
                        (x) => `${x.id}` === `${bankName}`
                    );

                    if (objBank) {
                        const BankAccount = {
                            ...user.bank_account,
                            bank_name: objBank.name
                        };

                        responseCall = await UserActions.update(user._id, {
                            bank_account: BankAccount
                        } as User);
                        logger.info(JSON.stringify(responseCall));
                    }
                }

                index++;
            }

            return new SuccessResponse(
                'success',
                'recoverAllBankName success'
            ).send(res, req);
        } catch (error) {
            logger.error('recoverAllBankName, Error: ', error);
            throw error;
        }
    }

    public static async createSkypeLink(req: ProtectedRequest, res: Response) {
        logger.info(`createSkypeLink >>>`);
        const skypeMeetingPoolInfo = await SkypeMeetingPoolActions.findOne({
            status: EnumStatus.NEW,
            is_active: true
        });
        logger.info(
            `createSkypeLink, skypeMeetingPoolInfo: ${JSON.stringify(
                skypeMeetingPoolInfo
            )}`
        );
        const res_payload = {
            trial_class_skype_url: skypeMeetingPoolInfo?.info
        };

        if (skypeMeetingPoolInfo) {
            await SkypeMeetingPoolActions.update(skypeMeetingPoolInfo._id, {
                status: EnumStatus.USED
            } as SkypeMeetingPool);
        }

        logger.info(`createSkypeLink <<<`);
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async addLinkSkypeForStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const user_id = req.params.user_id;
        const user = await UserActions.findOne({
            id: parseInt(user_id as string),
            role: RoleCode.STUDENT
        });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        if (!user.is_active)
            throw new BadRequestError(req.t('errors.user.inactive'));

        let learning_medium_info: any = {};
        if (!user?.trial_class_skype_url?.joinLink) {
            const skypeNew: any = await SkypeMeetingPoolActions.findOne({
                status: EnumStatus.NEW,
                is_active: true
            });

            if (skypeNew) {
                learning_medium_info = skypeNew.info;
                await SkypeMeetingPoolActions.update(skypeNew._id, {
                    status: EnumStatus.USED
                });
            }
        } else {
            throw new EmailNotVerifyError(
                req.t('errors.user.link_skype_is_exists')
            );
        }
        if (!learning_medium_info.joinLink) {
            throw new EmailNotVerifyError(
                req.t('errors.user.add_link_skype_failed')
            );
        }
        const data = await UserActions.update(user._id, {
            trial_class_skype_url: learning_medium_info
        } as User);
        return new SuccessResponse('Success', {
            data
        }).send(res, req);
    }

    public static async checkEmailOrPhoneNumberExists(
        req: ProtectedRequest,
        res: Response
    ) {
        const { email, phone_number, username } = req.query;
        if (phone_number) {
            const countUserByPhoneNumber = await UserActions.count({
                phone_number: phone_number as string
            });

            if (countUserByPhoneNumber > 1) {
                return new SuccessResponse('warning', {
                    confirm_msg: req.t('confirm.user.phone_number.exist')
                }).send(res, req);
            }
        }

        if (email) {
            const countUserByEmail = await UserActions.count({
                email: email as string
            });

            if (countUserByEmail > 1) {
                return new SuccessResponse('warning', {
                    confirm_msg: req.t('confirm.user.email.exist')
                }).send(res, req);
            }
        }

        if (username) {
            const newUsernameLength: any = username.length;
            const lstUsersWithLargerUsername = await UserActions.findAll({
                $expr: { $gt: [{ $strLenCP: '$username' }, newUsernameLength] },
                username: {
                    $regex: username,
                    $options: 'i'
                }
            });

            let isUsernameDuplicate = false;
            for (const user of lstUsersWithLargerUsername) {
                const percent =
                    (newUsernameLength / user.username.length) * 100;
                if (percent > 80) {
                    isUsernameDuplicate = true;
                    break;
                }
            }

            if (isUsernameDuplicate) {
                return new SuccessResponse('warning', {
                    confirm_msg: req.t('confirm.user.username.duplicate_80%')
                }).send(res, req);
            }
        }

        return new SuccessResponse('success', {}).send(res, req);
    }

    public static async sendMessageInteractiveToAllStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info('Start sendMessageInteractiveToAllStudent >>> ');
        const dataUser = await UserActions.getAllStudentLinkedWithZalo();
        if (!dataUser)
            throw new BadRequestError(req.t('errors.user.not_found'));
        logger.info('total send: ' + dataUser?.length);
        for await (const user of dataUser) {
            logger.info('send to user_id: ' + user?.id);
            const dataPayload = {
                student_name: user?.full_name,
                student_username: user?.username
            };
            await natsClient.publishEventZalo(
                user,
                ZaloOANotification.INTERACTIVE_REMINDER,
                dataPayload,
                ZALO_OA_MESSAGE_TYPE.TRANSACTION
            );
        }
        const responData = 'ok';
        logger.info('End sendMessageInteractiveToAllStudent <<< ');
        return new SuccessResponse('Success', {
            responData
        }).send(res, req);
    }

    public static async saveTemptAndGetLinkRegisterByCRM(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            customer_id,
            email,
            password,
            phone_number,
            first_name,
            username,
            last_name,
            gender,
            date_of_birth,
            skype_account,
            address,
            avatar,
            intro,
            sale_name,
            sale_email,
            sale_user_id,
            source,
            skype_info
        } = req.body;
        let linkRegister = '';
        const expired_time = 21600;
        const data_cache = {
            crm_user_id: customer_id,
            email,
            password,
            phone_number,
            first_name,
            username,
            last_name,
            gender,
            date_of_birth,
            skype_account,
            address,
            avatar,
            intro,
            sale_name,
            sale_email,
            sale_user_id,
            source,
            skype_info
        };
        const code_cache = CODE_CACHE_CRM + customer_id;
        await cacheService.set(code_cache, data_cache, expired_time);
        linkRegister = WEBAPP_URL + '/vi/register?crm_user_id='+customer_id;

        return new SuccessResponse('success', linkRegister).send(res, req);
    }

    public static async getUserById(req: ProtectedRequest, res: Response) {
        const { user_id } = req.body;
        const user: any = await UserActions.findOne(
            { id: user_id },
            { otp_code: 0 }
        );
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        return new SuccessResponse('success', user).send(res, req);
    }

    public static async getDataCacheForRegister(
        req: ProtectedRequest,
        res: Response
    ) {
        const { crm_user_id_cache } = req.query;
        const code_cache = CODE_CACHE_CRM + crm_user_id_cache;
        const data = await cacheService.get(code_cache);
        return new SuccessResponse('Success', { data }).send(res, req);
    }

    public static async randomNumber(length = 6) {
        let result = '';
        const characters = '0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
            counter += 1;
        }
        return result;
    }

    public static async sendOtpZaloZNS(phone_number: number) {
        logger.info(`sendOtpZaloZNS >>>`);
        const otp_code = await UserController.randomNumber(6);
        logger.info(`sendOtpZalo phone number: ` + phone_number);
        logger.info(`sendOtpZalo otp: ` + otp_code);
        if (phone_number && otp_code) {
            const dataPayload = {
                otp: otp_code
            };
            const dataId = 100000;
            await natsClient.publishEventZNS(
                dataId,
                ZNS_TEMPLATE.VERIFY_OTP,
                dataPayload,
                phone_number
            );
        } else {
            throw new BadRequestError('phone number is not exists');
        }
        logger.info(`sendOtpZaloZNS <<<`);
        return otp_code;
    }

    public static async verifyOtpPhone(req: ProtectedRequest, res: Response) {
        logger.info('start verify otp code >>');
        const { otp_code, user_id } = req.body;
        logger.info('user id:' + user_id);
        logger.info('otp code verify:' + otp_code);
        const user: any = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        if (user.otp_code == (otp_code as string)) {
            logger.info('verify success');
            await UserActions.update(user._id, {
                is_active: true,
                is_verified_phone: true
            } as User);
            logger.info(`active crm customer id: ${user?.crm_user_id}`);
            if (CRM_API_URL && user?.crm_user_id) {
                logger.info('start call api crm update status customer');
                try {
                    const route = `${CRM_API_URL}/api/active-customer/${user?.crm_user_id}`;
                    const headers = {
                        'Content-Type': 'application/json; charset=utf-8'
                    };
                    const response: any = await axios({
                        method: 'post',
                        url: route,
                        headers,
                        data: {
                            staff_id : user?.crm?.sale_id
                        }
                    });
                    logger.info(`respone data:  ${JSON.stringify(response?.data)}`);
                    if(!response && (response.data && response.data.message == 'error')){
                        logger.error('call api crm update status customer error');
                        throw new BadRequestError(req.t('Cập nhật trạng thái customer bên CRM có lỗi xảy ra. vui lòng liên hệ quản trị viên'));
                    }
                    logger.info(`active success`);
                } catch (err: any) {
                    logger.error(
                        'active crm customer, error: ',
                        err?.message
                    );
                    throw new BadRequestError(err?.message);
                }
            }
        } else {
            throw new BadRequestError(req.t('errors.user.otp_not_correct'));
        }
        logger.info('end verify otp code <<');
        return new SuccessResponse('Success', { message: 'Successful' }).send(
            res,
            req
        );
    }

    public static async resendOtpCode(req: ProtectedRequest, res: Response) {
        const { phone_number, user_id } = req.body;
        logger.info('user id:' + user_id);
        logger.info('phone number resend:' + phone_number);
        const user: any = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        if (phone_number) {
            const otpCode = await UserController.sendOtpZaloZNS(phone_number);
            logger.info('otp code verify:' + otpCode);
            if (otpCode) {
                await UserActions.update(user._id, {
                    otp_code: otpCode,
                    otp_sent_time: moment().valueOf()
                } as User);
            }
        }
        const userData: any = await UserActions.findOne({ id: user_id });
        return new SuccessResponse('success', userData).send(res, req);
    }
}
