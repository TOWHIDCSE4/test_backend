import { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import routes from '../api';
import { i18n } from '../locales';
import LogServices from '../services/logger';
import ReportChatWork from '../services/report-chatwork';

const logger = require('dy-logger');
const { ApiError, NotFoundError, InternalError } = require('../core/ApiError');

export default (app: Express) => {
    // if (process.env.NODE_ENV !== 'production') {
    //     app.use(morgan('dev'));
    // }
    app.use(helmet());
    app.use(helmet.hidePoweredBy());
    app.use(cors());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(i18n.init);

    // Routes
    app.use('/api/v1/core', routes);

    // catch 404 and forward to error handler
    app.use((req: Request, res: Response, next: NextFunction) =>
        next(new NotFoundError())
    );

    // Middleware Error Handler
    app.use(
        async (err: Error, req: Request, res: Response, next: NextFunction) => {
            logger.error(err);
            if (err instanceof ApiError) {
                ApiError.handle(err, req, res);
            } else {
                if (process.env.NODE_ENV === 'production') {
                    // ReportChatWork.reportError(req, err);
                    ApiError.handle(new InternalError(), req, res);
                } else {
                    return res.status(500).send(err.message);
                }
            }
        }
    );
};
