import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import LearningAssessmentReportsController from '../../../controllers/learning-assessment-reports.controller';
const router = express.Router();

router.get(
    '/learning-assessment/all-report-publish',
    auth.validateToken(),
    AsyncFunction(
        LearningAssessmentReportsController.getAllLearningAssessmentReportsByStudent
    )
);

router.get(
    '/learning-assessment/detail-report',
    auth.validateToken(),
    AsyncFunction(
        LearningAssessmentReportsController.getLearningAssessmentReportsByStudent
    )
);

export default router;
