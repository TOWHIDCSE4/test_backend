import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import TrialTestControllers from '../../../controllers/trial-test.controller';
import CommentSuggestionControllers from '../../../controllers/comment-suggestion.controller';
import ValidationResult, { editBookingValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
const router = express.Router();

router.get(
    '/admin/bookings',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_view,
        PERMISSIONS.tmcsc_view,
        PERMISSIONS.tmcv_view,
        PERMISSIONS.ascas_view,
        PERMISSIONS.smtb_view,
        PERMISSIONS.smtb_export_excel,
        PERMISSIONS.amtb_view,
        PERMISSIONS.amtb_export_excel
    ]),
    AsyncFunction(BookingControllers.getAllBookingsByAdmin)
);

router.get(
    '/admin/bookings/trial/test-results',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_view,
        PERMISSIONS.tmcsc_view,
        PERMISSIONS.tmcv_view,
        PERMISSIONS.ascas_view,
        PERMISSIONS.smtb_view,
        PERMISSIONS.smtb_export_excel,
        PERMISSIONS.amtb_view,
        PERMISSIONS.amtb_export_excel
    ]),
    AsyncFunction(TrialTestControllers.getAllTrialBookingsWithTestResults)
);

router.get(
    '/admin/bookings/statistic',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_view,
        PERMISSIONS.smtb_view,
        PERMISSIONS.amtb_view
    ]),
    AsyncFunction(BookingControllers.getStatisticBookingsByAdmin)
);

router.put(
    '/admin/bookings/:booking_id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_update_status,
        PERMISSIONS.tmo_update_unit,
        PERMISSIONS.tmo_update_note,
        PERMISSIONS.tmmm_best_memo
    ]),
    editBookingValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.editBookingByAdmin)
);

router.put(
    '/admin/bookings/:booking_id/change-time',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmo_update_time]),
    editBookingValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.editBookingTimeByAdmin)
);

router.get(
    '/admin/complete-bookings',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmmm_view]),
    AsyncFunction(BookingControllers.getAllCompleteBookingsByAdmin)
);

router.get(
    '/admin/all-booking-by-ids',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getAllBookingsByIds)
);

router.get(
    '/admin/bookings/memo-suggestions',
    auth.validateToken(),
    AsyncFunction(CommentSuggestionControllers.getNormalMemoSuggestionsByAdmin)
);

router.put(
    '/admin/bookings/:booking_id/memo',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmmm_update]),
    AsyncFunction(BookingControllers.createMemoByTeacher)
);

router.put(
    '/admin/bookings/:booking_id/class',
    auth.validateToken(),
    AsyncFunction(BookingControllers.openClassMeetingByAdmin)
);

router.get(
    '/admin/bookings/:id',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getDetailLesson)
);

router.get(
    '/admin/bookings/teacher-absence/monthly-report',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arlr_view]),
    AsyncFunction(BookingControllers.getMonthlyTeacherAbsenceReport)
);

router.get(
    '/admin/bookings/add-link-hmp-for-booking/:booking_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmo_add_link_hmp]),
    AsyncFunction(BookingControllers.addLinkHMPForBooking)
);

export default router;
