import { BackEndEvent } from './../const/notification';
import EventNotice, {
    EnumEventNoticeType,
    EnumTargetType
} from './../models/event-notice';
import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import EventNoticeActions from '../actions/event-notice';
import UserActions from '../actions/user';
import TemplateActions from '../actions/template';
import _ from 'lodash';
import moment from 'moment';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'type',
    'target',
    'title',
    'content',
    'start_time_shown',
    'end_time_shown',
    'is_active',
    'image'
];
export default class EventNoticeController {
    public static async getEventNoticeByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, start_time_shown, end_time_shown } =
            req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            start_time_shown: start_time_shown
                ? { $gte: parseInt(start_time_shown as string) }
                : null,
            end_time_shown: end_time_shown
                ? { $lte: parseInt(end_time_shown as string) }
                : null
        };
        const event_notices = await EventNoticeActions.findAllAndPaginated(
            filter
        );
        const count = await EventNoticeActions.count(filter);
        const res_payload = {
            data: event_notices,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getEventNoticesByUsers(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const roleByUser = req.user.role;
        const user = await UserActions.findOne({ id: req.user.id });
        const res_payload = {
            data: [] as any[],
            pagination: {
                total: 0
            }
        };
        if (user) {
            if (
                user.date_of_birth &&
                moment(user.date_of_birth).format('MM/DD') ===
                    moment().format('MM/DD')
            ) {
                const birthdayNotice = await TemplateActions.findOne({
                    code: BackEndEvent.HAPPY_BIRTHDAY_EVENT
                });
                if (birthdayNotice) {
                    res_payload.data.push({
                        ...birthdayNotice.toJSON(),
                        type: birthdayNotice.code
                    });
                }
            }
        }
        const current_moment = new Date().getTime();
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            start_time_shown: { $lte: current_moment },
            end_time_shown: { $gte: current_moment },
            target: roleByUser,
            is_active: true
        };
        const excluded_fields = {
            start_time_shown: 0,
            end_time_shown: 0,
            target: 0,
            _id: 0,
            status: 0,
            is_active: 0
        };
        const event_notices = await EventNoticeActions.findAllAndPaginated(
            filter,
            { created_time: -1 },
            excluded_fields
        );
        const count = await EventNoticeActions.count(filter);
        res_payload.data = _.concat(res_payload.data, event_notices);
        res_payload.pagination.total = count;
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createEventNotice(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            title,
            start_time_shown,
            end_time_shown,
            target,
            type,
            content,
            image,
            is_active
        } = req.body;

        const checkTitle = await EventNoticeActions.findOne({ title });
        if (checkTitle) {
            throw new BadRequestError(
                req.t('errors.event_notice.title', title)
            );
        }

        const current_moment = new Date().getTime();
        if (start_time_shown >= end_time_shown) {
            throw new BadRequestError(
                req.t('errors.event_notice.invalid_shown_time')
            );
        }
        if (end_time_shown <= current_moment) {
            throw new BadRequestError(
                req.t('errors.event_notice.invalid_shown_time')
            );
        }

        const event_notice_info = {
            title,
            type: type as EnumEventNoticeType,
            start_time_shown: _.toInteger(start_time_shown),
            end_time_shown: _.toInteger(end_time_shown),
            target: target as EnumTargetType[],
            content,
            image,
            is_active
        };
        await EventNoticeActions.create({
            ...event_notice_info
        } as EventNotice);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async editEventNotice(req: ProtectedRequest, res: Response) {
        const { event_notice_id } = req.params;
        const diff = { ...req.body };

        const eventNotice = await EventNoticeActions.findOne({
            _id: event_notice_id as string
        });
        if (!eventNotice)
            throw new BadRequestError(req.t('errors.event_notice.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'EventNoticeModel',
            eventNotice,
            pickUpData
        );
        if (diff.start_time_shown || diff.end_time_shown) {
            if (!diff.start_time_shown) {
                diff.start_time_shown = eventNotice.start_time_shown;
            } else if (!diff.end_time_shown) {
                diff.end_time_shown = eventNotice.end_time_shown;
            }
            if (diff.start_time_shown >= diff.end_time_shown) {
                throw new BadRequestError(
                    req.t('errors.event_notice.invalid_shown_time')
                );
            }
        }

        const new_data = await EventNoticeActions.update(eventNotice._id, {
            ...diff
        } as EventNotice);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'EventNoticeModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async removeEventNotice(
        req: ProtectedRequest,
        res: Response
    ) {
        const { event_notice_id } = req.params;
        const event_notice = await EventNoticeActions.findOne({
            _id: event_notice_id as string
        });
        if (event_notice) {
            await EventNoticeActions.remove(event_notice._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}
