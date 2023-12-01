import express from 'express';
import AsyncFunction from '../../core/async-handler';
import auth from '../../auth/validate-request';
import ValidationResult, {
    createBookingAdminValidator,
    editBookingValidator,
    createScheduledMemoValidator
} from '../../validator';
import RegularCalendarControllers from '../../controllers/regular-calendar.controller';
import BookingControllers from '../../controllers/booking.controller';
import CalendarControllers from '../../controllers/calendar.controller';
import CouponControllers from '../../controllers/coupon.controller';
import OrderedPackageControllers from '../../controllers/ordered-package.controller';
import ScheduledMemoControllers from '../../controllers/scheduled-memo.controller';
import StudentReservationRequestControllers from '../../controllers/student-reservation-request.controller';
import TeacherControllers from '../../controllers/teacher.controller';
import TeacherLevelControllers from '../../controllers/teacher-level.controller';
import TeacherSalaryController from '../../controllers/teacher-salary.controller';
import UserController from '../../controllers/user.controller';
import PackageControllers from '../../controllers/package.controller';
import CourseControllers from '../../controllers/course.controller';
import { services } from '../../const/services';
import ListProxyCallApiSkypeController from '../../controllers/list-proxy-call-api-skype.controller';
import DailReportController from '../../controllers/daily-report.controller';
import CustomerReport from '../../controllers/customer-report.controller';
import StudentLeaveRequestController from '../../controllers/student-leave-request.controller';
import CsCallManagementController from '../../controllers/cs-call-management.controller';
import SkypeMeetingPoolController from '../../controllers/skype-meeting-pool.controller';
import ZaloInteractiveHistoryController from '../../controllers/zalo-interactive-history.controller';
import LearningAssessmentReportsController from '../../controllers/learning-assessment-reports.controller';
const router = express.Router();

router.get(
    '/cron-jobs/bookings',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.getAllBookingsByAdmin)
);

router.put(
    '/cron-jobs/bookings/:booking_id',
    auth.validateService(services.cronJobEPlus),
    editBookingValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.editBookingByAdmin)
);

router.post(
    '/cron-jobs/bookings/lesson-over-time',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.updateLessonTeachingOverTime)
);

router.post(
    '/cron-jobs/bookings/teacher-is-late-to-class',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.notificationForTeacherIsLateToClass)
);

router.post(
    '/cron-jobs/bookings/noti-change-teacher',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.notiChangeTeacher)
);

router.get(
    '/cron-jobs/coupons/new-coupons-daily',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CouponControllers.sendCouponsNotificationDailyByCronJobs)
);

router.get(
    '/cron-jobs/bookings/recent-completed-classes-without-rating',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.checkRecentUnratedBookings)
);

router.post(
    '/cron-jobs/scheduled-memos',
    auth.validateService(services.cronJobEPlus),
    createScheduledMemoValidator(),
    ValidationResult(),
    AsyncFunction(ScheduledMemoControllers.createScheduledMemoByAdmin)
);

router.get(
    '/cron-jobs/scheduled-memos',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(ScheduledMemoControllers.getScheduledMemosByAdmin)
);

router.put(
    '/cron-jobs/scheduled-memos/:memo_id',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(ScheduledMemoControllers.editMonthlyMemoByCronJobs)
);

router.get(
    '/cron-jobs/ordered-packages/will-expire',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(OrderedPackageControllers.getOrderedPackagesWillExpire)
);

router.get(
    '/cron-jobs/ordered-packages/:ordered_package_id',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(OrderedPackageControllers.getDetailOrderedPackage)
);

router.get(
    '/cron-jobs/teachers/available-in-specific-time',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(TeacherControllers.findAvailableTeachersInSpecificTime)
);

router.get(
    '/cron-jobs/regular-calendars',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        RegularCalendarControllers.getAllActiveRegularCalendarsForCronJobs
    )
);

router.post(
    '/cron-jobs/regular-calendars/update-status',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(RegularCalendarControllers.updateStatusRegularCalendar)
);

router.post(
    '/cron-jobs/regular-calendars/update-course',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(RegularCalendarControllers.updateCourseRegularCalendar)
);

router.put(
    '/cron-jobs/regular-calendars/inactive-regular-calendar',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(RegularCalendarControllers.inactiveRegularCalendar)
);

router.get(
    '/cron-jobs/students/:student_id/courses/:course_id/units/unbooked-regular',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.getUnitToBook)
);

router.post(
    '/cron-jobs/booking/update-unit-to-unbook',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.updateAllUnitBookingConfirmedToUnbooked)
);

router.post(
    '/cron-jobs/students/:student_id/bookings',
    auth.validateService(services.cronJobEPlus),
    createBookingAdminValidator(),
    ValidationResult(),
    AsyncFunction(BookingControllers.createBookingByCronJobs)
);

router.get(
    '/cron-jobs/students/needing-monthly-memo',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.getStudentsNeedingMonthlyMemo)
);

router.get(
    '/cron-jobs/student-reservation-requests/active-requests',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        StudentReservationRequestControllers.getAllStudentReservationRequestsByCronJobs
    )
);

router.post(
    '/cron-jobs/teachers/:teacher_id/schedule',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CalendarControllers.createScheduleByAdmin)
);

router.get(
    '/cron-jobs/teachers/:teacher_id/schedules',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CalendarControllers.getSchedulesActiveByAdmin)
);

router.get(
    '/cron-jobs/course/next-course',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CourseControllers.getNextCourse)
);

router.get(
    '/cron-jobs/teachers/to-comment-monthly-memo',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        ScheduledMemoControllers.getListOfTeachersToCommentMonthlyMemo
    )
);

router.get(
    '/cron-jobs/students/over-absent-courses',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(RegularCalendarControllers.getOverAbsentCourse)
);

router.get(
    '/cron-jobs/user/active-status-update',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(UserController.updateActiveStatusByCronJobs)
);

router.get(
    '/cron-jobs/packages/:id',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(PackageControllers.getPackageInfo)
);

router.post(
    '/cron-jobs/teacher-salary',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(TeacherSalaryController.caculateSalaryCronjob)
);

// router.post(
//     '/cron-jobs/get-list-proxy-call-api-skype',
//     auth.validateService(services.cronJobEPlus),
//     AsyncFunction(ListProxyCallApiSkypeController.configProxyCronJob)
// );

// router.post(
//     '/cron-jobs/recover-all-proxy-call-api-skype',
//     // auth.validateService(services.cronJobEPlus),
//     AsyncFunction(ListProxyCallApiSkypeController.recoverAllProxy)
// );

router.post(
    '/cron-jobs/daily-report-absent-cancel',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(DailReportController.dailyReportAbsentCancel)
);

router.post(
    '/cron-jobs/daily-report-management',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(DailReportController.dailyReportManagement)
);

router.post(
    '/cron-jobs/noti-remine-class',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.notiRemineClass)
);

router.post(
    '/cron-jobs/noti-happy-birthday',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(UserController.notiHappyBirthDay)
);

router.post(
    '/cron-jobs/caculate-renew',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CustomerReport.caculateReNewByCronjob)
);

router.post(
    '/cron-jobs/student-leave-request',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(StudentLeaveRequestController.getLeaveRequestForCronJobs)
);

router.post(
    '/cron-jobs/cancel-booking-by-student-leave-request',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        StudentLeaveRequestController.cancelBookingByStudentLeaveRequestForCronJobs
    )
);

router.get(
    '/cron-jobs/get-all-order-package-need-greeting-call',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        CsCallManagementController.getAllOrderPackageNeedGreetingCallForCronJobs
    )
);

router.post(
    '/cron-jobs/create-greeting-call',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CsCallManagementController.createGreetingCallForCronJobs)
);

router.post(
    '/cron-jobs/recover-all-bank-name',
    AsyncFunction(UserController.recoverAllBankName)
);

router.post(
    '/cron-jobs/change-status-for-test-reports-request',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(CsCallManagementController.changeStatusForTestReports)
);

router.post(
    '/cron-jobs/noti-active-package',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(OrderedPackageControllers.notiActivePackage)
);

router.post(
    '/cron-jobs/add-skype-meeting-pool-request',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(SkypeMeetingPoolController.addSkypeMeetingPool)
);

router.post(
    '/cron-jobs/remove-report-renew-in-month',
    AsyncFunction(CustomerReport.removeReportRenewInMonth)
);

router.get(
    '/cron-jobs/check-subtract-lesson-of-daily-package',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(OrderedPackageControllers.checkSubtractLessonOfDailyPackage)
);

router.post(
    '/cron-jobs/noti-remine-create-daily-booking',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.notiRemineCreateDailyBooking)
);

router.post(
    '/cron-jobs/notify-sta-booking-reminder',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(BookingControllers.notifySTABookingReminder)
);

router.get(
    '/cron-jobs/check-send-message-zalo-interaction',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        ZaloInteractiveHistoryController.checkSendMessageZaloInteraction
    )
);

router.post(
    '/cron-jobs/add-diligence-reports-monthly',
    auth.validateService(services.cronJobEPlus),
    AsyncFunction(
        LearningAssessmentReportsController.addDiligenceReportsMonthly
    )
);

export default router;
