import 'dotenv/config';
import express from 'express';
import loaders from './loaders';
import config from 'config';
const logger = require('dy-logger');
const PORT = process.env.PORT || config.get('server.port');
const APP_NAME = config.get('server.app');

export default async () => {
    const app = express();
    await loaders(app);
    app.listen(PORT, () => {
        logger.info(`#####🛡️ ${APP_NAME} listening on port: ${PORT} 🛡️#####`);
    }).on('error', (e) => logger.error(e));
};
