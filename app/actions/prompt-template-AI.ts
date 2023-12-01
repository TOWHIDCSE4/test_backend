import mongoose from 'mongoose';
import PromptTemplateAI, {
    PromptTemplateAIModel
} from '../models/prompt-template-AI';
import _ from 'lodash';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    title?: any;
    prompt?: string;
    category_obj_id?: string;
    is_active?: number[] | any;
    page_size?: number;
    page_number?: number;
    search?: string;
    $and?: Array<any>;
};

export default class PromptTemplateAIActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.search) {
            conditions.title = {
                $regex: _.escapeRegExp(filter.search),
                $options: 'i'
            };
        }
        if (filter.category_obj_id) {
            conditions.category_obj_id = filter.category_obj_id;
        }
        if (filter.prompt) {
            conditions.prompt = filter.prompt;
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
    ): Promise<PromptTemplateAI[]> {
        const conditions = PromptTemplateAIActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return PromptTemplateAIModel.find(conditions, {
            ...select_fields
        })
            .populate('category')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<PromptTemplateAI[]> {
        const conditions = PromptTemplateAIActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return PromptTemplateAIModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<PromptTemplateAI | null> {
        const conditions = PromptTemplateAIActions.buildFilterQuery(filter);
        return PromptTemplateAIModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = PromptTemplateAIActions.buildFilterQuery(filter);
        return PromptTemplateAIModel.countDocuments(conditions).exec();
    }

    public static create(subject: PromptTemplateAI): Promise<PromptTemplateAI> {
        const newModel = new PromptTemplateAIModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('prompt_template_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: PromptTemplateAI
    ): Promise<any> {
        return PromptTemplateAIModel.findOneAndUpdate(
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
        return PromptTemplateAIModel.deleteOne({ _id });
    }
}
