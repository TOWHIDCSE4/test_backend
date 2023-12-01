import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import PromptCategoryAIActions from '../actions/prompt-category-AI';
import PromptCategoryAI, {
    EnumPromptCategoryAIStatus
} from '../models/prompt-category-AI';
import moment from 'moment';
const pickUpData = ['_id', 'title', 'api_key', 'is_active', 'type'];
const logger = require('dy-logger');
const OPEN_AI_URL = process.env.OPEN_AI_URI || 'https://api.openai.com';

export default class PromptCategoryAIController {
    public static async getAllPromptCategoryPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const status: any = req.query.status;
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10)
        };
        if (status === EnumPromptCategoryAIStatus.ACTIVE) {
            filter.is_active = true;
        } else if (status === EnumPromptCategoryAIStatus.INACTIVE) {
            filter.is_active = false;
        }
        if (search) {
            filter.search = search;
        }
        const PromptCategoryData =
            await PromptCategoryAIActions.findAllAndPaginated(filter);
        const count = await PromptCategoryAIActions.count(filter);
        const res_payload = {
            data: PromptCategoryData,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllPromptCategory(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter = {
            is_active: true
        };
        const PromptCategorys = await PromptCategoryAIActions.findAll(filter);
        return new SuccessResponse('success', PromptCategorys).send(res, req);
    }

    public static async createPromptCategory(
        req: ProtectedRequest,
        res: Response
    ) {
        const { title, description, is_active } = req.body;
        const data: any = {
            title
        };
        if (is_active === 'true' || is_active === true) {
            data.is_active = true;
        } else if (is_active === 'false' || is_active === false) {
            data.is_active = false;
        }
        const PromptCategory = await PromptCategoryAIActions.create(
            data as PromptCategoryAI
        );
        return new SuccessResponse('success', PromptCategory).send(res, req);
    }

    public static async updatePromptCategory(
        req: ProtectedRequest,
        res: Response
    ) {
        const { title, api_key, is_active } = req.body;
        const { _idPromptCategory } = req.params;
        const data: any = {
            title,
            api_key
        };
        if (is_active === 'true' || is_active === true) {
            data.is_active = true;
        } else if (is_active === 'false' || is_active === false) {
            data.is_active = false;
        }
        const PromptCategory = await PromptCategoryAIActions.findOne({
            _id: _idPromptCategory
        });
        if (!PromptCategory)
            throw new NotFoundError(
                req.t('errors.PromptCategory_AI.not_found')
            );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'PromptCategoryAIModel',
            PromptCategory,
            pickUpData
        );
        const newPromptCategory = await PromptCategoryAIActions.update(
            _idPromptCategory,
            data as PromptCategoryAI
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'PromptCategoryAIModel',
            newPromptCategory,
            pickUpData
        );
        return new SuccessResponse('success', newPromptCategory).send(res, req);
    }

    public static async deletePromptCategory(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _idPromptCategory } = req.params;
        const PromptCategory = await PromptCategoryAIActions.findOne({
            _id: _idPromptCategory
        });
        if (!PromptCategory)
            throw new NotFoundError('prompt category not found');
        await PromptCategoryAIActions.remove(_idPromptCategory);
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }
}
