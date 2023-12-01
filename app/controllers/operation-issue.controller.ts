import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import OperationIssueActions from '../actions/operation-issue';
import { BadRequestError } from '../core/ApiError';
import { EnumStatus, OperationIssue } from '../models/operation-issue';
import _ from 'lodash';
import axios from 'axios';
import config from 'config';
import AdminActions from '../actions/admin';

const logger = require('dy-logger');
const NOTIFY_API_URL = config.get('services.notification.url');
const INTERNAL_KEY = config.get('services.notification.key');

export default class OperationIssueController {
    public static async markOperationById(
        req: ProtectedRequest,
        res: Response
    ) {
        const { operationIssueId } = req.body;

        const operationIssue = await OperationIssueActions.findOne({
            _id: operationIssueId
        });

        if (!operationIssue) {
            throw new BadRequestError(
                req.t('errors.operation_issue.not_found')
            );
        }

        if (operationIssue.status == EnumStatus.RESOLVED) {
            return new SuccessResponse(req.t('common.success'), {
                ok: true,
                msg: req.t('errors.operation_issue.has_been_resolved')
            }).send(res, req);
        }

        const new_data = await OperationIssueActions.update(operationIssueId, {
            status: EnumStatus.RESOLVED,
            resolved_staff_id: req.user.id,
            resolved_time: new Date().getTime()
        } as OperationIssue);

        if (new_data) {
            try {
                const route = `${NOTIFY_API_URL}/admin/notifications/mark-seen-by-operation-issue-id`;
                const headers = {
                    'api-key': INTERNAL_KEY,
                    'Content-Type': 'application/json; charset=utf-8'
                };
                const response = await axios({
                    method: 'post',
                    url: route,
                    headers,
                    data: {
                        _id: req.user._id,
                        operation_issue_id: operationIssueId
                    }
                });
                logger.info(
                    `markSeenByOperationIssueId, response.data: ${JSON.stringify(
                        response.data
                    )}`
                );
            } catch (err: any) {
                logger.error(
                    'markSeenByOperationIssueId, error: ',
                    err?.message
                );
                throw new BadRequestError(err?.message);
            }
        }

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getStaffNameByIds(
        req: ProtectedRequest,
        res: Response
    ) {
        const { operation_issue_ids } = req.query;

        const lstOperationIssue = await OperationIssueActions.find({
            _id: {
                $in: operation_issue_ids
            }
        });
        const resolvedStaffIds = lstOperationIssue.map(
            (e) => e.resolved_staff_id
        );

        const lstAdmin = await AdminActions.findAll({
            id: {
                $in: resolvedStaffIds
            }
        });

        const res_payload: any = {};
        if (lstAdmin) {
            for (const operationIssue of lstOperationIssue) {
                for (const admin of lstAdmin) {
                    if (operationIssue.resolved_staff_id == admin.id) {
                        res_payload[operationIssue._id] = admin;
                        break;
                    }
                }
            }
        }

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}
