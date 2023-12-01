import { ProtectedRequest } from 'app-request';
import DepartmentActions from '../actions/department';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import Department, { DepartmentModel } from '../models/department';
import AdminActions from '../actions/admin';
import { EnumRole } from '../models/department';
import { LIST_PERMISSIONS } from '../const/permission';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'name',
    'unsignedName',
    'description',
    'canUpdateManager',
    'canDelete',
    'permissionOfMember',
    'isActive'
];
export default class DepartmentController {
    public static async getAllDepartmentPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const departments = await DepartmentActions.findAllPagination({
            paginationInfo: {
                page_number: Number(page_number || 0),
                page_size: Number(page_size || 0)
            }
        });
        return new SuccessResponse('success', departments).send(res, req);
    }

    public static async getAllDepartment(req: ProtectedRequest, res: Response) {
        // const { page_size, page_number } = req.query
        const departments = await DepartmentActions.findAll({});
        const departmentIds = departments.map((d) => d._id);
        const admin = await AdminActions.findAll(
            {
                'department.isRole': EnumRole.Manager,
                'department.department': { $in: departmentIds }
            },
            { password: 0 }
        );
        const hashAdmin = new Map(
            admin.map((d) => [d?.department?.department.id, d])
        );
        const results: any[] = [];
        departments.forEach((d) => {
            results.push({
                ...d.toObject(),
                manager: hashAdmin.get(d.id)
            });
        });
        return new SuccessResponse('success', results).send(res, req);
    }

    public static async getAllFeature(req: ProtectedRequest, res: Response) {
        const features = LIST_PERMISSIONS;
        return new SuccessResponse('success', features).send(res, req);
    }

    public static async getDepartment(req: ProtectedRequest, res: Response) {
        const { idDepartment } = req.params;
        const department = await DepartmentActions.findOne({
            filter: { id: Number(idDepartment) || -1, isActive: true }
        });
        if (!department) throw new NotFoundError('Không tìm thấy phòng/ban');
        return new SuccessResponse('success', department).send(res, req);
    }

    public static async createDepartment(req: ProtectedRequest, res: Response) {
        const { name, description, manager } = req.body;
        const department = await DepartmentActions.create({
            name,
            description
        } as Department);
        try {
            if (manager) {
                await DepartmentActions.updateManager(
                    department._id,
                    Number(manager) || -1
                );
            }
        } catch (error: any) {
            throw new BadRequestError(error?.message);
        }
        return new SuccessResponse('success', department).send(res, req);
    }

    public static async editDepartment(req: ProtectedRequest, res: Response) {
        const { name, description, manager } = req.body;
        const { idDepartment } = req.params;
        const department = await DepartmentActions.findOne({
            filter: { id: Number(idDepartment) || -1, isActive: true }
        });
        if (!department) throw new NotFoundError('Không tìm thấy phòng/ban');
        if (department.canUpdateManager == false)
            throw new NotFoundError('Phòng/ban mặc định, không thể cập nhật');
        const newdepartment = await DepartmentActions.update(department._id, {
            $set: {
                name,
                description
            }
        });
        try {
            if (manager) {
                await DepartmentActions.updateManager(
                    department._id,
                    Number(manager) || -1
                );
            }
        } catch (error: any) {
            throw new BadRequestError(error?.message);
        }
        return new SuccessResponse('success', newdepartment).send(res, req);
    }

    public static async deleteDepartment(req: ProtectedRequest, res: Response) {
        const { idDepartment } = req.params;
        const department = await DepartmentActions.findOne({
            filter: { id: Number(idDepartment) || -1, isActive: true }
        });
        if (!department)
            throw new NotFoundError(req.t('errors.department.not_found'));
        if (!department?.canDelete)
            throw new BadRequestError(
                req.t('errors.department.default_cant_update')
            );
        await DepartmentActions.update(department._id, {
            $set: { isActive: false }
        });
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }

    public static async updatePermissionOfDepartment(
        req: ProtectedRequest,
        res: Response
    ) {
        const { idDepartment } = req.params;
        const { role, permission } = req.body;
        const department = await DepartmentActions.findOne({
            filter: { id: Number(idDepartment) || -1, isActive: true }
        });
        if (!department)
            throw new NotFoundError(req.t('errors.department.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'DepartmentModel',
            department,
            pickUpData
        );

        if (department?.canUpdateManager === false)
            throw new BadRequestError(
                req.t('errors.department.default_cant_update')
            );
        const new_data = await DepartmentActions.updatePermissionOfDepartment(
            department._id,
            role,
            permission
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'DepartmentModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse('success', 'Cập nhật thành công').send(
            res,
            req
        );
    }
}
