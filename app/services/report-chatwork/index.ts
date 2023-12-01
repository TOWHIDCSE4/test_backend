const logger = require('dy-logger');
import axios from 'axios';
import config from 'config';

const ROOM_ID: any = null;
const URL: any = null;

export default class ReportChatWork {
    public static async reportError(req: Request | any, err: any) {
        try {
            if (!ROOM_ID) {
                return;
            }
            const headers = {
                'Content-Type': 'application/json'
            };
            const msg = `[Backend]\nServer URL: ${config.get(
                'server.url'
            )}\nRequest URL: ${req?.url}\n${err?.stack}\nType: ${err?.type}`;
            axios({
                method: 'post',
                url: URL,
                headers: headers,
                data: {
                    roomId: ROOM_ID,
                    message: msg
                }
            });
        } catch (error) {
            logger.error('ReportChatWork, Error: ', error);
        }
    }
}
