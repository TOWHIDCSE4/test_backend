import { PaginationInfo } from '../const';
import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';
import Department, { DepartmentModel, EnumRole } from '../models/department';
import { createAliasName } from '../utils/create-alias-name-utils';
import CounterActions from './counter';
import AdminActions from './admin';
import Admin from '../models/admin';
import _ from 'lodash';
import { CODE_DEPARTMENT } from '../const/department';

export default class DepartmentActions {
    public static async findAllPagination(args?: {
        filter?: FilterQuery<Department>;
        paginationInfo?: PaginationInfo;
        sort?: any;
    }) {
        const { filter, paginationInfo, sort } = args || {
            filter: {},
            paginationInfo: { page_number: 1, page_size: 20 },
            sort: {}
        };
        const pageSize = paginationInfo?.page_size || 20;
        const pageNumber = paginationInfo?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return DepartmentModel.find({
            ...filter,
            isActive: true
        })
            .sort({ ...sort, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(args?: { filter?: FilterQuery<Department> }) {
        const { filter } = args || { filter: {} };
        return DepartmentModel.find({
            ...filter,
            isActive: true
        }).sort({ id: 1 });
    }

    public static async findOne(args?: { filter?: FilterQuery<Department> }) {
        const { filter } = args || { filter: {} };
        return DepartmentModel.findOne(filter);
    }

    public static async create(input: Department) {
        let id: number = input?.id || 0;
        if (!input?.id) {
            const counter = await CounterActions.findOne({});
            id = counter.department_id || 0;
            await CounterActions.increaseId('department_id');
        }
        const department = new DepartmentModel({
            ...input,
            id,
            unsignedName: createAliasName(input?.name),
            permissionOfMember: {
                manager: [],
                deputy_manager: [],
                leader: [],
                staff: []
            }
        } as any);
        await department.save();
        return department;
    }

    public static async update(
        _id: mongoose.Types.ObjectId,
        update: UpdateQuery<Department>
    ) {
        return DepartmentModel.findOneAndUpdate(
            { _id: _id },
            [
                update,
                {
                    $set: {
                        updatedAt: Date.now()
                    }
                }
            ],
            {
                new: true
            }
        ).exec();
    }

    public static async updatePermissionOfDepartment(
        _id: mongoose.Types.ObjectId,
        role: EnumRole,
        permissions: any[]
    ): Promise<any> {
        const field = `permissionOfMember.${role}`;
        return DepartmentModel.findOneAndUpdate({ _id: _id }, [
            {
                $set: {
                    [field]: permissions,
                    updatedAt: Date.now()
                }
            }
        ]).exec();
    }

    public static async getPermissionOfRole(
        _id: mongoose.Types.ObjectId,
        role: EnumRole
    ) {
        const field = `permissionOfMember.${role}`;
        const department = await DepartmentModel.findOne({ _id });
        if (!department?.permissionOfMember) return [];
        const permission = department.permissionOfMember[role];
        return permission;
    }

    public static async updateManager(
        _id: mongoose.Types.ObjectId,
        adminID: number
    ) {
        const department = await DepartmentModel.findOne({
            _id,
            isActive: true
        }).populate('admin');
        if (!department) throw new Error('Không tìm thấy phòng/ban');
        const admin = await AdminActions.findOne({ id: adminID });
        if (!admin) throw new Error('Không tìm thấy trưởng phòng');
        if (admin.canUpdate === false)
            throw new Error('Người dùng mặc định, không thể cập nhật');
        if (
            admin?.department?.department?.unsignedName ===
            CODE_DEPARTMENT.ADMIN
        )
            throw new Error('Người dùng đang là admin, không thể cập nhật');
        await AdminActions.updateDepartment(
            {
                'department.department': department._id,
                'department.isRole': EnumRole.Manager
            },
            EnumRole.Staff
        );
        //Xóa ở những nhóm mà admin đang là thành viên
        await AdminActions.update(admin._id, {
            department: {
                department: department?._id,
                isRole: EnumRole.Manager
            }
        } as Admin);
        return true;
    }
}
