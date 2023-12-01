import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherSalaryControllers from '../../../controllers/teacher-salary.controller';
import BookingControllers from '../../../controllers/booking.controller';
import auth from '../../../auth/validate-request';

const router = express.Router();
router.get(
    '/teacher/salary',
    auth.validateToken(),
    AsyncFunction(TeacherSalaryControllers.getSalaryByTeacher)
);
export default router;
