import mongoose from 'mongoose';
import ReportReNew, { ReportReNewModel } from '../models/report-renew';
import { escapeRegExp } from 'lodash';
const logger = require('dy-logger');

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    date?: number;
    staff_id?: number;
    page_size?: number;
    page_number?: number;
};
export default class ReportReNewActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.date) {
            conditions.date = filter.date;
        }
        if (filter.staff_id) {
            conditions.staff_id = filter.staff_id;
        }
        return conditions;
    }
    public static findOne(
        filter: any,
        select_fields?: object
    ): Promise<any | null> {
        return ReportReNewModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<ReportReNew[]> {
        const conditions = ReportReNewActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return ReportReNewModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static create(subject: ReportReNew): Promise<ReportReNew> {
        const newModel = new ReportReNewModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ReportReNew
    ): Promise<any> {
        return ReportReNewModel.findOneAndUpdate(
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
}
