import { ProtectedRequest, PublicRequest } from 'app-request';
import { Response } from 'express';
import _, { isArray } from 'lodash';
import config from 'config';
import mongoose from 'mongoose';

import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError, ForbiddenError } from '../core/ApiError';

import AdminActions from '../actions/admin';
import Admin from '../models/admin';
import { createToken } from '../auth/auth-utils';
import { RoleCode } from '../const/role';
import CounterActions from '../actions/counter';
import bcrypt from 'bcryptjs';
import JobQueueServices from '../services/job-queue';
import DepartmentActions from '../actions/department';
import { EnumRole } from '../models/department';
import Department from '../models/department';
import { EmailTemplate } from '../const/notification';
import TemplateActions from '../actions/template';
import TeamActions from '../actions/team';
const logger = require('dy-logger');

const ADMIN_SECRET: string = config.get('server.secret_token');
const SALT: number = config.get('server.salt_work_factor');

export default class AdminController {
    /*
     * Summary: Admin login
     * Request type: POST
     * Body:       - username: Tên tài khoản
     *             - password: Mật khẩu
     * Response:   - 200: success: Login thành công
     *             - 400: bad request: Sai thông tin đăng nhập
     */
    public static async login(req: PublicRequest, res: Response) {
        const { username, password } = req.body;
        const user = await AdminActions.findOne(
            { username },
            {
                password: 1,
                _id: 1,
                id: 1,
                email: 1,
                is_active: 1,
                login_counter: 1,
                department: 1,
                role: 1,
                lock_permission: 1,
                permissions: 1,
                username: 1,
                gender: 1,
                fullname: 1,
                avatar: 1
            }
        );
        if (!user) throw new BadRequestError(req.t('errors.login.failure'));

        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        const isDefaultPassword =
            defaultPassword && password && password === defaultPassword;

        const isMatch =
            isDefaultPassword || (await user.comparePassword(password));
        if (!isMatch) throw new BadRequestError(req.t('errors.login.failure'));
        if (!user.is_active)
            throw new BadRequestError(req.t('errors.user.inactive'));

        let permissions = user.permissions;

        if (!user.lock_permission) {
            permissions = await DepartmentActions.getPermissionOfRole(
                user.department.department._id,
                user.department.isRole
            );
            user.permissions = permissions;
        }

        user.last_login = new Date();
        user.login_counter = (user.login_counter || 0) + 1;
        await user.save();
        const access_token = await createToken(user, true, ADMIN_SECRET);
        return new SuccessResponse('Login success', {
            user: _.pick(user, [
                '_id',
                'id',
                'email',
                'is_active',
                'login_counter',
                'department',
                'role',
                'permissions',
                'username',
                'gender',
                'fullname',
                'avatar'
            ]),
            access_token
        }).send(res);
    }

    public static async createAdmin(req: ProtectedRequest, res: Response) {
        const {
            is_active,
            username,
            password,
            email,
            gender,
            fullname,
            bod,
            phoneNumber,
            IDCard,
            bankingNumber,
            bankingName,
            IDCardBOD,
            idDepartment,
            isRole
        } = req.body;
        const foundAdmin = await AdminActions.findOne({
            username
        });
        if (foundAdmin) throw new BadRequestError(req.t('errors.user.exist'));
        const counter = await CounterActions.findOne({});
        const admin_id = counter.admin_id;
        const departmentInput: any = {};
        let cb = null;
        let permissions = null;
        if (idDepartment && isRole) {
            const department: any = await DepartmentActions.findOne({
                filter: {
                    id: idDepartment,
                    isActive: true
                }
            });
            if (!department)
                throw new BadRequestError(req.t('errors.department.not_found'));
            if (
                isRole === EnumRole.Leader ||
                isRole === EnumRole.Staff ||
                isRole === EnumRole.Deputy_manager
            ) {
                departmentInput['department.department'] = department._id;
                departmentInput['department.isRole'] = isRole;
            }
            if (isRole === EnumRole.Manager) {
                cb = (
                    (_id: mongoose.Types.ObjectId) =>
                    async (adminID: number) => {
                        await DepartmentActions.updateManager(_id, adminID);
                    }
                )(department._id);
            }
            if (department.permissionOfMember) {
                permissions = department.permissionOfMember[isRole] ?? [];
            }
        }
        const newAdmin = await AdminActions.create({
            id: admin_id,
            username,
            password,
            fullname,
            email,
            gender,
            bod,
            phoneNumber,
            IDCard,
            bankingNumber,
            bankingName,
            IDCardBOD,
            ...departmentInput,
            is_active: is_active ? true : false,
            permissions
        } as unknown as Admin);
        cb && (await cb(newAdmin.id));
        const template = await TemplateActions.findOne({
            code: EmailTemplate.NEW_ADMIN_ACCOUNT
        });
        if (template)
            await JobQueueServices.sendMailWithTemplate({
                to: email,
                subject: template.title,
                body: template.content,
                data: {
                    name: fullname,
                    username,
                    password
                }
            });
        req.body.password = 'hidden';
        new SuccessResponse(req.t('common.success'), newAdmin).send(res, req);
    }

    public static async updateAdmin(req: ProtectedRequest, res: Response) {
        const { admin_id } = req.params;
        const {
            password,
            bod,
            phoneNumber,
            IDCard,
            bankingNumber,
            bankingName,
            email,
            gender,
            fullname,
            IDCardBOD,
            idDepartment,
            isRole
        } = req.body;
        let { is_active, username } = req.body;
        const foundAdmin: any = await AdminActions.findOne({
            id: Number(admin_id)
        });
        if (!foundAdmin)
            throw new BadRequestError(req.t('errors.admin.not_found'));
        if (foundAdmin.canUpdate === false) {
            is_active = true;
            username = foundAdmin.username;
        }
        const departmentInput: any = {};
        let permissions = null;
        if (idDepartment && isRole) {
            const department: any = await DepartmentActions.findOne({
                filter: {
                    id: idDepartment,
                    isActive: true
                }
            });
            if (!department) {
                throw new BadRequestError(req.t('errors.department.not_found'));
            }
            if (
                foundAdmin.canUpdate === false &&
                (foundAdmin.department.department.id != department.id ||
                    foundAdmin.department.isRole != isRole)
            ) {
                throw new BadRequestError(
                    req.t('errors.admin.default_admin_cant_change_department')
                );
            }
            if (
                isRole === EnumRole.Leader ||
                isRole === EnumRole.Staff ||
                isRole === EnumRole.Deputy_manager
            ) {
                departmentInput['department.department'] = department._id;
                departmentInput['department.isRole'] = isRole;
            }
            if (isRole === EnumRole.Manager && foundAdmin.canUpdate === true) {
                await DepartmentActions.updateManager(
                    department._id,
                    foundAdmin.id
                );
            }
            if (
                foundAdmin.department?.department?.id &&
                foundAdmin.department?.isRole &&
                (foundAdmin.department?.department?.id != idDepartment ||
                    foundAdmin.department?.isRole != isRole) &&
                department.permissionOfMember
            ) {
                permissions = department.permissionOfMember[isRole] ?? [];
            }
        }
        const salt = bcrypt.genSaltSync(SALT);
        const newUpdate: any = {
            username,
            is_active: is_active ? true : false,
            email,
            gender,
            fullname,
            bod,
            phoneNumber,
            IDCard,
            bankingNumber,
            bankingName,
            IDCardBOD,
            ...departmentInput,
            ...(password ? { password: bcrypt.hashSync(password, salt) } : {})
        } as unknown as Admin;
        if (permissions) {
            newUpdate.permissions = permissions;
        }
        const newAdmin = await AdminActions.update(foundAdmin._id, newUpdate);
        req.body.password = 'hidden';
        new SuccessResponse(req.t('common.success'), newAdmin).send(res, req);
    }

    public static async updatePermissionAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { admin_id } = req.params;
        const { permission } = req.body;
        const foundAdmin = await AdminActions.findOne({
            id: Number(admin_id)
        });
        if (!foundAdmin)
            throw new BadRequestError(req.t('errors.admin.not_found'));

        const newUpdate = {
            lock_permission: true,
            permissions: permission
        } as unknown as Admin;
        await AdminActions.update(foundAdmin._id, newUpdate);
        new SuccessResponse('success', 'Cập nhật thành công').send(res, req);
    }

    public static async getAdminInformation(
        req: ProtectedRequest,
        res: Response
    ) {
        const { admin_id } = req.params;
        const foundAdmin = await AdminActions.findOne({
            id: Number(admin_id)
        });
        if (!foundAdmin)
            throw new BadRequestError(req.t('errors.admin.not_found'));

        new SuccessResponse(req.t('common.success'), foundAdmin).send(res, req);
    }

    public static async removeAdmin(req: ProtectedRequest, res: Response) {
        const { admin_id } = req.params;
        const foundAdmin = await AdminActions.findOne({
            id: Number(admin_id)
        });
        if (!foundAdmin)
            throw new BadRequestError(req.t('errors.admin.not_found'));
        if (foundAdmin.username == 'admin')
            throw new ForbiddenError(req.t('errors.admin.delete_root'));
        await AdminActions.remove(foundAdmin._id);
        new SuccessResponse(req.t('common.success'), foundAdmin).send(res, req);
    }

    public static async changeRoleAdminBySuperAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const role = req.body.role;
        const { admin_id } = req.params;
        const roleApp = Object.values(RoleCode).filter(
            (k) => typeof k == 'number'
        );
        if (!role || !isArray(role) || !role.every((r) => roleApp.includes(r)))
            throw new BadRequestError(req.t('errors.admin.invalid_role'));
        if (isNaN(Number(admin_id)))
            throw new BadRequestError(req.t('errors.admin.not_found'));
        const admin = await AdminActions.findOne({ id: Number(admin_id) });
        if (!admin) throw new BadRequestError(req.t('errors.admin.not_found'));
        const adminUpdate = await AdminActions.update(admin._id, {
            role
        } as Admin);
        new SuccessResponse(
            req.t('common.success'),
            _.pick(adminUpdate, ['_id', 'id', 'role', 'username'])
        ).send(res, req);
    }

    public static async getAllAdminPaginate(
        req: ProtectedRequest,
        res: Response
    ) {
        const { offset, limit, search, idDepartment } = req.query;
        const page = isNaN(Number(offset)) ? 1 : Number(offset);
        const limitPage = isNaN(Number(limit)) ? 200 : Number(limit);
        const $or = search
            ? [
                  { username: { $regex: search, $options: 'siu' } },
                  { fullname: { $regex: search, $options: 'siu' } },
                  { email: { $regex: search, $options: 'siu' } }
              ]
            : [{}];
        const query: any = {
            $or
        };
        if (idDepartment) {
            const department = await DepartmentActions.findOne({
                filter: {
                    id: Number(idDepartment || undefined),
                    isActive: true
                }
            });
            query['department.department'] = {
                _id: department?._id
            } as Department;
        }
        const data = await AdminActions.findAllAndPaginated({
            ...query,
            page_number: page,
            page_size: limitPage
        });
        const count = await AdminActions.count({});
        return new SuccessResponse('success', {
            offset: page,
            limit: limitPage,
            totalDocument: count,
            totalPage: Math.ceil(count / limitPage),
            data: data
        }).send(res, req);
    }

    public static async getAllAdmin(req: ProtectedRequest, res: Response) {
        const { search, idDepartment, leader } = req.query;
        const $or = search
            ? [
                  { username: { $regex: search, $options: 'siu' } },
                  { fullname: { $regex: search, $options: 'siu' } },
                  { email: { $regex: search, $options: 'siu' } }
              ]
            : [{}];
        const query: any = {
            $or
        };
        if (idDepartment) {
            const department = await DepartmentActions.findOne({
                filter: {
                    id: Number(idDepartment || undefined),
                    isActive: true
                }
            });
            query['department.department'] = {
                _id: department?._id
            } as Department;
        }
        let data = await AdminActions.findAll({
            ...query
        });
        if (
            leader &&
            req.user.department.isRole !== EnumRole.Manager &&
            req.user.department.isRole !== EnumRole.Deputy_manager
        ) {
            let team = await TeamActions.findOne({
                filter: { leader: req.user._id }
            } as any);
            if (team) {
                data = data.filter(
                    (e) =>
                        e.id === Number(leader) ||
                        team?.members.find((e2) => e2.id === e.id)
                );
            } else {
                data = data.filter((e) => e.id === Number(leader));
            }
        }
        return new SuccessResponse('success', {
            data: data
        }).send(res, req);
    }

    public static async getOwner(req: ProtectedRequest, res: Response) {
        const adminOwner = await AdminActions.findOne({ username: 'admin' });
        return new SuccessResponse(req.t('common.success'), adminOwner).send(
            res,
            req
        );
    }
}
