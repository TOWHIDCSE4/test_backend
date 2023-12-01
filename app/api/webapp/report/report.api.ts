import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ReportController from '../../../controllers/report.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.post(
    '/report/claim/new',
    auth.validateToken(),
    AsyncFunction(ReportController.createReport)
);

router.post(
    '/report/rating',
    auth.validateToken(),
    AsyncFunction(ReportController.createReport)
);

router.get(
    '/report/claim/list',
    auth.validateToken(),
    AsyncFunction(ReportController.getReportByUser)
);

router.put(
    '/report/claim/update/:id',
    auth.validateToken(),
    AsyncFunction(ReportController.updateReport)
);

export default router;
