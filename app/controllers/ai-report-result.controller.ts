import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import { LIST_PERMISSIONS } from '../const/permission';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import AIReportResultActions from '../actions/ai-report-result';
import AIReportResult from '../models/ai-report-result';
import CounterActions from '../actions/counter';
import PromptCategoryAIActions from '../actions/prompt-category-AI';
import PromptTemplateAIActions from '../actions/prompt-template-AI';
import UserActions from '../actions/user';
const logger = require('dy-logger');

const pickUpData = ['_id', 'title', 'prompt', 'is_active', 'description'];

export default class AIReportResultController {
    public static async getAllReportResultPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search, category, prompt_template_id } =
            req.query;
        let res_payload: any = {
            data: null,
            pagination: {
                total: 0
            }
        };
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10)
        };
        if (prompt_template_id) {
            filter.prompt_template_id = Number(prompt_template_id);
        }
        if (search) {
            filter.search = search;
        }
        if (category) {
            filter['prompt_template.category_obj_id'] = category;
        }
        const resultData: any = await AIReportResultActions.findAllAndPaginated(
            filter
        );
        if (resultData && resultData.length > 0) {
            res_payload.data = resultData[0].data;
            res_payload.pagination = resultData[0].pagination;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllReportResult(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter = {
            content: { $exists: true }
        };
        const AIReportResults = await AIReportResultActions.findAll(filter);
        return new SuccessResponse('success', AIReportResults).send(res, req);
    }

    public static async createReportResult(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            result_title,
            result_content,
            user_name,
            prompt_id,
            params,
            from_date,
            to_date,
            number_lesson
        } = req.body;
        logger.info('start createReportResult >> ' + prompt_id);
        const dataPrompt = await PromptTemplateAIActions.findOne({
            id: parseInt(prompt_id as string)
        });
        if (!dataPrompt) {
            throw new BadRequestError('Prompt Template is not exists');
        }
        let userData: any = null;
        if (user_name) {
            userData = await UserActions.findOne({ username: user_name });
            if (!userData) {
                throw new BadRequestError('User is not exists');
            }
        }
        const data: any = {
            title: result_title,
            content: result_content,
            user_id: userData?.id,
            params: params,
            prompt_template_id: parseInt(prompt_id as string)
        };
        if (number_lesson) {
            data.number_lesson = number_lesson;
        }
        if (from_date) {
            data.from_date = from_date;
        }
        if (to_date) {
            data.to_date = to_date;
        }
        const counter = await CounterActions.findOne();
        data.id = counter.ai_report_result_id;
        logger.info('id ai report result: ' + data.id);
        const AIReportResult = await AIReportResultActions.create(
            data as AIReportResult
        );
        return new SuccessResponse('success', AIReportResult).send(res, req);
    }

    public static async updateReportResult(
        req: ProtectedRequest,
        res: Response
    ) {
        const { title, description, category, prompt, is_active } = req.body;
        const { _idReportResult } = req.params;
        const AIReportResult: any = await AIReportResultActions.findOne({
            _id: _idReportResult
        });
        const data: any = {
            title,
            description,
            prompt
        };
        if (category !== AIReportResult.category_obj_id) {
            const dataCategory = await PromptCategoryAIActions.findOne({
                _id: category
            });
            if (!dataCategory) {
                throw new BadRequestError('category is not exists');
            }
            data.category_obj_id = dataCategory._id;
            data.category = dataCategory;
        }
        if (is_active === 'true' || is_active === true) {
            data.is_active = true;
        } else if (is_active === 'false' || is_active === false) {
            data.is_active = false;
        }

        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'AIReportResultModel',
            AIReportResult,
            pickUpData
        );
        const newAIReportResult = await AIReportResultActions.update(
            _idReportResult,
            data as AIReportResult
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'AIReportResultModel',
            newAIReportResult,
            pickUpData
        );
        return new SuccessResponse('success', newAIReportResult).send(res, req);
    }

    public static async deleteReportResult(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _idReportResult } = req.params;
        const AIReportResult = await AIReportResultActions.findOne({
            _id: _idReportResult
        });
        if (!AIReportResult) throw new NotFoundError('Report result not found');
        await AIReportResultActions.remove(_idReportResult);
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }
}
