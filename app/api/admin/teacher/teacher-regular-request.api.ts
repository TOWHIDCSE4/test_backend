import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherRegularRequestControllers from '../../../controllers/teacher-regular-request.controller';
import ValidationResult, {
    changeTeacherRegularRequestValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

/**
 * Admin search for regular requests
 */
router.get(
    '/admin/teacher/regular-requests',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.trr_view]),
    AsyncFunction(TeacherRegularRequestControllers.getAllRegularRequestsByAdmin)
);

/**
 * Admin change the status of a pending request to either confirmed or canceled
 */
router.put(
    '/admin/teacher/regular-requests/:request_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tpr_approve, PERMISSIONS.tpr_reject]),
    changeTeacherRegularRequestValidator(),
    ValidationResult(),
    AsyncFunction(TeacherRegularRequestControllers.changeRequestStatusByAdmin)
);

/**
 * Admin delete a teacher regular request
 */
router.delete(
    '/admin/teacher/regular-requests/:request_id',
    auth.validateToken(),
    AsyncFunction(TeacherRegularRequestControllers.deleteRegularRequestByAdmin)
);

export default router;
