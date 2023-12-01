import express from 'express';
// Auth - Validator
import auth from '../../../auth/validate-request';
import ValidationResult, { changePasswordValidator } from '../../../validator';

// Controller
import UserControllers from '../../../controllers/user.controller';
import TeacherControllers from '../../../controllers/teacher.controller';
import StudentControllers from '../../../controllers/student.controller';

//Other
import AsyncFunction from '../../../core/async-handler';

const router = express.Router();

router.get(
    '/user/me',
    auth.validateToken(),
    AsyncFunction(UserControllers.getFullInfoUserByThemshelves)
);

router.put(
    '/user/update',
    auth.validateToken(),
    AsyncFunction(UserControllers.editUserByThemShelves)
);

router.get(
    '/user/regular_times',
    auth.validateToken(),
    AsyncFunction(UserControllers.getUserRegularTimesByThemshelves)
);

router.get(
    '/student/me',
    auth.validateToken(),
    AsyncFunction(StudentControllers.getStudentFullInfo)
);

// router.put('/student',     auth.validateToken(), Role(RoleCode.STUDENT), authorization, AsyncFunction(StudentControllers.editStudentByThemShelves));

router.get(
    '/teacher/me',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.getTeacherFullInfo)
);

router.put(
    '/teacher',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.editTeacherByThemShelves)
);

router.put(
    '/user/change-password',
    auth.validateToken(),
    ValidationResult(),
    AsyncFunction(UserControllers.changePassword)
);

router.put(
    '/user/update-bank-account',
    auth.validateToken(),
    AsyncFunction(UserControllers.updateUserBankAccount)
);

router.get(
    '/user/is-valuable-user',
    auth.validateToken(),
    AsyncFunction(UserControllers.isValuableUser)
);

router.get(
    '/user/get-data-cache-for-register',
    AsyncFunction(UserControllers.getDataCacheForRegister)
);

router.put(
    '/user/get-user-by-id',
    AsyncFunction(UserControllers.getUserById)
);

router.put(
    '/user/verify-otp-phone',
    AsyncFunction(UserControllers.verifyOtpPhone)
);

router.put(
    '/user/resend-otp-code',
    AsyncFunction(UserControllers.resendOtpCode)
);

export default router;
