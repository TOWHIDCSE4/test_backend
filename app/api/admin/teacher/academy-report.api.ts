import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/academy-reports/status-classes',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arcr_view]),
    AsyncFunction(BookingControllers.academyReportAboutStatusClasses)
);

export default router;
