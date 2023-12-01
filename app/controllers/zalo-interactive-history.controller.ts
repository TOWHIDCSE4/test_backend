import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import ZaloInteractiveHistoryActions from '../actions/zalo-interactive-history';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import {
    EnumEventType,
    EventType,
    ZaloInteractiveHistoryModel
} from '../models/zalo-interactive-history';
import UserActions from '../actions/user';
import moment from 'moment';
import {
    ZALO_CALLBACK_DATA_OF_BUTTON_INTERACTIVE,
    ZALO_OA_MESSAGE_TYPE,
    ZaloOANotification
} from '../const/notification';
import * as natsClient from '../services/nats/nats-client';

const logger = require('dy-logger');

export enum EnumFilterType {
    ALL = '',
    ACTIVE = 1,
    WILL_SOON_EXPIRE = 2,
    EXPIRED = 3
}
export default class ZaloInteractiveHistoryController {
    public static async getZaloInteractiveHistoryPaginated(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            min_start_time,
            max_end_time,
            search_user,
            user_id,
            staff_id
        } = req.query;
        const filter_type = parseInt(req.query.filter_type as string);
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (user_id) {
            filter.user_id = user_id;
        }
        if (min_start_time && max_end_time) {
            filter.interaction_time = {
                $gte: parseInt(min_start_time as string),
                $lte: parseInt(max_end_time as string)
            };
        }
        const timeCheckStart = moment().subtract(7, 'd').valueOf();
        const timeCheckEnd = moment().subtract(5, 'd').valueOf();
        if (filter_type == EnumFilterType.WILL_SOON_EXPIRE) {
            filter.interaction_time = {
                $gte: timeCheckStart,
                $lt: timeCheckEnd
            };
        } else if (filter_type == EnumFilterType.EXPIRED) {
            filter.interaction_time = { $lte: timeCheckStart };
        } else if (filter_type == EnumFilterType.ACTIVE) {
            filter.interaction_time = { $gt: timeCheckEnd };
        }
        if (search_user) {
            filter.search_user = search_user;
        }
        if (staff_id) {
            filter.staff_id = parseInt(staff_id as string);
        }
        const historyData =
            await ZaloInteractiveHistoryActions.findAllAndPaginatedWidthSeachUser(
                filter
            );
        const count = await ZaloInteractiveHistoryActions.countHistory(filter);
        const res_payload = {
            data: historyData,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async webhook(req: ProtectedRequest, res: Response) {
        const event_name = req.body.event_name;
        if (!event_name) {
            throw new BadRequestError();
        }
        logger.info('webhook: start event zalo >>');
        const data: any = {};
        let zalo_id = null;
        logger.info('data body event' + JSON.stringify(req.body));
        switch (event_name) {
            case EventType.SEND_MESSAGE:
                data.last_event = EnumEventType.SEND_MESSAGE;
                zalo_id = req.body?.sender?.id;
                if (
                    req.body?.message?.text ==
                    ZALO_CALLBACK_DATA_OF_BUTTON_INTERACTIVE
                ) {
                    const userRecipient = await UserActions.findOne({
                        zalo_id: zalo_id
                    });
                    if (userRecipient) {
                        const historyCheck =
                            await ZaloInteractiveHistoryActions.findOne({
                                user_id: userRecipient.id
                            });
                        if (
                            !historyCheck ||
                            (historyCheck && !historyCheck?.sent_in_day)
                        ) {
                            natsClient.publishEventZalo(
                                userRecipient,
                                ZaloOANotification.CALLBACK_INTERACTIVE_BUTTON_ACTIONS,
                                {}
                            );
                            data.sent_in_day = true;
                        }
                    }
                }
                break;
            case EventType.SEND_IMAGE:
                data.last_event = EnumEventType.SEND_IMAGE;
                zalo_id = req.body?.sender?.id;
                break;
            case EventType.SEND_STICKER:
                data.last_event = EnumEventType.SEND_STICKER;
                zalo_id = req.body?.sender?.id;
                break;
            case EventType.CARE:
                data.last_event = EnumEventType.CARE;
                zalo_id = req.body?.follower?.id;
                break;
            case EventType.CALL_AWAY:
                data.last_event = EnumEventType.CALL_AWAY;
                zalo_id = req.body?.user_id;
                break;
            default:
                break;
        }
        logger.info('zalo id: ' + zalo_id);
        if (data.last_event) {
            data.interaction_time = parseInt(req.body?.timestamp as string);
            let dataUser = null;
            if (zalo_id) {
                dataUser = await UserActions.findAll({ zalo_id: zalo_id });
                for await (const user of dataUser) {
                    logger.info('action data event of user_id:' + user.id);
                    const dataHistoryCheck =
                        await ZaloInteractiveHistoryActions.findOne({
                            user_id: user.id
                        });
                    if (!dataHistoryCheck) {
                        if (!data.sent_in_day) {
                            data.sent_in_day = false;
                        }
                        data.zalo_id = zalo_id;
                        data.user_id = user.id;
                        data.student = user;
                        logger.info('create data event' + JSON.stringify(data));
                        await ZaloInteractiveHistoryActions.create(data);
                    } else {
                        if (!data.sent_in_day) {
                            data.sent_in_day =
                                dataHistoryCheck.sent_in_day || false;
                        }
                        logger.info('update data event' + JSON.stringify(data));
                        await ZaloInteractiveHistoryActions.update(
                            { _id: dataHistoryCheck._id },
                            data
                        );
                    }
                }
            }
        }
        logger.info('webhook: end event zalo <<<<');
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async updateInteractionTimeFromNotification(
        req: ProtectedRequest,
        res: Response
    ) {
        try {
            logger.info('start updateInteractionTimeFromNotification >>');
            const user_id = parseInt(req.body.user_id as string);
            logger.info('user_id: ' + user_id);
            const dataUser = await UserActions.findOne({ id: user_id });
            let status = false;
            const dataHistoryCheck =
                await ZaloInteractiveHistoryActions.findOne({ user_id });
            if (dataUser && dataUser?.zalo_id && !dataHistoryCheck) {
                const dataCreate: any = {
                    user_id,
                    zalo_id: dataUser?.zalo_id,
                    last_event: EnumEventType.SEND_ZALO_FAIL,
                    interaction_time: moment().subtract(8, 'd').valueOf(),
                    student: dataUser
                };
                await ZaloInteractiveHistoryActions.create(dataCreate);
                logger.info('create history success');
                status = true;
            }

            logger.info('end updateInteractionTimeFromNotification <<');
            return new SuccessResponse('success', status).send(res, req);
        } catch (error) {
            logger.error(
                'updateInteractionTimeFromNotification error: ' + error
            );
        }
    }

    public static async checkSendMessageZaloInteraction(
        req: ProtectedRequest,
        res: Response
    ) {
        logger.info('Start checkSendMessageZaloInteraction >>');
        try {
            // cap nhat tat ca cac ban ghi ma co action button trong qua khu ve false de hom nay duoc action tiep
            await ZaloInteractiveHistoryModel.updateMany(
                {
                    sent_in_day: true
                },
                {
                    $set: {
                        sent_in_day: false
                    }
                },
                {
                    upsert: false
                }
            ).exec();
            const timeCheckStart = moment()
                .subtract(7, 'd')
                .startOf('day')
                .valueOf();
            const timeCheckEnd = moment()
                .subtract(5, 'd')
                .endOf('day')
                .valueOf();
            const filter: any = {
                interaction_time: {
                    $gt: timeCheckStart,
                    $lt: timeCheckEnd
                }
            };
            const historyData =
                await ZaloInteractiveHistoryActions.findAllAndGroup(filter);
            logger.info(
                'total history can send message zalo interaction: ' +
                    historyData?.length
            );
            if (historyData) {
                for await (const history of historyData) {
                    const item = history?.data;
                    if (item) {
                        logger.info(
                            'send message zalo interaction to user_id: ' +
                                item?.user_id
                        );
                        const dataPayload = {
                            student_name: item?.student.full_name,
                            student_username: item?.student.username
                        };
                        await natsClient.publishEventZalo(
                            item?.student,
                            ZaloOANotification.INTERACTIVE_REMINDER,
                            dataPayload,
                            ZALO_OA_MESSAGE_TYPE.TRANSACTION
                        );
                    }
                }
            }
            logger.info('End checkSendMessageZaloInteraction <<');
            return new SuccessResponse(req.t('common.success'), {
                ok: true
            }).send(res, req);
        } catch (err: any) {
            logger.error(
                `----------> error checkSendMessageZaloInteraction: ${err.message}`
            );
            return new SuccessResponse(req.t('common.success'), {
                ok: true
            }).send(res, req);
        }
    }
}
