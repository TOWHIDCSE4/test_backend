import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CourseControllers from '../../../controllers/course.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/courses',
    auth.validateToken(),
    AsyncFunction(CourseControllers.getCoursesByUser)
);

router.get(
    '/subject/course/:course_id',
    auth.validateToken(),
    AsyncFunction(CourseControllers.getSubjectInfoByCourse)
);

export default router;
