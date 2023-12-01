import mongoose from 'mongoose';
import EventNotice, { EventNoticeModel } from '../models/event-notice';

import { DAY_TO_MS } from '../const/date-time';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    type?: string;
    target?: number[] | any;
    title?: string;
    is_active?: boolean;
    start_time_shown?: number | any;
    start_date_shown?: number;
    end_time_shown?: number | any;
    search?: string;
    $and?: Array<any>;
};

export default class EventNoticeActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.type) {
            conditions.type = filter.type;
        }
        if (filter.title) {
            conditions.title = filter.title;
        }
        if (filter.start_time_shown) {
            conditions.start_time_shown = filter.start_time_shown;
        }
        if (filter.start_date_shown) {
            if (!conditions.$and) {
                conditions.$and = new Array<any>();
            }
            conditions.$and.push({
                start_time_shown: { $gte: filter.start_date_shown }
            });
            conditions.$and.push({
                start_time_shown: { $lte: filter.start_date_shown + DAY_TO_MS }
            });
        }
        if (filter.end_time_shown) {
            conditions.end_time_shown = filter.end_time_shown;
        }
        if (filter.hasOwnProperty('target') && filter.target) {
            conditions.target = { $all: filter.target };
        }
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<EventNotice[]> {
        const conditions = EventNoticeActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return EventNoticeModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<EventNotice[]> {
        const conditions = EventNoticeActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return EventNoticeModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<EventNotice | null> {
        const conditions = EventNoticeActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve(null);
        return EventNoticeModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = EventNoticeActions.buildFilterQuery(filter);
        return EventNoticeModel.countDocuments(conditions).exec();
    }

    public static create(subject: EventNotice): Promise<EventNotice> {
        const newModel = new EventNoticeModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: EventNotice
    ): Promise<any> {
        return EventNoticeModel.findOneAndUpdate(
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
        return EventNoticeModel.deleteOne({ _id });
    }
}
