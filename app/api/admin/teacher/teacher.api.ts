import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import CalendarControllers from '../../../controllers/calendar.controller';
import TeacherControllers from '../../../controllers/teacher.controller';
import ValidationResult, { adminUserCreateValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();
router.get(
    '/admin/teachers',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.getAllTeacherAndPaginated)
);

router.get(
    '/admin/teacher/schedules',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmmm_view,
        PERMISSIONS.tat_view,
        PERMISSIONS.tts2_view
    ]),
    AsyncFunction(CalendarControllers.getSchedulesActiveByAdmin)
);

router.post(
    '/admin/users/teachers',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tat_create]),
    adminUserCreateValidator(),
    ValidationResult(),
    AsyncFunction(TeacherControllers.createTeacherUserByAdmin)
);

router.put(
    '/admin/teachers/:teacher_id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_update,
        PERMISSIONS.tpr_approve,
        PERMISSIONS.tpr_reject
    ]),
    AsyncFunction(TeacherControllers.editTeacherByAdmin)
);

/*
 * GET request from admin to get teachers with a regular time registered
 */
router.get(
    '/admin/teachers-with-regular-time',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asasm_update, PERMISSIONS.ascas_view]),
    AsyncFunction(TeacherControllers.getTeachersWithRegularCalendarByAdmin)
);

/*
 * POST request from admin to create a free calendar entry for teachers
 */
router.post(
    '/admin/teachers/:teacher_id/schedule',
    auth.validateToken(),
    AsyncFunction(CalendarControllers.createScheduleByAdmin)
);

/*
 * GET request from admin to get pending teachers
 */
router.get(
    '/admin/teachers/pending',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tpr_view]),
    AsyncFunction(TeacherControllers.getPendingTeachers)
);

router.get(
    '/admin/teachers/available-in-specific-time',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_update_time,
        PERMISSIONS.tmcsc_view
    ]),
    AsyncFunction(TeacherControllers.findAvailableTeachersInSpecificTime)
);

router.get(
    '/admin/reports/list-teachers',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.artr_view]),
    AsyncFunction(TeacherControllers.getListTeachersForReport)
);

router.get(
    '/admin/reports/schedule-slot',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arsr_view]),
    AsyncFunction(CalendarControllers.getScheduleSlotForReport)
);

router.get(
    '/admin/teachers/:teacher_id/trial-report',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.artr2_view]),
    AsyncFunction(BookingControllers.getTrialBookingsOfTeacher)
);

router.get(
    '/admin/teachers/:teacher_id/absence-report',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getAbsenceReportEachTeacher)
);

router.get(
    '/admin/teacher/referred-teachers',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ttr_view]),
    AsyncFunction(TeacherControllers.getReferredTeachersByAdmin)
);

export default router;
