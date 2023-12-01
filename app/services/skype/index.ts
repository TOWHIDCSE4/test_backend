import { BadRequestError } from '../../core/ApiError';
import { ResponseStatus } from '../../core/ApiResponse';
import config from 'config';
import axios from 'axios';
import ProxyActions from './../../actions/proxy-skype';
import Proxy, { EnumProxySkypeStatus } from './../../models/proxy';

const logger = require('dy-logger');

export default class SkypeApiServices {
    public static async createSkypeMeeting(title: string, displayName: string) {
        try {
            const data_proxy = await ProxyActions.findOneWithLastTimeUse({
                skype_call_status: EnumProxySkypeStatus.AVAILABLE
            });
            logger.info(`data proxy: ${JSON.stringify(data_proxy)}`);
            const url_agent = `http://${data_proxy?.username}:${data_proxy?.password}@${data_proxy?.host}:${data_proxy?.port}`;

            const httpsProxyAgent = require('https-proxy-agent');
            const agent = new httpsProxyAgent(url_agent);
            const route = `https://api.join.skype.com/v1/meetnow/guest`;
            const body_data = {
                title,
                source: 'ispeak_englishplus',
                displayName: 'Guest user'
            };
            try {
                const response = await axios({
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    url: route,
                    data: body_data,
                    httpsAgent: agent,
                    proxy: false
                });
                if (ResponseStatus.SUCCESS != response.status) {
                    logger.info(response.status);
                    throw new BadRequestError('Cannot create Skype meeting');
                }
                if (
                    !response.data.joinLink ||
                    !response.data.threadId ||
                    !response.data.skypetoken
                ) {
                    logger.info(
                        `Wrong response structure: ${JSON.stringify(
                            response.status
                        )}`
                    );
                    throw new BadRequestError('Cannot create Skype meeting');
                } else {
                    const hostProxy = data_proxy?.host || '';
                    await ProxyActions.update(hostProxy, {
                        last_time_use: new Date()
                    } as Proxy);
                }
                return response.data;
            } catch (err: any) {
                logger.info(
                    `axios call get link skype error: ${JSON.stringify(err)}`
                );
                const message = err.message;
                const hostProxy = data_proxy?.host || '';
                await ProxyActions.update(hostProxy, {
                    error_msg: message,
                    last_time_use: new Date(),
                    skype_call_status: EnumProxySkypeStatus.BLOCK
                } as Proxy);
                throw new BadRequestError(err.message);
            }
        } catch (err: any) {
            throw new BadRequestError(err.message);
        }
    }

    // public static async createSkypeMeeting(title: string, displayName: string) {
    //     try {
    //         const route = `https://skype.englishplus.vn`;
    //         const body_data = {
    //             title,
    //             displayName: 'Guest user'
    //         };
    //         try {
    //             const response = await axios({
    //                 method: 'post',
    //                 headers: {
    //                     'Content-Type': 'application/json; charset=utf-8'
    //                 },
    //                 url: route,
    //                 data: body_data,
    //                 proxy: false
    //             });
    //             if (ResponseStatus.SUCCESS != response.status) {
    //                 logger.info(response.status);
    //                 throw new BadRequestError('Cannot create Skype meeting');
    //             }
    //             if (
    //                 !response.data.joinLink ||
    //                 !response.data.threadId ||
    //                 !response.data.skypetoken
    //             ) {
    //                 logger.info(
    //                     `Wrong response structure: ${JSON.stringify(
    //                         response.status
    //                     )}`
    //                 );
    //                 throw new BadRequestError('Cannot create Skype meeting');
    //             }
    //             return response.data;
    //         } catch (err: any) {
    //             logger.info(
    //                 `axios call get link skype error: ${JSON.stringify(err)}`
    //             );
    //             throw new BadRequestError(err.message);
    //         }
    //     } catch (err: any) {
    //         throw new BadRequestError(err.message);
    //     }
    // }
}
