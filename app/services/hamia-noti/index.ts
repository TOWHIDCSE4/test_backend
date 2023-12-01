import { BadRequestError } from '../../core/ApiError';
import { ResponseStatus } from '../../core/ApiResponse';
import config from 'config';
import axios from 'axios';
import https from 'https';

const HAMIA_NOTI_API_URL: any = config.get('services.hamia_noti.url');
const HAMIA_NOTI_API_KEY: any = config.get('services.hamia_noti.service_key');

const logger = require('dy-logger');

export default class HamiaNotiService {
    public static async pushFCMByTagNoti(
        tag: string,
        title: string,
        content: string,
        meta_data?: any
    ) {
        try {
            const data = JSON.stringify({
                tagName: tag,
                title: title,
                type: 'fcm',
                content: content,
                meta_data: meta_data
            });
            const agent = new https.Agent({
                rejectUnauthorized: false
            });
            const route = `${HAMIA_NOTI_API_URL}/api/service/notify/tag`;
            const res = await axios({
                httpsAgent: agent,
                method: 'post',
                url: route,
                headers: {
                    'service-key': HAMIA_NOTI_API_KEY,
                    'Content-Type': 'application/json'
                },
                data: data
            });
        } catch (err: any) {
            console.log('---------->error pushFCMByTagNoti', err.message);
        }
    }
}
