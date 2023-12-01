import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import TrialBookingControllers from '../../../controllers/trial-booking.controller';
import ValidationResult, {
    editTrialBookingValidator,
    newTrialBookingValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/trial-bookings',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmmm_view]),
    AsyncFunction(TrialBookingControllers.getTrialBookings)
);

router.post(
    '/admin/bookings/trial',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmctc_create]),
    newTrialBookingValidator(),
    ValidationResult(),
    AsyncFunction(TrialBookingControllers.createTrialBooking)
);

router.put(
    '/admin/bookings/trial/:booking_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmmm_update]),
    editTrialBookingValidator(),
    ValidationResult(),
    AsyncFunction(TrialBookingControllers.editTrialBookingByAdmin)
);

router.get(
    '/admin/trial-bookings/teacher-report',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.artr2_view]),
    AsyncFunction(BookingControllers.getTeachersTrialReport)
);

export default router;
