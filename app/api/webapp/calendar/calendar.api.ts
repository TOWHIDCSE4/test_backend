import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CalendarControllers from '../../../controllers/calendar.controller';
import auth from '../../../auth/validate-request';
import { validateStatusUser } from '../../../validator';
const router = express.Router();

// Student
router.get(
    '/teacher/:teacher_id/schedule',
    auth.validateToken(),
    AsyncFunction(CalendarControllers.getSchedulesActiveOfTeacherByStudent)
);

router.get(
    '/teacher/:teacher_id/simple-schedule',
    auth.validateToken(),
    AsyncFunction(CalendarControllers.getSimpleScheduleByTeacherId)
);

// Teacher
router.get(
    '/teacher/schedules',
    auth.validateToken(),
    AsyncFunction(CalendarControllers.getSchedulesActiveByTeacher)
);

router.post(
    '/teacher/schedule',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(CalendarControllers.createScheduleByTeacher)
);

router.put(
    '/teacher/schedule/:calendar_id',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(CalendarControllers.editSchedule)
);

export default router;
