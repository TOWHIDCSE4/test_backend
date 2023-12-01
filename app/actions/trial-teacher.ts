import mongoose from 'mongoose';
import TrialTeacher, { TrialTeacherModel } from '../models/trial-teacher';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    teacher_id?: number | any;
    age_groups?: number[];
    page_size?: number;
    page_number?: number;
    status?: string;
    search?: string;
    'teacher.user.is_active'?: boolean;
    $or?: Array<any>;
};

export default class TrialTeacherActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.age_groups) {
            conditions.age_groups = filter.age_groups;
        }
        return conditions;
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { teacher_id: 1 }
    ): Promise<TrialTeacher[]> {
        const conditions = TrialTeacherActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TrialTeacherModel.find(conditions, {
            ...select_fields
        })
            .populate({
                path: 'teacher',
                select: {
                    user_id: 1,
                    location: 1,
                    degree: 1,
                    english_certificate: 1,
                    teaching_certificate: 1
                },
                populate: [
                    {
                        path: 'location',
                        select: {
                            id: 1,
                            name: 1
                        }
                    },
                    {
                        path: 'user_info'
                    }
                ]
            })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findEachPage(filter: FilterQuery) {
        const conditions: FilterQuery = {};
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.age_groups) {
            conditions.age_groups = filter.age_groups;
        }

        const conditions2: FilterQuery = {};
        if (filter.status) {
            conditions2['teacher.user.is_active'] = filter.status === 'active';
        }
        if (filter.search) {
            conditions2.$or = [
                {
                    'teacher.user.full_name': {
                        $regex: filter.search,
                        $options: 'i'
                    }
                },
                {
                    'teacher.user.username': {
                        $regex: filter.search,
                        $options: 'i'
                    }
                }
            ];
        }

        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        return TrialTeacherModel.aggregate([
            {
                $sort: {
                    created_time: -1
                }
            },
            {
                $match: conditions
            },
            {
                $lookup: {
                    from: 'teachers',
                    localField: 'teacher',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            {
                $unwind: '$teacher'
            },
            {
                $match: conditions2
            },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'locations',
                                localField: 'teacher.location',
                                foreignField: '_id',
                                as: 'location'
                            }
                        },
                        {
                            $unwind: '$location'
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'teacher.user_id',
                                foreignField: 'id',
                                as: 'user_info'
                            }
                        },
                        {
                            $unwind: '$user_info'
                        },
                        {
                            $unset: [
                                'user_info.password',
                                'user_info.regular_times'
                            ]
                        },
                        {
                            $project: {
                                teacher_id: 1,
                                teacher: 1,
                                age_groups: 1,
                                'location.id': 1,
                                'location.name': 1,
                                user_info: 1
                            }
                        }
                    ],
                    total: [{ $count: 'count' }]
                }
            }
        ]);
    }

    public static async findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { teacher_id: 1 }
    ): Promise<TrialTeacher[]> {
        const conditions = TrialTeacherActions.buildFilterQuery(filter);
        return TrialTeacherModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = TrialTeacherActions.buildFilterQuery(filter);
        return TrialTeacherModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<TrialTeacher | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TrialTeacherModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(trial_profile: TrialTeacher): Promise<TrialTeacher> {
        const newModel = new TrialTeacherModel({
            ...trial_profile,
            created_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: TrialTeacher
    ): Promise<any> {
        return TrialTeacherModel.findOneAndUpdate(
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
        return TrialTeacherModel.deleteOne({ _id });
    }
}
