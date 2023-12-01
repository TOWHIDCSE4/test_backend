import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentReservationRequestControllers from '../../../controllers/student-reservation-request.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    newStudentReservationRequestValidator,
    changeStudentReservationRequestValidator
} from '../../../validator';

const router = express.Router();

/**
 * Students get all their absent requests
 */
router.get(
    '/student/reservation-requests',
    auth.validateToken(),
    AsyncFunction(
        StudentReservationRequestControllers.getReservationRequestsByStudent
    )
);

/**
 * Student get a preview on reservation cost
 */
router.get(
    '/student/reservation-requests/cost-preview',
    auth.validateToken(),
    AsyncFunction(
        StudentReservationRequestControllers.getReservationCostPreview
    )
);

/**
 * Students create a new absent request
 */
router.post(
    '/student/reservation-requests',
    auth.validateToken(),
    newStudentReservationRequestValidator(),
    ValidationResult(),
    AsyncFunction(StudentReservationRequestControllers.createReservationRequest)
);

/**
 * Students edit their current absent requests
 */
router.put(
    '/student/reservation-requests/:request_id',
    auth.validateToken(),
    changeStudentReservationRequestValidator(),
    ValidationResult(),
    AsyncFunction(
        StudentReservationRequestControllers.editReservationRequestByStudent
    )
);

/**
 * Student delete their current absent requests
 */
router.delete(
    '/student/reservation-requests/:request_id',
    auth.validateToken(),
    AsyncFunction(
        StudentReservationRequestControllers.deleteReservationRequestByStudent
    )
);

export default router;
