import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import DashboardController from '../../../controllers/dashboard.controller';
import { PERMISSIONS } from '../../../const/permission';
import { services } from '../../../const/services';

const router = express.Router();

router.get(
    '/admin/dashboard/statistics',
    auth.validateToken(),
    AsyncFunction(DashboardController.getStatistics)
);

router.get(
    '/dashboard/hamia-news',
    auth.validateService(services.hamia_news),
    AsyncFunction(DashboardController.hamiaNews)
);

export default router;
