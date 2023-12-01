import mongoose from 'mongoose';
import Counter, { CounterModel } from '../models/counter';

const cacheService = require('../services/redis/cache-service');

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
};
let counterData: any = null;
export default class CounterActions {
    public static async findOne(
        filter: FilterQuery = {},
        select_fields?: object
    ): Promise<any> {
        if (!counterData) {
            let counter = await cacheService.get('counter');

            if (!counter) {
                counter = await CounterModel.findOne({}).exec();

                if (!counter) {
                    return null;
                }

                await cacheService.set('counter', counter);
            }
            counterData = counter;
        }
        return counterData;
    }

    public static findOneToInit(
        filter: FilterQuery = {},
        select_fields?: object
    ): Promise<Counter | null> {
        return CounterModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static async create(counter: any): Promise<Counter> {
        await cacheService.set('counter', counter);

        const newModel = new CounterModel({
            ...counter,
            created_time: new Date(),
            updated_time: new Date()
        });
        counterData = newModel;
        return newModel.save();
    }

    public static async update(
        _id: mongoose.Types.ObjectId,
        diff: any
    ): Promise<any> {
        await cacheService.set('counter', diff);

        return CounterModel.findOneAndUpdate(
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

    public static async increaseId(key: string): Promise<any> {
        counterData[key]++;

        return cacheService.set('counter', counterData);
    }
}
