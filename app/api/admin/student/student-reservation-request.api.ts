import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentReservationRequestControllers from '../../../controllers/student-reservation-request.controller';
import ValidationResult, {
    changeStudentReservationRequestValidator,
    newStudentReservationRequestValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

/**
 * Admin search for absent requests
 */
router.get(
    '/admin/student/reservation-requests',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmrr_view]),
    AsyncFunction(
        StudentReservationRequestControllers.getAllStudentReservationRequestsByAdmin
    )
);

/**
 * Admin change the status of a pending request to either confirmed or canceled
 */
router.put(
    '/admin/student/reservation-requests/:request_id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmrr_approve,
        PERMISSIONS.tmrr_reject,
        PERMISSIONS.tmrr_mark_paid
    ]),
    changeStudentReservationRequestValidator(),
    ValidationResult(),
    AsyncFunction(
        StudentReservationRequestControllers.editReservationRequestByAdmin
    )
);

/**
 * Admin delete a student absent request
 */
router.delete(
    '/admin/student/reservation-requests/:request_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmrr_delete]),
    AsyncFunction(
        StudentReservationRequestControllers.deleteReservationRequestByAdmin
    )
);

router.get(
    '/admin/reservation-requests/cost-preview',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmrr_create]),
    AsyncFunction(
        StudentReservationRequestControllers.getReservationCostPreview
    )
);

router.post(
    '/admin/reservation-requests',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmrr_create]),
    newStudentReservationRequestValidator(),
    AsyncFunction(StudentReservationRequestControllers.createReservationRequest)
);

export default router;
