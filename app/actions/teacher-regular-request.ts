import _ from 'lodash';
import mongoose from 'mongoose';
import TeacherRegularRequest, {
    TeacherRegularRequestModel
} from '../models/teacher-regular-request';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    teacher_id?: number;
    status?: number;
    page_size?: number;
    page_number?: number;
    regular_times?: number;
    old_regular_times?: number | any;
    search?: string;
};

export default class TeacherRegularRequestActions {
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { status: -1 }
    ): Promise<TeacherRegularRequest[]> {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.status) {
            conditions.status = filter.status;
        }
        if (filter.regular_times) {
            conditions.regular_times = filter.regular_times;
        }
        if (filter.old_regular_times) {
            conditions.old_regular_times = filter.old_regular_times;
        }
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TeacherRegularRequestModel.find(conditions, {
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
                        $regex: _.escapeRegExp(filter.search),
                        $options: 'i'
                    }
                }
            ];
        }

        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TeacherRegularRequestModel.aggregate([
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
                    data: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: 'count' }]
                }
            }
        ]);
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.status) {
            conditions.status = filter.status;
        }
        return TeacherRegularRequestModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<TeacherRegularRequest | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return TeacherRegularRequestModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(
        request: TeacherRegularRequest
    ): Promise<TeacherRegularRequest> {
        const newModel = new TeacherRegularRequestModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('teacher_regular_request_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: TeacherRegularRequest
    ): Promise<any> {
        return TeacherRegularRequestModel.findOneAndUpdate(
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
        return TeacherRegularRequestModel.deleteOne({ _id });
    }
}
