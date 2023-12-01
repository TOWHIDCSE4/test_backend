import mongoose from 'mongoose';
import TeacherSalary, { TeacherSalaryModel } from '../models/teacher-salary';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    teacher_id?: number;
    location_id?: number;
    start_time?: number | any;
    end_time?: number | any;
    page_size?: number;
    page_number?: number;
    status?: number;
};

export default class TeacherSalaryActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: any = {};
        if (filter.teacher_id) {
            conditions.teacher_id = Number(filter.teacher_id);
        }
        if (filter.location_id) {
            conditions.location_id = Number(filter.location_id);
        }
        if (filter.start_time && filter.end_time) {
            conditions.start_time = Number(filter.start_time);
            conditions.end_time = Number(filter.end_time);
        }
        if (filter.status) {
            conditions.status = filter.status;
        }
        if (filter._id) {
            conditions._id = filter._id;
        }
        return conditions;
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {}
    ): Promise<any[]> {
        const conditions = TeacherSalaryActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const aggregate = [
            {
                $sort: {
                    total_salary: -1,
                    location_id: 1
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'users',
                                let: {
                                    teacher_id: '$teacher_id'
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $eq: ['$$teacher_id', '$id']
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            username: 1,
                                            id: 1,
                                            full_name: 1,
                                            phone_number: 1,
                                            email: 1
                                        }
                                    }
                                ],
                                as: 'teacher'
                            }
                        },
                        {
                            $unwind: {
                                path: '$teacher',
                                preserveNullAndEmptyArrays: false
                            }
                        }
                    ],

                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ];
        return TeacherSalaryModel.aggregate(aggregate);
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<TeacherSalary | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TeacherSalaryModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(
        teacher_salary: TeacherSalary
    ): Promise<TeacherSalary> {
        const newModel = new TeacherSalaryModel({
            ...teacher_salary,
            created_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: TeacherSalary
    ): Promise<any> {
        return TeacherSalaryModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff,
                    updated_time: new Date()
                }
            }
        ).exec();
    }

    public static remove(_id: mongoose.Types.ObjectId): any {
        return TeacherSalaryModel.deleteOne({ _id });
    }
}
