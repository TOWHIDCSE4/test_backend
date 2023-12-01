import { ProtectedRequest } from 'app-request';
import { BadRequestError } from '../core/ApiError';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { MeetAction } from '../const/meet';
import BookingActions from '../actions/booking';
import CrmApiServices from '../services/crm';

export default class MeetController {
    public static async webhook(req: ProtectedRequest, res: Response) {
        const { action, data } = req.body;
        if (!action || !data) {
            throw new BadRequestError();
        }

        if (action === MeetAction.record_url) {
            const { url, origin_data } = data;
            const booking = await BookingActions.findOne({
                id: Number(origin_data)
            });
            if (!booking) {
                throw new BadRequestError(req.t('errors.booking.not_found'));
            }
            let record_link = booking.record_link;
            if (typeof booking.record_link === 'string') {
                record_link = [booking.record_link];
            }
            if (!booking.record_link) {
                record_link = [];
            }
            await booking.update({
                record_link: [...record_link, url]
            });
            // bắn data tới API CRM để nhận được memo của buổi học trial
            await CrmApiServices.sendMemoTrialBookingAfterUploadVideo(
                req,
                booking
            );
        }

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}
