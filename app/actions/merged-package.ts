import mongoose from 'mongoose';
import { MergedPackageModel } from '../models/merged-package';
import MergedPackage from '../models/merged-package';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    student_id?: number;
    package_one_id?: number;
    package_two_id?: number;
    status?: number[] | any;
    $or?: any;
};

export default class MergedPackageActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.student_id) {
            conditions.student_id = Number(filter.student_id);
        }
        if (filter.package_one_id) {
            conditions.package_one_id = Number(filter.package_one_id);
        }
        if (filter.package_two_id) {
            conditions.package_two_id = Number(filter.package_two_id);
        }
        if (filter.status) {
            conditions.status = filter.status;
        }
        if (filter.$or) {
            conditions.$or = filter.$or;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): any {
        const conditions = MergedPackageActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return MergedPackageModel.aggregate([
            { $match: conditions },
            { $sort: sort },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'student_id',
                                foreignField: 'id',
                                as: 'student'
                            }
                        },
                        {
                            $unwind: '$student'
                        },
                        {
                            $lookup: {
                                from: 'ordered-packages',
                                localField: 'package_one_id',
                                foreignField: 'id',
                                as: 'package_one'
                            }
                        },
                        {
                            $unwind: '$package_one'
                        },
                        {
                            $lookup: {
                                from: 'ordered-packages',
                                localField: 'package_two_id',
                                foreignField: 'id',
                                as: 'package_two'
                            }
                        },
                        {
                            $unwind: '$package_two'
                        }
                    ],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]);
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<MergedPackage[]> {
        const conditions = MergedPackageActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return MergedPackageModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<MergedPackage | null> {
        const conditions = MergedPackageActions.buildFilterQuery(filter);
        return MergedPackageModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static create(subject: MergedPackage): Promise<MergedPackage> {
        const newModel = new MergedPackageModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: MergedPackage
    ): Promise<any> {
        return MergedPackageModel.findOneAndUpdate(
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
        return MergedPackageModel.deleteOne({ _id });
    }
}
