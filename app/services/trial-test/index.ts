import axios from 'axios';
import https from 'https';
import moment from 'moment';
import config from 'config';

import { BadRequestError } from '../../core/ApiError';
import { StatusCode } from '../../core/ApiResponse';

const TRIAL_TEST_API_URL: any = config.get('services.trial_test.url');

const logger = require('dy-logger');

export default class TrialTestServices {
    public static async createSessionTest(
        _id: any,
        testTopicId: any,
        urlCallback: any = null,
        resultType: any = null
    ) {
        logger.info(`createSessionTest >>>`);
        const headers = {
            'Content-Type': 'application/json'
        };

        const data = JSON.stringify({
            user_Oid: _id,
            test_topic_id: testTopicId,
            url_callback:
                urlCallback ||
                '/api/v1/core/student/lessons/update-test-result',
            result_type: resultType
        });

        const url = `${TRIAL_TEST_API_URL}/core/create-session-test`;

        logger.info(`URL: ${url}`);
        logger.info(`Data: ${data}`);

        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        const resSessionTest = await axios({
            httpsAgent: agent,
            method: 'post',
            url: url,
            headers: headers,
            data: data
        });

        if (resSessionTest.data.code != StatusCode.SUCCESS) {
            logger.error(
                `createSessionTest ERR, msg: ${resSessionTest.data.message}`
            );
            throw new BadRequestError(resSessionTest.data.message);
        }

        logger.info(`createSessionTest <<<`);
        return resSessionTest.data;
    }

    public static async updateSessionTest(
        user_Oid: any,
        testResultId: any,
        testTopicId: any
    ) {
        logger.info(`updateSessionTest >>>`);

        const headers = {
            'Content-Type': 'application/json'
        };

        const data = JSON.stringify({
            test_result_id: testResultId,
            user_Oid: user_Oid,
            update_data: {
                library_test_id: testTopicId,
                test_start_time: moment().format('YYYY-MM-DD HH:mm:ss')
            }
        });

        const url = `${TRIAL_TEST_API_URL}/core/update-session-test`;

        logger.info(`URL: ${url}`);
        logger.info(`Data: ${data}`);

        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        const resSessionTest = await axios({
            httpsAgent: agent,
            method: 'post',
            url: url,
            headers: headers,
            data: data
        });

        if (resSessionTest.data.code != StatusCode.SUCCESS) {
            logger.error(
                `updateSessionTest ERR, msg: ${resSessionTest.data.message}`
            );
            throw new BadRequestError(resSessionTest.data.message);
        }

        logger.info(`updateSessionTest <<<`);
        return resSessionTest.data;
    }

    public static async getInformationOfTopicsById(testTopicIds: any = []) {
        logger.info(`getInformationOfTopicsById >>>`);
        const headers = {
            'Content-Type': 'application/json'
        };

        const data = JSON.stringify({
            test_topic_ids: testTopicIds
        });

        const url = `${TRIAL_TEST_API_URL}/core/get-information-of-topics-by-id`;

        logger.info(`URL: ${url}`);
        logger.info(`Data: ${data}`);

        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        const res = await axios({
            httpsAgent: agent,
            method: 'post',
            url: url,
            headers: headers,
            data: data
        });

        if (res.data.code != StatusCode.SUCCESS) {
            logger.error(
                `getInformationOfTopicsById ERR, msg: ${res.data.message}`
            );
            throw new BadRequestError(res.data.message);
        }

        logger.info(`getInformationOfTopicsById <<<`);
        return res.data;
    }
}
