import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import ApiKeyAIActions from '../actions/api-key-AI';
import ApiKeyAI, { EnumApiKeyAIStatus } from '../models/api-key-AI';
import moment from 'moment';
const pickUpData = ['_id', 'title', 'api_key', 'is_active', 'type'];
const logger = require('dy-logger');
const OPEN_AI_URL = process.env.OPEN_AI_URI || 'https://api.openai.com';

export default class ApiKeyAIController {
    public static async getAllApiKeyPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const status: any = req.query.status;
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10)
        };
        if (status === EnumApiKeyAIStatus.ACTIVE) {
            filter.is_active = true;
        } else if (status === EnumApiKeyAIStatus.INACTIVE) {
            filter.is_active = false;
        }
        if (search) {
            filter.search = search;
        }
        const apiKeyData = await ApiKeyAIActions.findAllAndPaginated(filter);
        const count = await ApiKeyAIActions.count(filter);
        const res_payload = {
            data: apiKeyData,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getAllApiKey(req: ProtectedRequest, res: Response) {
        const filter = {
            is_active: true
        };
        const apiKeys = await ApiKeyAIActions.findAll(filter);
        return new SuccessResponse('success', apiKeys).send(res, req);
    }

    public static async createApiKey(req: ProtectedRequest, res: Response) {
        const { title, api_key, is_active } = req.body;
        const data: any = {
            title,
            api_key,
            last_used_time: moment().valueOf()
        };
        if (is_active === 'true' || is_active === true) {
            data.is_active = true;
        } else if (is_active === 'false' || is_active === false) {
            data.is_active = false;
        }
        const apiKey = await ApiKeyAIActions.create(data as ApiKeyAI);
        return new SuccessResponse('success', apiKey).send(res, req);
    }

    public static async reloadBalance(req: ProtectedRequest, res: Response) {
        const { _idApiKey } = req.body;
        const apiKey = await ApiKeyAIActions.findOne({ _id: _idApiKey });
        if (!apiKey)
            throw new NotFoundError(req.t('errors.apiKey_AI.not_found'));
        let balanceNew = apiKey.balance;
        logger.info('start reload balance api key >>');
        // try {
        //     const start_date = '2023-07-28'
        //     const now = moment().add(1, 'day').format('YYYY-MM-DD')
        //     const route = OPEN_AI_URL + `/dashboard/billing/usage?start_date=${start_date}&end_date=${now}`;
        //     const headers = {
        //         Authorization:
        //             'Bearer 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',
        //         'Content-Type': 'application/json; charset=utf-8'
        //     };
        //     const response = await axios({
        //         method: 'get',
        //         url: route,
        //         headers
        //     });
        //     console.log(response)
        //     logger.info('end reload balance api key <<')
        // } catch (err: any) {
        //     logger.error('reload balance api key error: ',err);
        //     throw new Error('Reload error');
        // }
        let newApiKey = [];
        if (balanceNew != apiKey.balance) {
            newApiKey = await ApiKeyAIActions.update(_idApiKey, {
                balance: balanceNew
            } as ApiKeyAI);
        }
        return new SuccessResponse('success', newApiKey).send(res, req);
    }

    public static async updateApiKey(req: ProtectedRequest, res: Response) {
        const { title, api_key, is_active } = req.body;
        const { _idApiKey } = req.params;
        const data: any = {
            title,
            api_key
        };
        if (is_active === 'true' || is_active === true) {
            data.is_active = true;
        } else if (is_active === 'false' || is_active === false) {
            data.is_active = false;
        }
        const apiKey = await ApiKeyAIActions.findOne({ _id: _idApiKey });
        if (!apiKey)
            throw new NotFoundError(req.t('errors.apiKey_AI.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'ApiKeyAIModel',
            apiKey,
            pickUpData
        );
        const newApiKey = await ApiKeyAIActions.update(
            _idApiKey,
            data as ApiKeyAI
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'ApiKeyAIModel',
            newApiKey,
            pickUpData
        );
        return new SuccessResponse('success', newApiKey).send(res, req);
    }

    public static async deleteApiKey(req: ProtectedRequest, res: Response) {
        const { _idApiKey } = req.params;
        const apiKey = await ApiKeyAIActions.findOne({ _id: _idApiKey });
        if (!apiKey)
            throw new NotFoundError(req.t('errors.apiKey_AI.not_found'));
        await ApiKeyAIActions.remove(_idApiKey);
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }
}
