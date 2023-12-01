import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherSalaryControllers from '../../../controllers/teacher-salary.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();
/**
 * Admin search for regular requests
 */
router.get(
    '/admin/teacher/salary',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tts_view]),
    AsyncFunction(TeacherSalaryControllers.getSalary)
);

router.post(
    '/admin/teacher/salary/caculate',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tts_caculate]),
    AsyncFunction(TeacherSalaryControllers.caculateCircle)
);
export default router;
