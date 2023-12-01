import mongoose from 'mongoose';
import LearningAssessmentReports, {
    EnumLAReportType,
    LearningAssessmentReportsModel
} from '../models/learning-assessment-reports';
import CounterActions from './counter';
import _, { escapeRegExp } from 'lodash';
import { DAY_TO_MS } from '../const';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    id?: any;
    status?: number[] | any;
    student_id?: number;
    search?: string;
    admin_note?: string;
    $or?: Array<any>;
    time_create?: any;
    'user_student.staff_id'?: any;
    type?: any;
};

export default class LearningAssessmentReportsActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.admin_note) {
            conditions.admin_note = filter.admin_note;
        }
        if (filter.status) {
            if (Array.isArray(filter.status)) {
                conditions.status = { $in: filter.status };
            } else {
                conditions.status = filter.status;
            }
        }
        if (filter.time_create) {
            conditions.time_create = filter.time_create;
        }
        if (filter.type) {
            conditions.type = filter.type;
        }
        if (filter.search) {
            const searchUser = escapeRegExp(filter.search);
            conditions.$or = [
                {
                    'student.full_name': {
                        $regex: searchUser,
                        $options: 'i'
                    }
                },
                {
                    'student.username': {
                        $regex: searchUser,
                        $options: 'i'
                    }
                }
            ];
        }
        if (filter['user_student.staff_id']) {
            if (filter['user_student.staff_id'] == 'null') {
                conditions['user_student.staff_id'] = null;
            } else {
                conditions['user_student.staff_id'] =
                    filter['user_student.staff_id'];
            }
        }
        if (filter.$or) {
            conditions.$or = filter.$or;
        }
        return conditions;
    }

    // For Admin call Functions
    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): Promise<Array<any>> {
        const conditions =
            LearningAssessmentReportsActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const aggregateData: any = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'students',
                    let: {
                        student_id: '$student_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$student_id', '$user_id']
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
                    as: 'user_student'
                }
            },
            {
                $unwind: {
                    path: '$user_student',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'prompt-template-AI',
                    localField: 'prompt_template',
                    foreignField: '_id',
                    as: 'prompt_template'
                }
            },
            {
                $unwind: {
                    path: '$prompt_template',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]
        if(Number(filter.type) !== EnumLAReportType.DILIGENCE){
            aggregateData.push(
            {
                $lookup: {
                    from: 'ordered-packages',
                    let: {
                        ordered_package_id: '$package_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$ordered_package_id', '$id']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'orders',
                                localField: 'order',
                                foreignField: '_id',
                                as: 'order'
                            }
                        },
                        {
                            $unwind: '$order'
                        },
                        {
                            $match: {
                                'order.status': 1
                            }
                        },
                        {
                            $lookup: {
                                from: 'packages',
                                let: {
                                    package_id: '$package_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$package_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            id: 1,
                                            location_id: 1,
                                            image: 1,
                                            is_support: 1
                                        }
                                    }
                                ],
                                as: 'package'
                            }
                        },
                        {
                            $unwind: '$package'
                        },
                        {
                            $project: {
                                id: 1,
                                package_id: 1,
                                package_name: 1,
                                type: 1,
                                user_id: 1,
                                order_id: 1,
                                number_class: 1,
                                day_of_use: 1,
                                original_number_class: 1,
                                paid_number_class: 1,
                                activation_date: 1,
                                order: 1,
                                package: 1,
                                expired_date: {
                                    $sum: [
                                        '$activation_date',
                                        {
                                            $multiply: [
                                                '$day_of_use',
                                                DAY_TO_MS
                                            ]
                                        }
                                    ]
                                },
                                created_time: 1
                            }
                        }
                    ],
                    as: 'ordered_package'
                }
            },
            )
            aggregateData.push( {
                $unwind: {
                    path: '$ordered_package',
                    preserveNullAndEmptyArrays: true
                }
            })
        };
        aggregateData.push({ $match: conditions });
        aggregateData.push(  {
            $facet: {
                data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
                pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
            }
        });
        aggregateData.push({ $unwind: '$pagination' });
        return LearningAssessmentReportsModel.aggregate(aggregateData).exec();
    }

    public static findAllAndPaginatedForUser(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<LearningAssessmentReports[]> {
        const conditions =
            LearningAssessmentReportsActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return LearningAssessmentReportsModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): Promise<LearningAssessmentReports[]> {
        const conditions =
            LearningAssessmentReportsActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return LearningAssessmentReportsModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'prompt-template-AI',
                    localField: 'prompt_template',
                    foreignField: '_id',
                    as: 'prompt_template'
                }
            },
            {
                $unwind: {
                    path: '$prompt_template',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: conditions },
            { $sort: sort }
        ]).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<LearningAssessmentReports | null> {
        const conditions =
            LearningAssessmentReportsActions.buildFilterQuery(filter);
        return LearningAssessmentReportsModel.findOne(conditions, {
            ...select_fields
        })
            .populate('prompt_template')
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions =
            LearningAssessmentReportsActions.buildFilterQuery(filter);
        return LearningAssessmentReportsModel.countDocuments(conditions).exec();
    }

    public static create(
        subject: LearningAssessmentReports
    ): Promise<LearningAssessmentReports> {
        const newModel = new LearningAssessmentReportsModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('learning_assessment_reports_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: LearningAssessmentReports
    ): Promise<any> {
        return LearningAssessmentReportsModel.findOneAndUpdate(
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
        return LearningAssessmentReportsModel.deleteOne({ _id });
    }
}
