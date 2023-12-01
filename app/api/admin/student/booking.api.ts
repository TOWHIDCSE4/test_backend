import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import RegularCalendarControllers from '../../../controllers/regular-calendar.controller';
import ValidationResult, {
    createBookingAdminValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.post(
    '/admin/students/:student_id/bookings',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmcsc_create]),
    createBookingAdminValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.createBookingByAdmin)
);

router.post(
    '/admin/students/bookings/update-status-regular-calendar',
    auth.validateToken(),
    AsyncFunction(RegularCalendarControllers.updateStatusRegularCalendar)
);

router.get(
    '/admin/students/:student_id/bookings/recent-learnt',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getRecentLearntLessonsByStudentForAdmin)
);

router.get(
    '/admin/students/:student_id/courses/recent-learnt',
    auth.validateToken(),
    AsyncFunction(
        BookingControllers.getLatestLearntCourseAndPackageOfStudentForAdmin
    )
);

router.get(
    '/admin/students/:student_id/courses/:course_id/units/learnt',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getLearntUnitsInCourseByStudentForAdmin)
);

export default router;
