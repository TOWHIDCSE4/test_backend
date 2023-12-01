import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import BookingControllers from '../../../controllers/booking.controller';
import CommentSuggestionControllers from '../../../controllers/comment-suggestion.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    createBookingStudentValidator,
    editBookingValidator,
    createBookingForUnmatchedRegularValidator,
    validateStatusUser
} from '../../../validator';
import { services } from '../../../const/services';

const router = express.Router();

router.get(
    '/lessons/:id',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getDetailLesson)
);

router.get(
    '/student/bookings',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getBookingsByStudent)
);

router.get(
    '/student/bookings/recent-learnt',
    auth.validateToken(),
    AsyncFunction(
        BookingControllers.getRecentLearntLessonsByStudentForThemshelves
    )
);

router.get(
    '/student/bookings/all-booking-by-ids',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getAllBookingsByIds)
);

/* To put or not to put it here? */
router.get(
    '/student/courses/recent-learnt',
    auth.validateToken(),
    AsyncFunction(
        BookingControllers.getLatestLearntCourseAndPackageOfStudentByThemshelves
    )
);

router.get(
    '/student/courses/:course_id/units/learnt',
    auth.validateToken(),
    AsyncFunction(
        BookingControllers.getLearntUnitsInCourseByStudentForThemshelves
    )
);

router.post(
    '/student/booking',
    auth.validateToken(),
    createBookingStudentValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.createBookingByStudent)
);

router.get(
    '/student/bookings/:booking_id/class',
    auth.validateToken(),
    AsyncFunction(BookingControllers.joinClassByStudent)
);

router.post(
    '/student/booking/unmatched-regular',
    auth.validateToken(),
    createBookingForUnmatchedRegularValidator(),
    ValidationResult(),
    AsyncFunction(
        BookingControllers.createBookingForTeacherUnmatchedRegularByStudent
    )
);

router.put(
    '/student/lessons/:lesson_id/absent-or-cancel',
    auth.validateToken(),
    AsyncFunction(BookingControllers.absentOrCancelLessonByStudent)
);

router.put(
    '/student/lessons/:lesson_id/rating',
    auth.validateToken(),
    editBookingValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.rateLessonByStudent)
);

router.put(
    '/student/lessons/:lesson_id/homework',
    auth.validateToken(),
    AsyncFunction(BookingControllers.editHomeworkBooking)
);

router.get(
    '/student/count-booking-teaching',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getCountBookingTeaching)
);

router.get(
    '/teacher/bookings',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getBookingsByTeacherForThemshelves)
);

router.get(
    '/teacher/count-booking-teaching',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getCountBookingTeaching)
);

router.post(
    '/teacher/bookings/student-absent',
    auth.validateToken(),
    AsyncFunction(BookingControllers.studentAbsentByTeacher)
);

router.post(
    '/teacher/bookings/absent',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.absentLessonByTeacher)
);

router.post(
    '/teacher/bookings/will-teach',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.willTeach)
);

router.post(
    '/teacher/bookings/finish-teaching',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.finishTeaching)
);

router.put(
    '/teacher/bookings/:booking_id/note',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.setBookingNoteByTeacher)
);

router.post(
    '/teacher/bookings/:booking_id/class',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.startLessonByTeacherForThemshelves)
);

router.put(
    '/teacher/bookings/:booking_id/memo',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.createMemoByTeacher)
);

router.get(
    '/teacher/bookings/report',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getTeacherBookingReportByThemshelves)
);

router.get(
    '/teacher/bookings/memo-suggestions',
    auth.validateToken(),
    AsyncFunction(
        CommentSuggestionControllers.getNormalMemoSuggestionsByTeacher
    )
);

router.post(
    '/teacher/bookings/record-upload',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.recordUploadByTeacher)
);

router.post(
    '/student/lessons/start-test',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(BookingControllers.startTest)
);

router.put(
    '/student/lessons/update-test-result',
    auth.validateService(services.trialTest),
    AsyncFunction(BookingControllers.editTestResultBooking)
);

router.post(
    '/student/bookings/booking-of-daily-package',
    auth.validateToken(),
    AsyncFunction(BookingControllers.getBookingOfDailyPackage)
);

export default router;
