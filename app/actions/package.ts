import { escapeRegExp } from 'lodash';
import mongoose from 'mongoose';
import Package, { PackageModel } from '../models/package';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    type?: number;
    page_number?: number;
    alias?: string;
    slug?: string;
    id?: number | any;
    location_id?: number;
    number_class?: number;
    subject_id?: number;
    is_active?: boolean;
    search?: string;
    $and?: Array<any>;
    $or?: Array<any>;
    is_show_on_student_page?: boolean;
};

export default class PackageActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.type) {
            conditions.type = filter.type;
        }
        if (filter.number_class) {
            conditions.number_class = filter.number_class;
        }
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.location_id && -1 !== filter.location_id) {
            conditions.location_id = filter.location_id;
        }
        if (filter.subject_id) {
            conditions.subject_id = filter.subject_id;
        }
        if (filter.number_class) {
            conditions.number_class = filter.number_class;
        }
        if (filter.search) {
            if (!conditions.$and) {
                conditions.$and = new Array<any>();
            }
            const searchRegexStr = escapeRegExp(filter.search);
            const name_search = {
                $regex: searchRegexStr,
                $options: 'i'
            };
            conditions.$and.push({
                $or: [
                    { name: name_search },
                    { alias: name_search },
                    { slug: name_search }
                ]
            });
        }
        if (filter.is_show_on_student_page) {
            if (!conditions.$and) {
                conditions.$and = new Array<any>();
            }
            conditions.$and.push({
                $or: [
                    { is_show_on_student_page: filter.is_show_on_student_page },
                    { is_show_on_student_page: { $exists: false } }
                ]
            });
        }
        return conditions;
    }

    // For Admin call Functions
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { id: 1 }
    ): Promise<Package[]> {
        const conditions = PackageActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return PackageModel.find(conditions, {
            ...select_fields
        })
            .populate('location')
            .populate('new_student_coupon')
            .populate('renew_student_coupon')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    // For Admin call Functions
    public static async findAllAndPaginated2(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { id: 1 }
    ): Promise<Package[]> {
        const conditions = PackageActions.buildFilterQuery(filter);

        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        return PackageModel.aggregate([
            { $match: conditions },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'locations',
                    localField: 'location_id',
                    foreignField: 'id',
                    as: 'locations'
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'id',
                    foreignField: 'package_id',
                    as: 'ordered_packages'
                }
            }
        ]);
    }

    // For WebApp and Mobile call Functions
    public static findAllAndPaginatedForUser(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { id: 1 }
    ): Promise<Package[]> {
        filter.is_active = true;
        const conditions = PackageActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return PackageModel.find(conditions, {
            ...select_fields
        })
            .populate('location')
            .populate('new_student_coupon')
            .populate('renew_student_coupon')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort = { id: 1 }
    ): Promise<Package[]> {
        const conditions = PackageActions.buildFilterQuery(filter);
        return PackageModel.find(conditions, {
            ...select_fields
        })
            .populate('location')
            .populate('new_student_coupon')
            .populate('renew_student_coupon')
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Package | null> {
        return PackageModel.findOne(filter, {
            ...select_fields
        })
            .populate('new_student_coupon')
            .populate('renew_student_coupon')
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = PackageActions.buildFilterQuery(filter);
        return PackageModel.countDocuments(conditions).exec();
    }

    public static create(subject: Package): Promise<Package> {
        const newModel = new PackageModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('package_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Package
    ): Promise<any> {
        return PackageModel.findOneAndUpdate(
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
        return PackageModel.deleteOne({ _id });
    }

    public static findOrderedPackagesByPackageId(id: number): any {
        return PackageModel.aggregate([
            {
                $match: {
                    id
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'id',
                    foreignField: 'package_id',
                    as: 'ordered_packages'
                }
            }
        ]);
    }
}
