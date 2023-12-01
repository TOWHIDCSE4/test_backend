import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import JobQueueServices from '../services/job-queue';

export default class EmailController {
    public static async sendOneSpecificEmail(
        req: ProtectedRequest,
        res: Response
    ) {
        const { body, email, subject } = req.body;
        await JobQueueServices.sendUnicastMail({
            to: email,
            subject,
            body
        });
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async sendMulticastEmail(
        req: ProtectedRequest,
        res: Response
    ) {
        const { body, emails, subject } = req.body;
        await JobQueueServices.sendMultticastMail({
            to: emails,
            subject,
            body
        });
        return new SuccessResponse(req.t('common.success'), {
            sent: emails.length
        }).send(res, req);
    }
}
