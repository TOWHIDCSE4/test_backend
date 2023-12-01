import mongoose from 'mongoose';
import Subject, { SubjectModel } from '../models/subject';
import CounterActions from './counter';
import { ZaloInteractiveHistoryModel } from '../models/zalo-interactive-history';
import ZaloInteractiveHistory from '../models/zalo-interactive-history';
import { escapeRegExp } from 'lodash';
import { IGNORE_SENSITIVE_FIELDS } from '../models/user';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    interaction_time?: any;
    last_event?: string;
    user_id?: number;
    zalo_id?: number;
    sent_in_day?: boolean;
    search_user?: any;
    'user.full_name'?: any;
    $or?: any;
    staff_id?: number;
    'student.staff_id'?: any;
};

export default class ZaloInteractiveHistoryActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.interaction_time) {
            conditions.interaction_time = filter.interaction_time;
        }
        if (filter.user_id) {
            conditions.user_id = filter.user_id;
        }
        if (filter.zalo_id) {
            conditions.zalo_id = filter.zalo_id;
        }
        if (filter.search_user) {
            const searchUser = escapeRegExp(filter.search_user);
            conditions.$or = [
                {
                    'user.full_name': {
                        $regex: searchUser,
                        $options: 'i'
                    }
                },
                {
                    'user.username': {
                        $regex: searchUser,
                        $options: 'i'
                    }
                }
            ];
        }
        if (filter.staff_id) {
            conditions['student.staff_id'] = filter.staff_id;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ): Promise<ZaloInteractiveHistory[]> {
        const conditions =
            ZaloInteractiveHistoryActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return ZaloInteractiveHistoryModel.find(conditions, {
            ...select_fields
        })
            .populate('student', { ...IGNORE_SENSITIVE_FIELDS })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAllAndPaginatedWidthSeachUser(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): Promise<ZaloInteractiveHistory[]> {
        const conditions =
            ZaloInteractiveHistoryActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return ZaloInteractiveHistoryModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'admins',
                                let: {
                                    staff_id: '$staff_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$staff_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            username: 1,
                                            id: 1,
                                            fullname: 1,
                                            phoneNumber: 1
                                        }
                                    }
                                ],
                                as: 'staff'
                            }
                        },
                        {
                            $unwind: {
                                path: '$staff',
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    as: 'student'
                }
            },
            {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
            },
            { $match: conditions },

            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
        ]);
    }

    public static async countHistory(filter: FilterQuery): Promise<number> {
        const conditions =
            ZaloInteractiveHistoryActions.buildFilterQuery(filter);
        const countData = await ZaloInteractiveHistoryModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_user_id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_user_id', '$user_id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'admins',
                                let: {
                                    staff_id: '$staff_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$staff_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            username: 1,
                                            id: 1,
                                            fullname: 1,
                                            phoneNumber: 1
                                        }
                                    }
                                ],
                                as: 'staff'
                            }
                        },
                        {
                            $unwind: {
                                path: '$staff',
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    as: 'student'
                }
            },
            {
                $unwind: { path: '$student', preserveNullAndEmptyArrays: false }
            },
            { $match: conditions },
            { $count: 'count' }
        ]);
        if (!countData) return 0;
        if (countData.length <= 0) return 0;
        let count = 0;
        if (countData[0].hasOwnProperty('count')) {
            count = countData[0].count;
        }
        return count;
    }

    public static findAllAndGroup(filter: FilterQuery): Promise<any[]> {
        const conditions =
            ZaloInteractiveHistoryActions.buildFilterQuery(filter);
        return ZaloInteractiveHistoryModel.aggregate([
            { $match: conditions },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $group: {
                    _id: '$zalo_id',
                    data: { $first: '$$ROOT' }
                }
            }
        ]).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<ZaloInteractiveHistory | null> {
        return ZaloInteractiveHistoryModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions =
            ZaloInteractiveHistoryActions.buildFilterQuery(filter);
        return ZaloInteractiveHistoryModel.countDocuments(conditions).exec();
    }

    public static create(
        subject: ZaloInteractiveHistory
    ): Promise<ZaloInteractiveHistory> {
        const newModel = new ZaloInteractiveHistoryModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ZaloInteractiveHistory
    ): Promise<any> {
        return ZaloInteractiveHistoryModel.findOneAndUpdate(
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
        return ZaloInteractiveHistoryModel.deleteOne({ _id });
    }
}
