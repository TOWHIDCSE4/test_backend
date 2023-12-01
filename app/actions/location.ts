import mongoose from 'mongoose';
import Location, { LocationModel } from '../models/location';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    name?: string;
    search?: string;
    page_size?: number;
    page_number?: number;
};

export default class LocationActions {
    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { id: -1 }
    ): Promise<Location[]> {
        const conditions: FilterQuery = {};
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return LocationModel.find(conditions, {
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
    ): Promise<Location | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return LocationModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions: FilterQuery = {};
        return LocationModel.countDocuments(conditions).exec();
    }

    public static create(subject: Location): Promise<Location> {
        const newModel = new LocationModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('location_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Location
    ): Promise<any> {
        return LocationModel.findOneAndUpdate(
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
        return LocationModel.deleteOne({ _id });
    }
}
