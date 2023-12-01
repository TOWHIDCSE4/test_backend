import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import EventNoticeControllers from '../../../controllers/event-notice.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.get(
    '/event-notices',
    auth.validateToken(),
    AsyncFunction(EventNoticeControllers.getEventNoticesByUsers)
);

export default router;
