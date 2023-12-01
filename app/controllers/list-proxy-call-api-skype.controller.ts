import { ProtectedRequest } from 'app-request';
import SkypeApiServices from './../services/skype';
import axios from 'axios';
import { Response } from 'express';
const logger = require('dy-logger');
import ProxyActions from '../actions/proxy-skype';
import Proxy, { ProxyModel } from '../models/proxy';
import { SuccessResponse } from './../core/ApiResponse';
import { EnumProxySkypeStatus } from './../models/proxy';

export default class ListProxyCallSkypeController {
    /*
     * Summary: config list proxy call api
     * Request type: GET
     */
    public static async configProxyCronJob(
        req: ProtectedRequest,
        res: Response
    ) {
        try {
            const urlProxy = '';
            if(urlProxy){
                axios({
                    method: 'get',
                    url: urlProxy,
                    headers: {}
                }).then(async function (response) {
                    let arrayData = new Array<any>();
                    let arrayTemp = new Array<any>();
                    let arrayProxy = new Array<any>();
                    let arrayHost = new Array<any>();
                    const data = response.data;
                    arrayData = data.split(/\r?\n/);
                    if (arrayData && arrayData.length > 0) {
                        arrayData.forEach((entry) => {
                            arrayTemp = [];
                            arrayTemp = entry.split(':');
                            if (arrayTemp && arrayTemp.length > 0 && arrayTemp[2]) {
                                arrayProxy.push({
                                    host: arrayTemp[0],
                                    port: arrayTemp[1],
                                    username: arrayTemp[2],
                                    password: arrayTemp[3],
                                    skype_call_status:
                                        EnumProxySkypeStatus.AVAILABLE
                                });
                                arrayHost.push(arrayTemp[0]);
                            }
                        });
                        if (arrayHost && arrayHost.length > 0) {
                            await ProxyActions.removeManyAvailableStatusAndNotIn(
                                arrayHost
                            );
                            arrayHost.forEach(async (entry, index) => {
                                const dataProxy = await ProxyActions.findOne({
                                    host: entry
                                });
                                if (dataProxy) {
                                    delete arrayProxy[index].skype_call_status;
                                    await ProxyActions.update(
                                        entry,
                                        arrayProxy[index] as Proxy
                                    );
                                } else {
                                    await ProxyActions.create(arrayProxy[index]);
                                }
                            });
                        }
                    }
                });
            }
            return new SuccessResponse('success', 'call success').send(
                res,
                req
            );
        } catch (error) {
            logger.error('GetListProxy, Error: ', error);
            return new SuccessResponse('success', 'call error').send(res, req);
        }
    }

    // public static async recoverAllProxy(req: ProtectedRequest, res: Response) {
    //     try {
    //         const arrayProxy = await ProxyActions.findAll({
    //             skype_call_status: EnumProxySkypeStatus.AVAILABLE
    //         });
    //         logger.info(arrayProxy.length);
    //         let responseCall = '';
    //         let index = 0;
    //         for await (const iterator of arrayProxy) {
    //             logger.info(`------------------------------${index}`);
    //             responseCall = await SkypeApiServices.createSkypeMeeting(
    //                 `Lesson`,
    //                 `English Plus Admin`
    //             );
    //             index++;

    //             logger.info(JSON.stringify(responseCall));
    //         }
    //         // arrayProxy.forEach(async function (value, index) {

    //         // });

    //         return new SuccessResponse('success', 'recoverAllProxy error').send(
    //             res,
    //             req
    //         );
    //     } catch (error) {
    //         logger.error('recoverAllProxy, Error: ', error);
    //         throw error;
    //     }
    // }
}
