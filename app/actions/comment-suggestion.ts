import mongoose from 'mongoose';
import CommentSuggestion, {
    CommentSuggestionModel
} from '../models/comment-suggestion';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    keyword?: string | any;
    type?: string | any;
    month?: number;
    point?: number | any;
    age?: number;
    min_point?: number | any;
    max_point?: number | any;
    min_age?: number | any;
    max_age?: number | any;
    page_size?: number;
    page_number?: number;
    $or?: any;
    $and?: any;
};

export default class CommentSuggestionActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.keyword) {
            conditions.keyword = filter.keyword;
        }
        if (filter.type) {
            conditions.type = filter.type;
        }
        if (filter.month) {
            conditions.month = filter.month;
        }
        if (filter.point || filter.point === 0) {
            conditions.min_point = { $lte: filter.point };
            conditions.max_point = { $gte: filter.point };
        }
        if (filter.age) {
            conditions.min_age = { $lte: filter.age };
            conditions.max_age = { $gte: filter.age };
        }
        return conditions;
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { keyword: 1 }
    ): Promise<CommentSuggestion[]> {
        const conditions = CommentSuggestionActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return CommentSuggestionModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { keyword: 1 }
    ): Promise<CommentSuggestion[]> {
        const conditions = CommentSuggestionActions.buildFilterQuery(filter);
        return CommentSuggestionModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = CommentSuggestionActions.buildFilterQuery(filter);
        return CommentSuggestionModel.countDocuments(conditions).exec();
    }

    public static async findOneRandomSuggestion(
        filter: FilterQuery,
        select_fields: any = {}
    ): Promise<CommentSuggestion | null> {
        filter.month = new Date().getUTCMonth() + 1;
        const conditions = CommentSuggestionActions.buildFilterQuery(filter);
        const count = await CommentSuggestionActions.count(conditions);
        if (count === 0) {
            return Promise.resolve(null);
        }
        const random_skip = Math.floor(Math.random() * count);
        const result = await CommentSuggestionModel.find(conditions, {
            ...select_fields
        })
            .skip(random_skip)
            .limit(1)
            .exec();
        if (result.length == 0) {
            return Promise.resolve(null);
        } else {
            return Promise.resolve(result[0]);
        }
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<CommentSuggestion | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return CommentSuggestionModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static create(
        suggestion: CommentSuggestion
    ): Promise<CommentSuggestion> {
        const new_suggestion = new CommentSuggestionModel({
            ...suggestion,
            created_time: new Date()
        });
        CounterActions.increaseId('suggestion_id');
        return new_suggestion.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: CommentSuggestion
    ): Promise<any> {
        return CommentSuggestionModel.findOneAndUpdate(
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
        return CommentSuggestionModel.deleteOne({ _id });
    }
}
