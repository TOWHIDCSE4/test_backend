import mongoose from 'mongoose';
import AIReportResult, {
    AIReportResultModel
} from '../models/ai-report-result';
import _ from 'lodash';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    title?: any;
    number_lesson?: number;
    content?: any;
    user_id?: number;
    page_size?: number;
    page_number?: number;
    search?: string;
    $and?: Array<any>;
    prompt_template_id?: any;
    'prompt_template.category_obj_id'?: any;
    'user.username'?: any;
};

export default class AIReportResultActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.search) {
            conditions['user.username'] = {
                $regex: _.escapeRegExp(filter.search),
                $options: 'i'
            };
        }
        if (filter.content) {
            conditions.content = filter.content;
        }
        if (filter.user_id) {
            conditions.user_id = filter.user_id;
        }
        if (filter.number_lesson) {
            conditions.number_lesson = filter.number_lesson;
        }
        if (filter.prompt_template_id) {
            conditions.prompt_template_id = filter.prompt_template_id;
        }
        if (filter['prompt_template.category_obj_id']) {
            conditions['prompt_template.category_obj_id'] =
                filter['prompt_template.category_obj_id'];
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<AIReportResult[]> {
        const conditions = AIReportResultActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        return AIReportResultModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'prompt-template-AI',
                    let: {
                        prompt_id: '$prompt_template_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$$prompt_id', '$id'] }
                            }
                        },
                        {
                            $lookup: {
                                from: 'prompt-category-AI',
                                localField: 'category',
                                foreignField: '_id',
                                as: 'category'
                            }
                        },
                        {
                            $unwind: '$category'
                        }
                    ],
                    as: 'prompt_template'
                }
            },
            {
                $unwind: {
                    path: '$prompt_template',
                    preserveNullAndEmptyArrays: false
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
                    pagination: [{ $group: { _id: null, total: { $sum: 1 } } }]
                }
            },
            { $unwind: '$pagination' }
        ]).exec();
    }

    public static findAll(
        filter: FilterQuery,
        sort: any = { start_time_applied: 1 },
        select_fields: any = {}
    ): Promise<AIReportResult[]> {
        const conditions = AIReportResultActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return AIReportResultModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<AIReportResult | null> {
        const conditions = AIReportResultActions.buildFilterQuery(filter);
        return AIReportResultModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = AIReportResultActions.buildFilterQuery(filter);
        return AIReportResultModel.countDocuments(conditions).exec();
    }

    public static create(subject: AIReportResult): Promise<AIReportResult> {
        const newModel = new AIReportResultModel({
            ...subject,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('ai_report_result_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: AIReportResult
    ): Promise<any> {
        return AIReportResultModel.findOneAndUpdate(
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
        return AIReportResultModel.deleteOne({ _id });
    }
}
