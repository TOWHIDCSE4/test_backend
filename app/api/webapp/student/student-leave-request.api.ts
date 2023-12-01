import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import ValidationResult, { validateStatusUser } from '../../../validator';
import StudentLeaveRequestController from '../../../controllers/student-leave-request.controller';

const router = express.Router();

/**
 * Teachers get all their leave requests
 */
router.get(
    '/student/leave-requests',
    auth.validateToken(),
    AsyncFunction(StudentLeaveRequestController.getAllLeaveRequestsByStudent)
);

/**
 * Teachers create a new leave request
 */
router.post(
    '/student/leave-requests',
    auth.validateToken(),
    validateStatusUser(),
    ValidationResult(),
    AsyncFunction(StudentLeaveRequestController.createLeaveRequestByStudent)
);

export default router;
