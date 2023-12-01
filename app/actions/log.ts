import moment from 'moment';
import mongoose from 'mongoose';
import Log, { LogModel } from '../models/log';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    search?: string;
    method?: string;
    url?: string;
    staff_id?: number;
    min_start_time?: number;
    max_end_time?: number;
    page_size?: number;
    page_number?: number;
    searchBody?: string;
};

export default class LogActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: any = {};
        if (filter.search) {
            conditions.$text = { $search: filter.search };
        }
        if (filter.searchBody) {
            conditions['$or'] = [
                {
                    'body_data.student_id': parseInt(
                        filter.searchBody as string
                    )
                },
                {
                    'body_data.teacher_id': parseInt(
                        filter.searchBody as string
                    )
                },
                {
                    'body_data.user_id': parseInt(filter.searchBody as string)
                },
                {
                    'body_data.id': parseInt(filter.searchBody as string)
                },
                {
                    'body_data.booking_id': parseInt(
                        filter.searchBody as string
                    )
                }
            ];
        }
        if (filter.method) {
            conditions.method = filter.method;
        }
        if (filter.url) {
            conditions.route = filter.url;
        }
        if (filter.staff_id) {
            conditions['user.id'] = Number(filter.staff_id);
        }
        if (filter.min_start_time && filter.max_end_time) {
            conditions.created_time = {
                $gte: moment(filter.min_start_time).toDate(),
                $lte: moment(filter.max_end_time).toDate()
            };
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): any {
        const conditions = LogActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return LogModel.aggregate([
            { $match: conditions },
            { $sort: sort },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]);
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<Log[]> {
        const conditions = LogActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return LogModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Log | null> {
        const conditions = LogActions.buildFilterQuery(filter);
        return LogModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = LogActions.buildFilterQuery(filter);
        return LogModel.countDocuments(conditions).exec();
    }

    public static create(subject: Log): Promise<Log> {
        const newModel = new LogModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Log
    ): Promise<any> {
        return LogModel.findOneAndUpdate(
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
        return LogModel.deleteOne({ _id });
    }
}
