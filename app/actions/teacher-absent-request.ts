import mongoose from 'mongoose';
import TeacherAbsentRequest, {
    TeacherAbsentRequestModel
} from '../models/teacher-absent-request';
import CounterActions from './counter';
import moment from 'moment';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    teacher_id?: number;
    status?: number[] | any;
    start_time?: number | any;
    end_time?: number | any;
    page_size?: number;
    page_number?: number;
    search?: string;
    $or?: any;
    staff_id?: number;
    date?: number;
};

export default class TeacherAbsentRequestActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (
            filter.status &&
            Array.isArray(filter.status) &&
            filter.status.length > 0
        ) {
            conditions.status = {
                $in: filter.status
            };
        }
        if (filter.start_time) {
            conditions.start_time = filter.start_time;
        }
        if (filter.end_time) {
            conditions.end_time = filter.end_time;
        }
        if (filter.$or) {
            conditions.$or = filter.$or;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { status: 1, start_time: 1 }
    ): Promise<TeacherAbsentRequest[]> {
        const conditions = TeacherAbsentRequestActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TeacherAbsentRequestModel.find(conditions, {
            ...select_fields
        })
            .populate('teacher')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findEachPage(filter: FilterQuery) {
        const conditions: FilterQuery = {};

        if (filter.status) {
            conditions.status = filter.status;
        }

        const conditions2: any = {};
        if (filter.search) {
            conditions2['$or'] = [
                {
                    'teacher.user.username': filter.search
                },
                {
                    'teacher.user.full_name': {
                        $regex: filter.search,
                        $options: 'i'
                    }
                }
            ];
        }
        if (filter.staff_id) {
            conditions2['teacher.staff_id'] = filter.staff_id;
        }
        if (filter.date) {
            const startOfDay = moment(filter.date).startOf('day').valueOf();
            const endOfDay = moment(filter.date).endOf('day').valueOf();
            conditions2['$and'] = [
                {
                    $or: [
                        {
                            $and : [
                                { start_time : { $lte: filter.date} },
                                { end_time : { $gte: filter.date} },
                            ]
                        },
                        {
                            $and : [
                                { start_time : { $gte: startOfDay} },
                                { start_time : { $lte: endOfDay} },
                            ]
                        },
                        {
                            $and : [
                                { end_time : { $gte: startOfDay} },
                                { end_time : { $lte: endOfDay} },
                            ]
                        }
                    ]
                }
            ];
        }

        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TeacherAbsentRequestModel.aggregate([
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
            { $sort: { start_time: -1 } },

            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: 'count' }]
                }
            }
        ]);
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { start_time: 1 }
    ): Promise<TeacherAbsentRequest[]> {
        const conditions = TeacherAbsentRequestActions.buildFilterQuery(filter);
        return TeacherAbsentRequestModel.find(conditions, {
            ...select_fields
        })
            .populate('teacher')
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = TeacherAbsentRequestActions.buildFilterQuery(filter);
        return TeacherAbsentRequestModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<TeacherAbsentRequest | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TeacherAbsentRequestModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(
        request: TeacherAbsentRequest
    ): Promise<TeacherAbsentRequest> {
        const newModel = new TeacherAbsentRequestModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('teacher_absent_request_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<any> {
        return TeacherAbsentRequestModel.findOneAndUpdate(
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
        return TeacherAbsentRequestModel.deleteOne({ _id });
    }

    public static findAllByScheduleActive(
        filter: any,
        select_fields: any = {},
        sort: any = { start_time: 1 }
    ): Promise<TeacherAbsentRequest[]> {
        return TeacherAbsentRequestModel.find(filter, {
            ...select_fields
        })
            .populate('teacher')
            .sort(sort)
            .exec();
    }
}
