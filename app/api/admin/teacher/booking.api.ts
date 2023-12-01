import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import auth from '../../../auth/validate-request';

const router = express.Router();

router.get(
    '/admin/teachers/:teacher_id/bookings',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getBookingsByTeacherForAdmin)
);

router.get(
    '/admin/teachers/:teacher_id/bookings/report',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getTeacherBookingReportByAdmin)
);

export default router;
