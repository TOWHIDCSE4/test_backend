import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import AIReportGenerateController from '../../../controllers/ai-report-generate.controller';

const router = express.Router();

router.post(
    '/admin/ai-report/report-generate',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.airrg_create]),
    AsyncFunction(AIReportGenerateController.reportGenerate)
);

export default router;
