import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import RegularCalendarControllers from '../../../controllers/regular-calendar.controller';
import ValidationResult, {
    changeRegularCalendarValidator,
    createRegularCalendarValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

/**
 * Admin get a list of regular calendars
 */
router.get(
    '/admin/regular-calendars',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.asasm_view,
        PERMISSIONS.ascas_view,
        PERMISSIONS.tat_edit_regular,
        PERMISSIONS.srs_edit_regular
    ]),
    AsyncFunction(RegularCalendarControllers.getAllRegularCalendars)
);

/**
 * Admin get latest regular calendar of student or teacher
 */
router.get(
    '/admin/regular-calendars/latest',
    auth.validateToken(),
    AsyncFunction(RegularCalendarControllers.getLatestRegularCalendar)
);

/**
 * Admin get detail regular calendar
 */
router.get(
    '/admin/regular-calendars/:regular_calendar_id',
    auth.validateToken(),
    AsyncFunction(RegularCalendarControllers.getRegularCalendarById)
);

/**
 * Admin create a new regular calendar
 */
router.post(
    '/admin/regular-calendars',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ascas_create]),
    createRegularCalendarValidator(),
    ValidationResult(),
    AsyncFunction(RegularCalendarControllers.createRegularCalendar)
);

/**
 * Admin edit an existing regular calendar
 */
router.put(
    '/admin/regular-calendars/:regular_calendar_id',
    auth.validateToken(),
    changeRegularCalendarValidator(),
    ValidationResult(),
    AsyncFunction(RegularCalendarControllers.editRegularCalendar)
);

/**
 * Admin delete a regular calendar
 */
router.delete(
    '/admin/regular-calendars/:regular_calendar_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asasm_delete]),
    AsyncFunction(RegularCalendarControllers.deleteRegularCalendar)
);

export default router;
