import mongoose from 'mongoose';
import Report, {
    ReportModel,
    EnumRecommendStatus,
    EnumRecommendSection,
    EnumReportType
} from '../models/report';
import { StudentModel } from '../models/student';
import { TeacherModel } from '../models/teacher';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    page_size?: number;
    page_number?: number;
    report_user_id?: number;
    report_user?: any;
    recommend_section?: EnumRecommendSection;
    recommend_status?: EnumRecommendStatus;
    created_user_id?: number;
    resolve_user_id?: number;
    report_teacher_id?: number;
    processing_department_id?: number;
    department_staff_id?: number;
    report_resolve_user?: any;
    type?: EnumReportType;
    booking_id?: number;
    month?: number;
    year?: number;
};

export default class ReportActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.created_user_id) {
            conditions.created_user_id = filter.created_user_id;
        }
        if (filter.report_user_id) {
            conditions.report_user_id = filter.report_user_id;
        }
        if (filter.resolve_user_id) {
            conditions.resolve_user_id = filter.resolve_user_id;
        }
        if (filter.recommend_section) {
            conditions.recommend_section = filter.recommend_section;
        }
        if (filter.recommend_status) {
            conditions.recommend_status = filter.recommend_status;
        }
        if (filter.processing_department_id) {
            conditions.processing_department_id =
                filter.processing_department_id;
        }
        if (filter.department_staff_id) {
            conditions.department_staff_id = filter.department_staff_id;
        }
        if (filter.report_teacher_id) {
            conditions.report_teacher_id = filter.report_teacher_id;
        }
        if (filter.type) {
            conditions.type = filter.type;
        } else {
            if (!filter.id && !filter._id) conditions.type = 1;
        }
        if (filter.booking_id) {
            conditions.booking_id = filter.booking_id;
        }
        return conditions;
    }

    public static async findOne(query: FilterQuery): Promise<Report | null> {
        const conditions = this.buildFilterQuery(query);
        return ReportModel.findOne(conditions).exec();
    }

    public static async create(data: Report): Promise<Report> {
        const newModel = new ReportModel({
            ...data,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('report_id');
        return newModel.save();
    }

    public static async delete(data: Report) {
        return ReportModel.deleteOne({ _id: data._id });
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<any> {
        return ReportModel.findOneAndUpdate(
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

    public static async findAllAndPaginated(
        query: FilterQuery
    ): Promise<any[]> {
        const pageSize = query.page_size || 20;
        const pageNumber = query.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions = this.buildFilterQuery(query);
        const aggregateQuery: any = [
            { $match: conditions },
            // {
            //     $lookup: {
            //         from: 'users',
            //         let: {
            //             id: '$report_user_id'
            //         },
            //         pipeline: [
            //             {
            //                 $match: {
            //                     $expr: { $eq: ['$$id', '$id'] }
            //                 }
            //             },
            //             {
            //                 $project: {
            //                     _id: 1,
            //                     id: 1,
            //                     first_name: 1,
            //                     last_name: 1,
            //                     full_name: 1,
            //                     username: 1,
            //                     email: 1,
            //                     role: 1,
            //                     phone: 1,
            //                     skype_account: 1
            //                 }
            //             }
            //         ],
            //         as: 'report_user'
            //     }
            // },
            // {
            //     $unwind: {
            //         path: '$report_user',
            //         preserveNullAndEmptyArrays: true
            //     }
            // },
            {
                $lookup: {
                    from: 'admins',
                    let: {
                        id: '$created_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] }
                            }
                        },
                        {
                            $lookup: {
                                from: 'departments',
                                let: {
                                    id: '$department.department'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ['$$id', '$_id'] }
                                        }
                                    }
                                ],
                                as: 'department'
                            }
                        },
                        {
                            $unwind: {
                                path: '$department',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                id: 1,
                                fullname: 1,
                                username: 1,
                                email: 1,
                                department: 1
                            }
                        }
                    ],
                    as: 'created_user'
                }
            },
            {
                $unwind: {
                    path: '$created_user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'admins',
                    let: {
                        id: '$resolve_user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$id', '$id'] }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                id: 1,
                                fullname: 1,
                                username: 1,
                                email: 1,
                                department: 1
                            }
                        }
                    ],
                    as: 'resolve_user'
                }
            },
            {
                $unwind: {
                    path: '$resolve_user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'booking_id',
                    foreignField: 'id',
                    as: 'booking'
                }
            },
            { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
            { $sort: { created_time: -1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ];
        if (query.month) {
            aggregateQuery.splice(1, 0, {
                $redact: {
                    $cond: [
                        {
                            $and: [
                                {
                                    $eq: [
                                        { $month: '$created_time' },
                                        query.month
                                    ]
                                },
                                {
                                    $eq: [
                                        { $year: '$created_time' },
                                        query.year
                                    ]
                                }
                            ]
                        },
                        '$$KEEP',
                        '$$PRUNE'
                    ]
                }
            });
        }
        return ReportModel.aggregate(aggregateQuery);
    }

    public static async findStaffByStudent(query: any): Promise<any> {
        return StudentModel.findOne(query).exec();
    }
    public static async findStaffByTeacher(query: any): Promise<any> {
        return TeacherModel.findOne(query).exec();
    }
}
