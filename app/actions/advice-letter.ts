import { query } from 'express';
import AdviceLetter, { AdviceLetterModel } from '../models/advice-letter';
import mongoose from 'mongoose';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    sort?: string;
    status?: number | string;
    search?: string;
    student_id?: number;

};

export default class AdviceLetterActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: any = {};
        const f: any = filter;

        if (filter.status) {
            if (Array.isArray(filter.status) && filter.status.length > 0) {
                conditions.status = { $in: filter.status };
            }
            if (!Array.isArray(filter.status)) {
                conditions.status = filter.status;
            }
            if (f['$or'] && f['$or'].length) {
                conditions['$or'] = f['$or'];
            }

            return conditions;
        }
    }

    public static create(request: any): Promise<AdviceLetter> {
        const newModel = new AdviceLetterModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = AdviceLetterActions.buildFilterQuery(filter);
        return AdviceLetterModel.countDocuments(conditions).exec();
    }

    public static async findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<AdviceLetter | null> {
        const conditions = await AdviceLetterActions.buildFilterQuery(
            filter
        );
        return AdviceLetterModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static remove(_id: mongoose.Types.ObjectId): any {
        return AdviceLetterModel.deleteOne({ _id });
    }

    public static update(request: any): Promise<any> {
        const filter = { _id: request._id };
        const update = { status: request.status };

        const query = AdviceLetterModel.findOneAndUpdate(filter, update, {
            new: true,
            useFindAndModify: false
        });

        const updatedDocument = query.exec();

        return updatedDocument;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = {}
        // select_fields: any = {}
    ): Promise<AdviceLetter[]> {
        const conditions = AdviceLetterActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        return AdviceLetterModel.find(conditions)
            .skip(skip)
            .limit(limit)
            .sort(sort)
            .populate('student')
            .exec();
    }
}
