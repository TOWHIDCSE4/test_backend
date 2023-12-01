import mongoose from 'mongoose';
import Subject, { SubjectModel } from '../models/subject';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    page_size?: number;
    page_number?: number;
    alias?: string;
    slug?: string;
    id?: number;
    is_active?: boolean;
};

export default class SubjectActions {
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ): Promise<Subject[]> {
        const conditions: FilterQuery = {};
        if (filter.is_active != null && filter.is_active != undefined) {
            conditions.is_active = filter.is_active;
        }
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return SubjectModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Subject | null> {
        return SubjectModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions: FilterQuery = {};
        if (filter.is_active != null) {
            conditions.is_active = filter.is_active;
        }
        return SubjectModel.countDocuments(conditions).exec();
    }

    public static create(subject: Subject): Promise<Subject> {
        const newModel = new SubjectModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('subject_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Subject
    ): Promise<any> {
        return SubjectModel.findOneAndUpdate(
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
        return SubjectModel.deleteOne({ _id });
    }
}
