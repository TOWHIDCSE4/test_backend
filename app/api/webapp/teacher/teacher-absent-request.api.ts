import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherAbsentRequestControllers from '../../../controllers/teacher-absent-request.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    newTeacherAbsentRequestValidator,
    changeTeacherAbsentRequestValidator,
    validateStatusUser
} from '../../../validator';

const router = express.Router();

/**
 * Teachers get all their absent requests
 */
router.get(
    '/teacher/absent-requests',
    auth.validateToken(),
    AsyncFunction(TeacherAbsentRequestControllers.getAbsentRequestsByTeacher)
);

/**
 * Teachers create a new absent request
 */
router.post(
    '/teacher/absent-requests',
    auth.validateToken(),
    validateStatusUser(),
    newTeacherAbsentRequestValidator(),
    ValidationResult(),
    AsyncFunction(TeacherAbsentRequestControllers.createAbsentRequestByTeacher)
);

/**
 * Teachers edit their current absent requests
 */
router.put(
    '/teacher/absent-requests/:request_id',
    auth.validateToken(),
    validateStatusUser(),
    changeTeacherAbsentRequestValidator(),
    ValidationResult(),
    AsyncFunction(TeacherAbsentRequestControllers.editAbsentRequestByTeacher)
);

/**
 * Teacher delete their current absent requests
 */
router.delete(
    '/teacher/absent-requests/:request_id',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(TeacherAbsentRequestControllers.deleteAbsentRequestByTeacher)
);

export default router;
