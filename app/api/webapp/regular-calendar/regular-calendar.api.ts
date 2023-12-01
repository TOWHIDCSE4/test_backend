import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import RegularCalendarControllers from '../../../controllers/regular-calendar.controller';
import auth from '../../../auth/validate-request';
import { validateStatusUser } from '../../../validator';

const router = express.Router();

/**
 * Users get a list of regular calendars
 */
router.get(
    '/user/regular-calendars',
    auth.validateToken(),
    AsyncFunction(RegularCalendarControllers.getAllRegularCalendarsByUser)
);

/**
 * Teacher request to cancel an active regular calendar
 */
router.put(
    '/teacher/regular-calendars/:regular_calendar_id/cancel',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(RegularCalendarControllers.requestCancelRegularCalendar)
);

export default router;
