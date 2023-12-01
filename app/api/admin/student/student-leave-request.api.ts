import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentLeaveRequestControllers from '../../../controllers/student-leave-request.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

/**
 * Admin search for leave requests
 */
router.get(
    '/admin/student/leave-requests',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.slr_view]),
    AsyncFunction(StudentLeaveRequestControllers.getAllLeaveRequestsByAdmin)
);

/**
 * Admin create a student leave request
 */
router.post(
    '/admin/student/leave-requests/create',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.slr_create]),
    AsyncFunction(StudentLeaveRequestControllers.createLeaveRequestByAdmin)
);

/**
 * Admin delete a student leave request
 */
router.delete(
    '/admin/student/leave-requests/:request_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.slr_delete]),
    AsyncFunction(StudentLeaveRequestControllers.deleteLeaveRequestByAdmin)
);

export default router;
