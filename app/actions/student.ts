import { EnumOrderStatus } from './../models/order';
import { UserModel } from './../models/user';
import mongoose from 'mongoose';
import Student, { StudentModel } from '../models/student';
import { RoleCode } from '../const/role';
import _, { escapeRegExp } from 'lodash';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    user_id?: number;
    status?: string;
    search?: string;
    page_size?: number;
    page_number?: number;
    email?: string;
    q?: string;
    day?: string;
    month?: string;
    year?: string;
    course_id?: number;
    staff?: string;
    staff_id?: string;
};

export default class StudentActions {
    static buildQuery(query: FilterQuery): any {
        const q: any = {};
        if (query.q && query.q !== '') {
            const searchRegexStr = escapeRegExp(query.q);
            q.$or = [
                { full_name: { $regex: searchRegexStr, $options: 'i' } },
                { username: { $regex: searchRegexStr, $options: 'i' } },
                { first_name: { $regex: searchRegexStr, $options: 'i' } },
                { last_name: { $regex: searchRegexStr, $options: 'i' } }
            ];
        }

        if (query.staff && query.staff !== '') {
            q.staff = query.staff;
        }
        if (query.staff_id && query.staff_id !== '') {
            q.staff_id = query.staff_id;
        }
        if (query.user_id) {
            q.user_id = query.user_id;
        }
        return q;
    }
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ): Promise<Student[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions = this.buildQuery(filter);
        return StudentModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAllWhoHasOrderedPackage(): Promise<any[]> {
        return UserModel.aggregate([
            { $match: { role: [RoleCode.STUDENT] } },
            { $sort: { updated_time: -1 } },
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$user_id', '$$id'] }]
                                }
                            }
                        }
                    ],
                    as: 'ordered-packages'
                }
            },
            {
                $match: {
                    $expr: { $gt: [{ $size: '$ordered-packages' }, 0] }
                }
            }
            // {
            //     $facet: {
            //         paginatedResults: [{ $skip: skip }, { $limit: limit }],
            //         totalResults: [{ $count: 'count' }]
            //     }
            // }
        ]);
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Student | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return StudentModel.findOne(filter, {
            ...select_fields
        })
            .populate('staff', { fullname: 1, id: 1, _id: 1 })
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: object = {}
    ): Promise<Student[]> {
        const conditions = this.buildQuery(filter);
        return StudentModel.find(conditions, {
            ...select_fields
        }).exec();
    }

    public static create(student: Student): Promise<Student> {
        const newModel = new StudentModel({
            ...student,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Student
    ): Promise<any> {
        return StudentModel.findOneAndUpdate(
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
        return StudentModel.deleteOne({ _id });
    }

    public static removeByUserId(user_id: number): any {
        return StudentModel.deleteOne({ user_id });
    }

    public static async getAllStudentByAdmin(
        query: FilterQuery
    ): Promise<any[]> {
        const pageSize = query?.page_size || 10;
        const pageNumber = query?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions = this.buildQuery(query);
        conditions.role = [RoleCode.STUDENT];
        const aggregateQuery: any = [
            { $match: conditions },
            { $sort: { updated_time: -1 } },
            // { $lookup: { from: 'students', localField: 'id', foreignField: 'user_id', as: 'student_detail' } },
            // { $unwind: { path: '$student_detail', preserveNullAndEmptyArrays: true } },
            // { $lookup: { from: 'admins', localField: 'student_detail.staff_id', foreignField: 'id', as: 'staff' } },
            { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ];

        if (query.day) {
            aggregateQuery.splice(1, 0, {
                $redact: {
                    $cond: [
                        {
                            $eq: [
                                { $dayOfMonth: '$date_of_birth' },
                                parseInt(query.day as string)
                            ]
                        },
                        '$$KEEP',
                        '$$PRUNE'
                    ]
                }
            });
        }
        if (query.month) {
            aggregateQuery.splice(1, 0, {
                $redact: {
                    $cond: [
                        {
                            $eq: [
                                { $month: '$date_of_birth' },
                                parseInt(query.month as string)
                            ]
                        },
                        '$$KEEP',
                        '$$PRUNE'
                    ]
                }
            });
        }
        if (query.year) {
            aggregateQuery.splice(1, 0, {
                $redact: {
                    $cond: [
                        {
                            $eq: [
                                { $year: '$date_of_birth' },
                                parseInt(query.year as string)
                            ]
                        },
                        '$$KEEP',
                        '$$PRUNE'
                    ]
                }
            });
        }
        return UserModel.aggregate(aggregateQuery);
    }

    public static async getNewStudentByAdmin(
        query: FilterQuery
    ): Promise<any[]> {
        const pageSize = query?.page_size || 10;
        const pageNumber = query?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions = this.buildQuery(query);
        conditions.role = [RoleCode.STUDENT];
        const aggregateQuery: any = [
            { $match: conditions },
            { $sort: { updated_time: -1 } },
            {
                $lookup: {
                    from: 'orders',
                    let: { id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$user_id', '$$id'] },
                                        {
                                            $eq: [
                                                '$status',
                                                EnumOrderStatus.PAID
                                            ]
                                        },
                                        { $ne: ['$price', 0] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'orders'
                }
            },
            {
                $match: {
                    $expr: { $eq: [{ $size: '$orders' }, 1] }
                }
            },
            { $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ];
        if (query.month) {
            aggregateQuery.splice(5, 0, {
                $redact: {
                    $cond: [
                        {
                            $eq: [
                                { $month: '$orders.updated_time' },
                                parseInt(query.month as string)
                            ]
                        },
                        '$$KEEP',
                        '$$PRUNE'
                    ]
                }
            });
        }
        return UserModel.aggregate(aggregateQuery);
    }

    public static async setStaffForStudent(
        user_id: number,
        staff: any,
        staff_id: number
    ): Promise<any> {
        return StudentModel.updateOne(
            { user_id: user_id },
            {
                staff: staff,
                staff_id: staff_id,
                updated_time: new Date()
            }
        ).exec();
    }
}
