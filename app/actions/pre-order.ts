import mongoose from 'mongoose';
import PreOrder, { PreOrderModel } from '../models/pre-order';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    status?: number[] | any;
    user_id?: number;
    search?: string;
    admin_note?: string;
    $or?: Array<any>;
};

export default class PreOrderActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.user_id) {
            conditions.user_id = filter.user_id;
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
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<PreOrder[]> {
        const conditions = PreOrderActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return PreOrderModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<PreOrder[]> {
        const conditions = PreOrderActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return PreOrderModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .populate('ordered_package')
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<PreOrder | null> {
        const conditions = PreOrderActions.buildFilterQuery(filter);
        return PreOrderModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = PreOrderActions.buildFilterQuery(filter);
        return PreOrderModel.countDocuments(conditions).exec();
    }

    public static create(subject: PreOrder): Promise<PreOrder> {
        const newModel = new PreOrderModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: PreOrder
    ): Promise<any> {
        return PreOrderModel.findOneAndUpdate(
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
        return PreOrderModel.deleteOne({ _id });
    }
}
