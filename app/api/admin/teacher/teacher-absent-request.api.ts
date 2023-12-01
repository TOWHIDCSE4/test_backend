import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherAbsentRequestControllers from '../../../controllers/teacher-absent-request.controller';
import ValidationResult, {
    changeTeacherAbsentRequestValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

/**
 * Admin search for absent requests
 */
router.get(
    '/admin/teacher/absent-requests',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tlr_view]),
    AsyncFunction(TeacherAbsentRequestControllers.getAllAbsentRequestsByAdmin)
);

/**
 * Admin change the status of a pending request to either confirmed or canceled
 */
router.put(
    '/admin/teacher/absent-requests/:request_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tlr_update]),
    changeTeacherAbsentRequestValidator(),
    ValidationResult(),
    AsyncFunction(TeacherAbsentRequestControllers.changeRequestStatusByAdmin)
);

/**
 * Admin delete a teacher absent request
 */
router.delete(
    '/admin/teacher/absent-requests/:request_id',
    auth.validateToken(),
    AsyncFunction(TeacherAbsentRequestControllers.deleteAbsentRequestByAdmin)
);

export default router;
