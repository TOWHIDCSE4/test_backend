import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherControllers from '../../../controllers/teacher.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    getTeachersValidator,
    validateStatusUser
} from '../../../validator';
const router = express.Router();

router.post(
    '/teacher/me',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.registerTeacherInfo)
);

router.post(
    '/teachers',
    auth.validateToken(),
    getTeachersValidator(),
    ValidationResult(),
    AsyncFunction(TeacherControllers.getTeachersByClient)
);

router.get(
    '/teachers/:id',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.getTeacherById)
);

router.post(
    '/teacher/request-review',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(TeacherControllers.teacherRequestReview)
);

router.get(
    '/teacher/students',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.getStudentsByTeacher)
);

router.get(
    '/teacher/courses',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.getCourseByTeacher)
);

router.get(
    '/teacher/referred-teachers',
    auth.validateToken(),
    AsyncFunction(TeacherControllers.getReferredTeachers)
);

export default router;
