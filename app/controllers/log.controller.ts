import { ProtectedRequest } from 'app-request';
import { LogModel } from '../models/log';
import { Response } from 'express';
import _ from 'lodash';
import { SuccessResponse } from '../core/ApiResponse';
import LogActions from '../actions/log';

export default class LogController {
    public static async get(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, min_start_time, max_end_time } =
            req.query;
        const filter: any = {
            ...req.query,
            min_start_time: Number(min_start_time),
            max_end_time: Number(max_end_time),
            page_size: Number(page_size),
            page_number: Number(page_number)
        };
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const res_agg = await LogActions.findAllAndPaginated(filter);
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getListApi(req: ProtectedRequest, res: Response) {
        const res_payload = {
            data: new Array<any>()
        };
        const list = await LogModel.distinct('route');
        res_payload.data = list;
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}
