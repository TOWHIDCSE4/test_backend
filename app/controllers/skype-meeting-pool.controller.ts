import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import SkypeMeetingPoolActions from '../actions/skype-meeting-pool';
import SkypeMeetingPool from '../models/skype-meeting-pool';
import SkypeApiServices from '../services/skype';
import ReportChatWork from '../services/report-chatwork';

const logger = require('dy-logger');

export default class SkypeMeetingPoolController {
    public static async addSkypeMeetingPool(
        req: ProtectedRequest,
        res: Response
    ) {
        try {
            logger.info(`addSkypeMeetingPool >>>`);
            const randomCode = await SkypeMeetingPoolController.randomCode();
            logger.info(`addSkypeMeetingPool, randomCode: ${randomCode}`);
            const learning_medium_info =
                await SkypeApiServices.createSkypeMeeting(
                    `Meeting for E+ [${randomCode}]`,
                    `English Plus Admin`
                );

            const skypeMeetingPoolInfo = {
                info: learning_medium_info
            };
            logger.info(
                `addSkypeMeetingPool, skypeMeetingPoolInfo: ${JSON.stringify(
                    skypeMeetingPoolInfo
                )}`
            );
            await SkypeMeetingPoolActions.create({
                ...skypeMeetingPoolInfo
            } as SkypeMeetingPool);
        } catch (error) {
            logger.error('addSkypeMeetingPool, Error: ', error);
            // await ReportChatWork.reportError(req, error);
            throw error;
        }
        logger.info(`addSkypeMeetingPool <<<`);
        return new SuccessResponse('success', {}).send(res, req);
    }

    public static async randomCode(length = 16) {
        let result = '';
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
            counter += 1;
        }
        return result;
    }
}
