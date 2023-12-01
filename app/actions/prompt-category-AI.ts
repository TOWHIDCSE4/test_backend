import mongoose from 'mongoose';
import PromptCategoryAI, {
    PromptCategoryAIModel
} from '../models/prompt-category-AI';
import _ from 'lodash';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    title?: any;
    is_active?: number[] | any;
    page_size?: number;
    page_number?: number;
    search?: string;
    $and?: Array<any>;
};

export default class PromptCategoryAIActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.search) {
            conditions.title = {
                $regex: _.escapeRegExp(filter.search),
                $options: 'i'
            };
        }
        if (filter.is_active || filter.is_active === false) {
            conditions.is_active = filter.is_active;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<PromptCategoryAI[]> {
        const conditions = PromptCategoryAIActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return PromptCategoryAIModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<PromptCategoryAI[]> {
        const conditions = PromptCategoryAIActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return PromptCategoryAIModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<PromptCategoryAI | null> {
        const conditions = PromptCategoryAIActions.buildFilterQuery(filter);
        return PromptCategoryAIModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = PromptCategoryAIActions.buildFilterQuery(filter);
        return PromptCategoryAIModel.countDocuments(conditions).exec();
    }

    public static create(subject: PromptCategoryAI): Promise<PromptCategoryAI> {
        const newModel = new PromptCategoryAIModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: PromptCategoryAI
    ): Promise<any> {
        return PromptCategoryAIModel.findOneAndUpdate(
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
        return PromptCategoryAIModel.deleteOne({ _id });
    }
}
