import mongoose from 'mongoose';
import Order, { OrderModel } from '../models/order';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    id?: number;
    status?: number[] | any;
    user_id?: number;
    search?: string;
    admin_note?: string;
    $or?: Array<any>;
};

export default class OrderActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
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

    // For Admin call Functions
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<Order[]> {
        const conditions = OrderActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return OrderModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    // For WebApp and Mobile call Functions
    public static findAllAndPaginatedForUser(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<Order[]> {
        const conditions = OrderActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return OrderModel.find(conditions, {
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
    ): Promise<Order[]> {
        const conditions = OrderActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return OrderModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .populate('ordered_package')
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Order | null> {
        const conditions = OrderActions.buildFilterQuery(filter);
        return OrderModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = OrderActions.buildFilterQuery(filter);
        return OrderModel.countDocuments(conditions).exec();
    }

    public static create(subject: Order): Promise<Order> {
        const newModel = new OrderModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('order_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Order
    ): Promise<any> {
        return OrderModel.findOneAndUpdate(
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
        return OrderModel.deleteOne({ _id });
    }
}
