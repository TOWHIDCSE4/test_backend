import express from 'express';
import AsyncFunction from '../../core/async-handler';
import BookingControllers from '../../controllers/booking.controller';
import auth from '../../auth/validate-request';
import MeetController from '../../controllers/meet.controller';
import { services } from '../../const/services';

const router = express.Router();

router.post(
    '/meet/cb-video',
    AsyncFunction(BookingControllers.recordUploadByTeacher)
);

router.post(
    `/meet/cb-end-class`,
    AsyncFunction(BookingControllers.finishLessonBySystem)
);

router.post(
    `/meet/webhook`,
    auth.validateService(services.hamia_meet),
    AsyncFunction(MeetController.webhook)
);

export default router;
