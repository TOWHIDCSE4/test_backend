import mongoose, { FilterQuery as _FQ, UpdateQuery } from 'mongoose';
import Admin, { AdminModel } from '../models/admin';
import { EnumRole } from '../models/department';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    status?: string;
    search?: string;
    page_size?: number;
    page_number?: number;
    email?: string;
    username?: string;
    'department.department'?: string;
    $or?: any;
};

export default class AdminActions {
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ): Promise<Admin[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        delete filter.page_size;
        delete filter.page_number;
        return AdminModel.find(filter, {
            password: 0,
            ...select_fields
        })
            .populate('department.department')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: _FQ<Admin>,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ) {
        return AdminModel.find(filter, {
            password: 0,
            ...select_fields
        })
            .populate('department.department')
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Admin | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return AdminModel.findOne(filter, {
            password: 0,
            ...select_fields
        })
            .populate('department.department')
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        return AdminModel.countDocuments(filter).exec();
    }

    public static create(user: Admin): Promise<Admin> {
        const newModel = new AdminModel({
            ...user,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('admin_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Admin
    ): Promise<any> {
        return AdminModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff,
                    updated_time: new Date()
                }
            },
            {
                upsert: false,
                new: true,
                returnOriginal: false
            }
        ).exec();
    }

    public static remove(_id: mongoose.Types.ObjectId): any {
        return AdminModel.deleteOne({ _id });
    }

    public static async updateDepartment(
        filter: _FQ<Admin>,
        role: EnumRole,
        department_id?: any
    ) {
        let update: any = {};
        if (!department_id) {
            update = {
                'department.isRole': role
            };
        } else
            update = {
                'department.department': department_id,
                'department.isRole': role
            };
        await AdminModel.updateMany(filter, {
            $set: update
        });
    }
}
