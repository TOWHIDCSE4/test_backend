import express from 'express';
import config from 'config';
import { SuccessResponse } from '../core/ApiResponse';

// Import all routers
// Public Route
import PublicRoute from '../api/public/public.api';

// WebApp Route
import WebAppAuthenticateRoute from '../api/webapp/user/authenticate/basic-auth.api';
import WebAppVerifyRoute from '../api/webapp/verify/email.api';
import WebAppUserRoute from '../api/webapp/user/user.api';
import WebAppTeacherRoute from '../api/webapp/teacher/teacher.api';
import WebAppStudentRoute from '../api/webapp/student/student.api';
import WebAppCourseRoute from '../api/webapp/course/course.api';
import WebAppCalendarRoute from '../api/webapp/calendar/calendar.api';
import WebAppBookingRoute from '../api/webapp/booking/booking.api';
import WebAppTrialBookingRoute from '../api/webapp/booking/trial-booking.api';
import WebAppPackageRoute from '../api/webapp/package/package.api';
import WebAppOrderRoute from '../api/webapp/order/order.api';
import WebAppLocationRoute from '../api/webapp/location/location.api';
import WebAppUnitRoute from '../api/webapp/unit/unit.api';
import WebAppCourseUnitRoute from '../api/webapp/course/unit.api';
import WebAppSubjectRoute from '../api/webapp/subject/subject.api';
import WebAppTeacherRegularRequestRoute from '../api/webapp/teacher/teacher-regular-request.api';
import WebAppTeacherAbsentRequestRoute from '../api/webapp/teacher/teacher-absent-request.api';
import WebAppStudentReservationRequestRoute from './webapp/student/student-reservation-request.api';
import WebAppTeacherSalaryRoute from '../api/webapp/teacher/teacher-salary.api';
import WebAppRegularCalendarRoute from '../api/webapp/regular-calendar/regular-calendar.api';
import WebAppCountryRoute from '../api/webapp/country/country.api';
import WebAppQuizRoute from '../api/webapp/quiz/quiz.api';
import WebAppReportRoute from '../api/webapp/report/report.api';
import WebAppScheduledMemoRoute from './webapp/user/scheduled-memo.api';
import WebAppCouponRoute from '../api/webapp/user/coupon.api';
import WebAppOrderedPackageRoute from '../api/webapp/ordered-package/ordered-package.api';
import WebAppStudentExtensionRequestRoute from './webapp/student/student-extension-request.api';
import WebAppEventNoticeRoute from './webapp/event-notice/event-notice.api';
import WebAppWalletRoute from './webapp/wallet/wallet.api';
import WebAppCommentSuggestionRoute from './webapp/comment-suggestion/comment-suggestion.api';
import WebAppHomeworkTestResultRoute from '../api/webapp/homework-test-result/homework-test-result.api';
import WebAppLearningAssessmentReportRoute from '../api/webapp/learning-assessment-report/learning-assessment-report.api';
import WebAppStudentLeaveRequests from '../api/webapp/student/student-leave-request.api';

// Admin Route
import AdminCourseRoute from '../api/admin/course/course.api';
import AdminCurriculumRoute from '../api/admin/curriculum/curriculum.api';
import AdminPackageRoute from '../api/admin/package/package.api';
import AdminSubjectRoute from '../api/admin/subject/subject.api';
import AdminLocationRoute from '../api/admin/location/location.api';
import AdminUnitRoute from '../api/admin/unit/unit.api';
import AdminAuthenticateRoute from '../api/admin/admin/authenticate/basic-auth.api';
import AdminUserRoute from '../api/admin/user/user.api';
import AdminTeacherRoute from '../api/admin/teacher/teacher.api';
import AdminTeacherBookingRoute from '../api/admin/teacher/booking.api';
import AdminStudentRoute from '../api/admin/student/student.api';
import AdminStudentBookingRoute from '../api/admin/student/booking.api';
import AdminBookingRoute from '../api/admin/booking/booking.api';
import AdminTrialBookingRoute from '../api/admin/booking/trial-booking.api';
import AdminIeltsBookingRoute from '../api/admin/booking/ielts-booking.api';
import AdminOrderRoute from '../api/admin/order/order.api';
import AdminTeacherRegularRequestRoute from '../api/admin/teacher/teacher-regular-request.api';
import AdminTeacherAbsentRequestRoute from '../api/admin/teacher/teacher-absent-request.api';
import AdminStudentReservationRequestRoute from './admin/student/student-reservation-request.api';
import AdminUserAdmin from './admin/admin/admin_user/admin_user.api';
import AdminRegularCalendarRoute from '../api/admin/regular-calendar/regular-calendar.api';
import AdminDepartmentRoute from '../api/admin/department/department.api';
import AdminTeamRoute from '../api/admin/department/team.api';
import AdminTeacherLevelRoute from '../api/admin/teacher-level/teacher-level.api';
import AdminTeacherSalaryRoute from '../api/admin/teacher/teacher-salary.api';
import AdminTrialTeacherRoute from '../api/admin/teacher/trial-teacher.api';
import AdminDashboardRoute from '../api/admin/dashboard/dashboard.api';
import AdminTemplateRoute from '../api/admin/template/template.api';
import AdminOperationIssueRoute from '../api/admin/operation-issue/operation-issue.api';
import AdminReportRoute from '../api/admin/report/report.api';
import AdminScheduledMemoRoute from './admin/scheduled-memo/scheduled-memo.api';
import AdminCouponRoute from '../api/admin/coupon/coupon.api';
import AdminCountryRoute from '../api/admin/country/country.api';
import AdminOrderedPackageRoute from '../api/admin/ordered-package/ordered-package.api';
import AdminStudentExtensionRequestRoute from './admin/student/student-extension-request.api';
import AdminEventNoticeRoute from './admin/event-notice/event-notice.api';
import AdminStudentLevelRoute from '../api/admin/student-level/student-level.api';
import AdminWalletRoute from './admin/wallet/wallet.api';
import AdminStudentLeaveRequestRoute from '../api/admin/student/student-leave-request.api';
import AdminCustomerReportRoute from './admin/customer-reports/customer-reports-api';
import AdminAcademyReportRoute from './admin/teacher/academy-report.api';
import AdminCommentSuggestionRoute from './admin/comment-suggestion/comment-suggestion.api';
import AdminEmailRoute from './admin/email/email.api';
import AdminSignupContact from './admin/signup-contact/signup-contact.api';
import CustomerSupportManagement from '../api/admin/customer-support-management/index.api';
import AcademicReport from '../api/admin/academic-reports/academic-reports-api';
import TrialTestIeltsResult from '../api/admin/trial-test-ielts-result/trial-test-ielts-result.api';
import AdminHomeworkTestResult from '../api/admin/homework-test-result/homework-test-result.api';
import ZaloInteractiveHistory from '../api/admin/zalo-interactive-history/zalo-interactive-history.api';
import AdminApiKeyAI from './admin/templateAI/api-key-AI.api';
import AdminPromptTemplateAI from './admin/templateAI/prompt-template-AI.api';
import AdminPromptCategoryAI from './admin/templateAI/prompt-category-AI.api';
import AdminLearningAssessmentReports from '../api/admin/learning-assessment-reports/learning-assessment-reports.api';
import AdminAIReportGenerate from '../api/admin/AI-reports/report-generate.api';
import AdminAIReportResult from '../api/admin/AI-reports/report-result.api';
import AdminScreenSetting from '../api/admin/screen-config/screen-config.api';
import AdminAdviceLetter from '../api/admin/advice-letter/advice-letter.api'

import MergePackage from './admin/merge-package/index';
import AdminLog from './admin/log/index';

import CronJobsRoute from '../api/cron-jobs/cron-jobs.api';
import MeetRoute from '../api/meet/meet.api';
import PrivateAdminRoute from '../api/private/admin.api';

//  CRM Route
import CRMUser from '../api/crm/user/user.api';
import CRMBooking from '../api/crm/booking/booking.api';
import CRMTrialTestIeltsResult from '../api/crm/trial-test-ielts-result/trial-test-ielts-result.api';

// Regular care
import RegularCare from '../api/admin/regular-care/index.api';

// Recover Route
import Recover from '../api/recover/recover.api';

const APP_NAME = config.get('server.app');
const router = express.Router();

router.get('/health', (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`client IP: ${clientIp}`);
    new SuccessResponse('success', {
        msg: `Welcome to ${APP_NAME}`
    }).send(res, req);
});

router.use('/', PublicRoute);

router.use('/', WebAppAuthenticateRoute);
router.use('/', WebAppVerifyRoute);
router.use('/', WebAppUserRoute);
router.use('/', WebAppTeacherRoute);
router.use('/', WebAppStudentRoute);
router.use('/', WebAppCourseRoute);
router.use('/', WebAppCalendarRoute);
router.use('/', WebAppBookingRoute);
router.use('/', WebAppTrialBookingRoute);
router.use('/', WebAppPackageRoute);
router.use('/', WebAppOrderRoute);
router.use('/', WebAppLocationRoute);
router.use('/', WebAppUnitRoute);
router.use('/', WebAppCourseUnitRoute);
router.use('/', WebAppSubjectRoute);
router.use('/', WebAppTeacherRegularRequestRoute);
router.use('/', WebAppTeacherAbsentRequestRoute);
router.use('/', WebAppTeacherSalaryRoute);
router.use('/', WebAppRegularCalendarRoute);
router.use('/', WebAppCountryRoute);
router.use('/', WebAppQuizRoute);
router.use('/', WebAppReportRoute);
router.use('/', WebAppScheduledMemoRoute);
router.use('/', WebAppStudentReservationRequestRoute);
router.use('/', WebAppCouponRoute);
router.use('/', WebAppOrderedPackageRoute);
router.use('/', WebAppStudentExtensionRequestRoute);
router.use('/', WebAppEventNoticeRoute);
router.use('/', WebAppWalletRoute);
router.use('/', WebAppCommentSuggestionRoute);
router.use('/', WebAppHomeworkTestResultRoute);
router.use('/', WebAppLearningAssessmentReportRoute);
router.use('/', WebAppStudentLeaveRequests);

router.use('/', AdminAuthenticateRoute);
router.use('/', AdminUserAdmin);
router.use('/', AdminCourseRoute);
router.use('/', AdminCurriculumRoute);
router.use('/', AdminPackageRoute);
router.use('/', AdminSubjectRoute);
router.use('/', AdminLocationRoute);
router.use('/', AdminUnitRoute);
router.use('/', AdminUserRoute);
router.use('/', AdminTeacherRoute);
router.use('/', AdminTeacherBookingRoute);
router.use('/', AdminStudentRoute);
router.use('/', AdminStudentBookingRoute);
router.use('/', AdminBookingRoute);
router.use('/', AdminTrialBookingRoute);
router.use('/', AdminIeltsBookingRoute);
router.use('/', AdminOrderRoute);
router.use('/', AdminTeacherRegularRequestRoute);
router.use('/', AdminTeacherAbsentRequestRoute);
router.use('/', AdminRegularCalendarRoute);
router.use('/', AdminDepartmentRoute);
router.use('/', AdminTeamRoute);
router.use('/', AdminTeacherLevelRoute);
router.use('/', AdminTeacherSalaryRoute);
router.use('/', AdminTrialTeacherRoute);
router.use('/', AdminDashboardRoute);
router.use('/', AdminTemplateRoute);
router.use('/', AdminOperationIssueRoute);
router.use('/', AdminReportRoute);
router.use('/', AdminScheduledMemoRoute);
router.use('/', AdminStudentReservationRequestRoute);
router.use('/', AdminCouponRoute);
router.use('/', AdminCountryRoute);
router.use('/', AdminOrderedPackageRoute);
router.use('/', AdminStudentExtensionRequestRoute);
router.use('/', AdminEventNoticeRoute);
router.use('/', AdminStudentLevelRoute);
router.use('/', AdminWalletRoute);
router.use('/', AdminStudentLeaveRequestRoute);
router.use('/', AdminCustomerReportRoute);
router.use('/', AdminAcademyReportRoute);
router.use('/', AdminCommentSuggestionRoute);
router.use('/', AdminEmailRoute);
router.use('/', CustomerSupportManagement);
router.use('/', AcademicReport);
router.use('/', AdminSignupContact);
router.use('/', MergePackage);
router.use('/', AdminLog);
router.use('/', AdminApiKeyAI);
router.use('/', AdminPromptTemplateAI);
router.use('/', AdminPromptCategoryAI);
router.use('/', AdminLearningAssessmentReports);
router.use('/', AdminAIReportGenerate);
router.use('/', AdminAIReportResult);
router.use('/', AdminScreenSetting);
router.use('/', AdminAdviceLetter);

router.use('/', CronJobsRoute);
router.use('/', MeetRoute);
router.use('/', PrivateAdminRoute);

router.use('/crm', CRMUser);
router.use('/crm', CRMBooking);
router.use('/crm', CRMTrialTestIeltsResult);

router.use('/', RegularCare);

router.use('/', TrialTestIeltsResult);
router.use('/', AdminHomeworkTestResult);

router.use('/', Recover);
router.use('/', ZaloInteractiveHistory);

export default router;
