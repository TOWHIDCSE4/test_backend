import { Express } from 'express';
import databaseLoader from './database';
import expressLoader from './express';
import initDbLoader from './init-db';
const logger = require('dy-logger');
const version = process.env.npm_package_version;

export default async (expressApp: Express) => {
    try {
        databaseLoader().then(() => {
            logger.info('✌️ DB loaded and connected!');
            initDbLoader();
        });
        await expressLoader(expressApp);
        logger.info(`✌️ Express loaded, app version: ${version}`);
    } catch (error) {
        console.log('loader error', error);
    }
};
