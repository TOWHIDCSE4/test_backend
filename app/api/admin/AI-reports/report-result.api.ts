import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import AIReportResultController from '../../../controllers/ai-report-result.controller';

const router = express.Router();

router.get(
    '/admin/ai-report-result/all',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.airrr, PERMISSIONS.airrr_view]),
    AsyncFunction(AIReportResultController.getAllReportResultPagination)
);

router.post(
    '/admin/ai-report-result',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.airrr_create]),
    ValidationResult(),
    AsyncFunction(AIReportResultController.createReportResult)
);

router.put(
    '/admin/ai-report-result/:_idReportResult',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.airrr_update]),
    ValidationResult(),
    AsyncFunction(AIReportResultController.updateReportResult)
);

router.delete(
    '/admin/ai-report-result/:_idReportResult',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.airrr_delete]),
    AsyncFunction(AIReportResultController.deleteReportResult)
);

export default router;
