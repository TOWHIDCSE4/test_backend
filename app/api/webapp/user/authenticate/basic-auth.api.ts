import express from 'express';
import AsyncFunction from '../../../../core/async-handler';
import UserControllers from '../../../../controllers/user.controller';
import StudentControllers from '../../../../controllers/student.controller';
import TeacherControllers from '../../../../controllers/teacher.controller';
import ValidationResult, {
    loginValidator,
    registerValidator,
    resetPasswordValidator,
    sendMailValidator
} from '../../../../validator';

const router = express.Router();

router.post(
    '/user/login',
    loginValidator(),
    ValidationResult(),
    AsyncFunction(UserControllers.login)
);

router.post(
    '/user/student/register',
    registerValidator(),
    ValidationResult(),
    AsyncFunction(StudentControllers.registerStudentUser)
);

router.post(
    '/user/teacher/register',
    registerValidator(),
    ValidationResult(),
    AsyncFunction(TeacherControllers.registerTeacherUser)
);

router.post(
    '/user/send-reset-url',
    sendMailValidator(),
    ValidationResult(),
    AsyncFunction(UserControllers.sendResetPasswordUrl)
);

router.post(
    '/user/reset-password',
    resetPasswordValidator(),
    ValidationResult(),
    AsyncFunction(UserControllers.resetPassword)
);

export default router;
