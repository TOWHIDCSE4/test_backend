import express from 'express';
import AsyncFunction from '../../../core/async-handler';
const router = express.Router();
import auth from '../../../auth/validate-request';
import LearningAssessmentReportsController from '../../../controllers/learning-assessment-reports.controller';
import { PERMISSIONS } from '../../../const/permission';

router.post(
    '/admin/learning-assessment-reports/create-by-admin',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arla_create]),
    AsyncFunction(LearningAssessmentReportsController.createLAReportsByAdmin)
);

router.get(
    '/admin/learning-assessment-reports/get-all',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arla_view]),
    AsyncFunction(
        LearningAssessmentReportsController.getAllLearningAssessmentReports
    )
);

router.put(
    '/admin/learning-assessment-reports/:idLearningAssessment',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arla_update]),
    AsyncFunction(LearningAssessmentReportsController.updateLearningAssessment)
);

router.put(
    '/admin/learning-assessment-reports/update-status/list-reports',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arla_update_status]),
    AsyncFunction(LearningAssessmentReportsController.updateStatusReports)
);

router.delete(
    '/admin/learning-assessment-reports/:idLearningAssessment',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arla_delete]),
    AsyncFunction(LearningAssessmentReportsController.deleteLearningAssessment)
);

export default router;
