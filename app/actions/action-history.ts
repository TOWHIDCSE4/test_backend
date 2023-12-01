import mongoose from 'mongoose';
import ActionHistory, { ActionHistoryModel } from '../models/action-history';
import _ from 'lodash';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    parent_obj_id?: string;
    parent_type?: number;
    user_action?: number;
    type?: number;
    page_size?: number;
    page_number?: number;
    search?: string;
    $and?: Array<any>;
};

export default class ActionHistoryActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.parent_obj_id) {
            conditions.parent_obj_id = filter.parent_obj_id;
        }
        if (filter.type) {
            conditions.type = filter.type;
        }
        if (filter.parent_type) {
            conditions.parent_type = filter.parent_type;
        }
        if (filter.user_action) {
            conditions.user_action = filter.user_action;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): Promise<ActionHistory[]> {
        const conditions = ActionHistoryActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        return ActionHistoryModel.aggregate([
            {
                $lookup: {
                    from: 'admins',
                    localField: 'user_action',
                    foreignField: 'id',
                    as: 'staff'
                }
            },
            {
                $unwind: {
                    path: '$staff',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<ActionHistory[]> {
        const conditions = ActionHistoryActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return ActionHistoryModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort: any = {}
    ): Promise<ActionHistory | null> {
        const conditions = ActionHistoryActions.buildFilterQuery(filter);
        return ActionHistoryModel.findOne(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = ActionHistoryActions.buildFilterQuery(filter);
        return ActionHistoryModel.countDocuments(conditions).exec();
    }

    public static create(subject: ActionHistory): Promise<ActionHistory> {
        const newModel = new ActionHistoryModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ActionHistory
    ): Promise<any> {
        return ActionHistoryModel.findOneAndUpdate(
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
        return ActionHistoryModel.deleteOne({ _id });
    }
}
