import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentControllers from '../../../controllers/student.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.post(
    '/student/me',
    auth.validateToken(),
    AsyncFunction(StudentControllers.registerStudentInfo)
);

export default router;
