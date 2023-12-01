import mongoose from 'mongoose';
import ReportBod, { ReportBODModel } from '../models/report-bod';
import { escapeRegExp } from 'lodash';
const logger = require('dy-logger');

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    date?: any;
    page_size?: number;
    page_number?: number;
};
export default class ReportBodActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.date) {
            conditions.date = filter.date;
        }
        return conditions;
    }
    public static findOne(
        filter: any,
        select_fields?: object
    ): Promise<any | null> {
        return ReportBODModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<ReportBod[]> {
        const conditions = ReportBodActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return ReportBODModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static create(subject: ReportBod): Promise<ReportBod> {
        const newModel = new ReportBODModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: ReportBod
    ): Promise<any> {
        return ReportBODModel.findOneAndUpdate(
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
