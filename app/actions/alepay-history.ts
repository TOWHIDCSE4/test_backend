import mongoose from 'mongoose';
import { AlepayModel } from '../models/alepay-history';

export default class AlepayActions {
    public static findAll(
        filter: any,
        sort: object = { createdAt: 1 },
        select_fields: object = {}
    ): Promise<any> {
        return AlepayModel.find(filter, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findAllAndPaginated(
        filter: any,
        sort: object = { createdAt: 1 },
        select_fields: object = {}
    ): Promise<any[]> {
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return AlepayModel.find(filter, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findOne(
        filter: any,
        select_fields?: object
    ): Promise<any | null> {
        return AlepayModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(subject: any): Promise<any> {
        const newModel = new AlepayModel({
            ...subject
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<any> {
        return AlepayModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff
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
        return AlepayModel.deleteOne({ _id });
    }
}
