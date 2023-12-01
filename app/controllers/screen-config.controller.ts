import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import ScreenConfigActions from '../actions/screen-config';
import ScreenConfig from '../models/screen-configuration';
const pickUpData = ['_id', 'screen', 'server', 'is_show', 'config'];
const logger = require('dy-logger');

export default class ScreenConfigController {
    public static async getAllScreenConfigPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, search } = req.query;
        const status: any = req.query.status;
        const filter: any = {
            page_number: Number(page_number || 1),
            page_size: Number(page_size || 10)
        };
        if (search) {
            filter.search = search;
        }
        const ScreenConfigData = await ScreenConfigActions.findAllAndPaginated(
            filter
        );
        const count = await ScreenConfigActions.count(filter);
        const res_payload = {
            data: ScreenConfigData,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getOneScreenConfig(
        req: ProtectedRequest,
        res: Response
    ) {
        const { server, screen } = req.query;
        const filter: any = {
            server: server,
            screen: parseInt(screen as string)
        };
        const dataConfig = await ScreenConfigActions.findOne(filter);
        return new SuccessResponse('success', dataConfig).send(res, req);
    }

    public static async createScreenConfig(
        req: ProtectedRequest,
        res: Response
    ) {
        const { is_show, screen, server, config } = req.body;
        const data: any = {
            is_show
        };
        if (screen) {
            data.screen = parseInt(screen as string);
        }
        if (server) {
            data.server = server;
        }
        if (config) {
            data.config = config;
        }
        const ScreenConfig = await ScreenConfigActions.create(
            data as ScreenConfig
        );
        return new SuccessResponse('success', ScreenConfig).send(res, req);
    }

    public static async updateScreenConfig(
        req: ProtectedRequest,
        res: Response
    ) {
        const { is_show, config } = req.body;
        const { _idScreenConfig } = req.params;
        const data: any = {
            is_show,
            config
        };
        const ScreenConfig = await ScreenConfigActions.findOne({
            _id: _idScreenConfig
        });
        if (!ScreenConfig)
            throw new NotFoundError(req.t('errors.ScreenConfig_AI.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'ScreenConfigModel',
            ScreenConfig,
            pickUpData
        );
        const newScreenConfig = await ScreenConfigActions.update(
            _idScreenConfig,
            data as ScreenConfig
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'ScreenConfigModel',
            newScreenConfig,
            pickUpData
        );
        return new SuccessResponse('success', newScreenConfig).send(res, req);
    }

    public static async deleteScreenConfig(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _idScreenConfig } = req.params;
        const ScreenConfig = await ScreenConfigActions.findOne({
            _id: _idScreenConfig
        });
        if (!ScreenConfig) throw new NotFoundError('screen config not found');
        await ScreenConfigActions.remove(_idScreenConfig);
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }
}
