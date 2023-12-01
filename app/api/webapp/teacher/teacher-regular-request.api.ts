import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherRegularRequestControllers from '../../../controllers/teacher-regular-request.controller';
import auth from '../../../auth/validate-request';
import { validateStatusUser } from '../../../validator';

const router = express.Router();

/**
 * Teachers get their current pending regular requests
 */
router.get(
    '/teacher/regular-request',
    auth.validateToken(),
    AsyncFunction(
        TeacherRegularRequestControllers.getCurrentRegularRequestByTeacher
    )
);

/**
 * Teachers get all their regular requests
 */
router.get(
    '/teacher/regular-requests',
    auth.validateToken(),
    AsyncFunction(
        TeacherRegularRequestControllers.getAllRegularRequestsByTeacher
    )
);

/**
 * Teachers create a new regular request
 */
router.post(
    '/teacher/regular-requests',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(TeacherRegularRequestControllers.createRegularRequest)
);

/**
 * Teacher delete their current regular requets
 */
router.delete(
    '/teacher/regular-request',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(
        TeacherRegularRequestControllers.deleteRegularRequestByTeacher
    )
);

export default router;
