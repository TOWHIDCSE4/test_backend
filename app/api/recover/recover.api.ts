import express from 'express';
import AsyncFunction from '../../core/async-handler';
import auth from '../../auth/validate-request';
import RecoverController from '../../controllers/recover.controller';
const router = express.Router();

// Student
router.get(
    '/recover-done/recover-link-skype-user',
    AsyncFunction(RecoverController.recoverLinkSkypeUser)
);
router.get(
    '/recover-done/recover-course-type-and-unit-type',
    AsyncFunction(RecoverController.recoverCourseTypeAndUnitType)
);

router.get(
    '/recover-done/recover-trial-test-ielts-result',
    AsyncFunction(RecoverController.recoverTrialTestIeltsResult)
);

router.get(
    '/recover-done/delete-checking-call-lesson-one',
    AsyncFunction(RecoverController.deleteAllCheckingCallLessonOne)
);

router.get(
    '/recover-done/quiz-session-booking',
    // auth.validateToken(),
    AsyncFunction(RecoverController.quizSessionBooking)
);

router.get(
    '/recover-done/status-waiting-next-booking-of-test-reports',
    // auth.validateToken(),
    AsyncFunction(RecoverController.statusTestReports)
);

router.get(
    '/recover/update-id-student-leave-request',
    AsyncFunction(RecoverController.updateIdStudentLeaveRequest)
);

router.get(
    '/recover/decentralization-role-deputy-manager-of-all-department',
    AsyncFunction(RecoverController.decentralizationRoleDeputyManager)
);

router.get(
    '/recover/add-default-priority-periodic-report',
    AsyncFunction(RecoverController.addDefaultPriorityPeriodicReport)
);

router.get(
    '/recover/update-type-periodic-report',
    AsyncFunction(RecoverController.updateTypePeriodicReport)
);

router.get(
    '/recover/update-verify-email-all-student',
    AsyncFunction(RecoverController.updateVerifyEmailAllStudent)
);

export default router;
