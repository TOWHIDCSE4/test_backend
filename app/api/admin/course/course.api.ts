import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CourseControllers from '../../../controllers/course.controller';
import ValidationResult, {
    createCourseValidator,
    editCourseValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/courses',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmmm_view,
        PERMISSIONS.tmeh_view,
        PERMISSIONS.sca_view,
        PERMISSIONS.pmc2_view,
        PERMISSIONS.pmu_view
    ]),
    AsyncFunction(CourseControllers.getCoursesByAdmin)
);

router.post(
    '/admin/courses',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc2_create]),
    createCourseValidator(),
    ValidationResult(),
    AsyncFunction(CourseControllers.createCourse)
);

router.put(
    '/admin/courses/assign-course-to-package',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc2_update]),
    AsyncFunction(CourseControllers.assignCoursesForMultiPackages)
);

router.put(
    '/admin/courses/:course_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc2_update]),
    editCourseValidator(),
    ValidationResult(),
    AsyncFunction(CourseControllers.editCourse)
);

router.delete(
    '/admin/courses/:course_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc2_delete]),
    AsyncFunction(CourseControllers.removeCourse)
);

export default router;
