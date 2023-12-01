import {
    NotificationBroadcastSubject,
    NotificationTemplateSubject,
    NotificationZalo,
    NotificationZNS
} from '../../const/notification';
import config from 'config';
import { connect, JSONCodec, NatsConnection } from 'nats';
import TemplateActions from '../../actions/template';
import UserActions from '../../actions/user';
import { ZALO_CALLBACK_DATA_OF_BUTTON_INTERACTIVE } from '../../const/notification';

const logger = require('dy-logger');
const HOST = process.env.NATS_HOST || config.get('services.nats.host');
const PORT = process.env.NATS_PORT || config.get('services.nats.port');
const USERNAME =
    process.env.NATS_USERNAME || config.get('services.nats.username');
const PASSWORD =
    process.env.NATS_PASSWORD || config.get('services.nats.password');

let nc: NatsConnection;
connect({
    servers: `${HOST}:${PORT}`,
    user: USERNAME,
    pass: PASSWORD
}).then((conn) => {
    nc = conn;
});
const jc = JSONCodec<TemplateEventData>();

export const publishEvent = async (key: string, pay_load: any) => {
    try {
        nc.publish(key, jc.encode(pay_load));
    } catch (err) {
        logger.error('Error publish Event nats', err);
    }
};

interface TemplateEventData {
    user_id?: any;
    template: string;
    data: any;
    receiver?: string | number;
    template_obj_id?: string;
    operation_issue_id?: string;
    type_message?: string;
    callback_data?: string;
}
export const publishEventWithTemplate = async (data: TemplateEventData) => {
    try {
        nc.publish(NotificationTemplateSubject, jc.encode(data));
    } catch (err) {
        logger.error('Error publish Event nats', err);
    }
};

export const publishEventZalo = async (
    user: any,
    code_template: string,
    data: any,
    type_message?: string
) => {
    try {
        let userInfo = user;
        let zalo_id = '';
        if (typeof user === 'object') {
            zalo_id = user?.zalo_id;
        }

        if (!zalo_id) {
            userInfo = await UserActions.findOne({
                id: typeof user === 'object' ? user.id : user
            });
            if (userInfo) {
                zalo_id = userInfo.zalo_id;
            }
        }

        const template = await TemplateActions.findOne({
            code: code_template
        });
        if (!template) {
            throw `template ${code_template} does not exits`;
        }
        if (!zalo_id) {
            throw `zalo_id of user ${userInfo?.id} does not exits`;
        }
        logger.info('zalo_id', zalo_id);
        const templateData: TemplateEventData = {
            user_id: userInfo?.id,
            template: template.content,
            data,
            receiver: zalo_id
        };
        if (type_message == 'transaction') {
            logger.info('send type transaction');
            templateData.type_message = type_message;
            templateData.callback_data =
                ZALO_CALLBACK_DATA_OF_BUTTON_INTERACTIVE;
        }
        nc.publish(NotificationZalo, jc.encode(templateData));
    } catch (err) {
        logger.error('Error publishEventZalo', err);
    }
};

export const publishEventZNS = async (
    user: any,
    code_template: string,
    data: any,
    phoneNumber?: any
) => {
    try {
        logger.info('Start publishEventZNS');
        let phone_number: any = '';
        let userInfo = null;
        if (phoneNumber) {
            phone_number = phoneNumber;
        } else {
            userInfo = user;
            if (typeof user === 'object') {
                phone_number = user?.phone_number;
            }

            if (!phone_number) {
                userInfo = await UserActions.findOne({
                    id: typeof user === 'object' ? user.id : user
                });
                if (userInfo) {
                    phone_number = userInfo.phone_number;
                }
            }
            if (!phone_number) {
                throw `phone_number of user ${userInfo?.id} does not exits`;
            }
        }
        logger.info('ZNS phone number', phone_number);

        const templateData: TemplateEventData = {
            user_id: phoneNumber ? user : userInfo?.id,
            template: code_template,
            data,
            receiver: phone_number
        };
        nc.publish(NotificationZNS, jc.encode(templateData));
        logger.info('end publishEventZNS');
    } catch (err) {
        logger.error('Error publishEventZNS', err);
    }
};

export const broadcastEventWithTemplate = async (data: TemplateEventData) => {
    try {
        data.receiver = '*';
        nc.publish(NotificationBroadcastSubject, jc.encode(data));
    } catch (err) {
        logger.error('Error publish broadcast event nats', err);
    }
};
