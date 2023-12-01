import { ProtectedRequest } from 'app-request';
import DepartmentActions from '../actions/department';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import Department, { DepartmentModel } from '../models/department';
import AdminActions from '../actions/admin';
import { EnumRole } from '../models/department';
import { LIST_PERMISSIONS } from '../const/permission';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import PromptTemplateAIActions from '../actions/prompt-template-AI';
import PromptTemplateAI, {
    EnumPromptTemplateAIStatus
} from '../models/prompt-template-AI';
import CounterActions from '../actions/counter';
import PromptCategoryAIActions from '../actions/prompt-category-AI';
const pickUpData = ['_id', 'title', 'prompt', 'is_active', 'description'];

export default class PromptTemplateAIController {
    public static async getAllPromptTemplatePagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search, category } = req.query;
        const status: any = req.query.status;
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10)
        };
        if (status === EnumPromptTemplateAIStatus.ACTIVE) {
            filter.is_active = true;
        } else if (status === EnumPromptTemplateAIStatus.INACTIVE) {
            filter.is_active = false;
        }
        if (search) {
            filter.search = search;
        }
        if (category) {
            filter.category_obj_id = category;
        }
        const promptData = await PromptTemplateAIActions.findAllAndPaginated(
            filter
        );
        const count = await PromptTemplateAIActions.count(filter);
        const res_payload = {
            data: promptData,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllPromptTemplate(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter = {
            is_active: true
        };
        const PromptTemplates = await PromptTemplateAIActions.findAll(filter);
        return new SuccessResponse('success', PromptTemplates).send(res, req);
    }

    public static async createPromptTemplate(
        req: ProtectedRequest,
        res: Response
    ) {
        const { title, description, category, prompt, is_active } = req.body;
        const dataCategory = await PromptCategoryAIActions.findOne({
            _id: category
        });
        if (!dataCategory) {
            throw new BadRequestError('category is not exists');
        }
        const data: any = {
            title,
            prompt,
            category_obj_id: dataCategory._id,
            category: dataCategory
        };
        if (description) {
            data.description = description;
        }
        if (is_active === 'true' || is_active === true) {
            data.is_active = true;
        } else if (is_active === 'false' || is_active === false) {
            data.is_active = false;
        }
        const counter = await CounterActions.findOne({});
        data.id = counter.prompt_template_id;
        const PromptTemplate = await PromptTemplateAIActions.create(
            data as PromptTemplateAI
        );
        return new SuccessResponse('success', PromptTemplate).send(res, req);
    }

    public static async updatePromptTemplate(
        req: ProtectedRequest,
        res: Response
    ) {
        const { title, description, category, prompt, is_active } = req.body;
        const { _idPromptTemplate } = req.params;
        const PromptTemplate: any = await PromptTemplateAIActions.findOne({
            _id: _idPromptTemplate
        });
        const data: any = {
            title,
            description,
            prompt
        };
        if (category !== PromptTemplate.category_obj_id) {
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
            'PromptTemplateAIModel',
            PromptTemplate,
            pickUpData
        );
        const newPromptTemplate = await PromptTemplateAIActions.update(
            _idPromptTemplate,
            data as PromptTemplateAI
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'PromptTemplateAIModel',
            newPromptTemplate,
            pickUpData
        );
        return new SuccessResponse('success', newPromptTemplate).send(res, req);
    }

    public static async deletePromptTemplate(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _idPromptTemplate } = req.params;
        const PromptTemplate = await PromptTemplateAIActions.findOne({
            _id: _idPromptTemplate
        });
        if (!PromptTemplate)
            throw new NotFoundError('prompt template not found');
        await PromptTemplateAIActions.remove(_idPromptTemplate);
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }
}
