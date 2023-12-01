import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import DashboardController from '../../../controllers/customer-support-management/dashboard.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/customer-support-management/dashboard/active-form',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmd_view]),
    AsyncFunction(DashboardController.getDataDashboardActiveForm)
);

router.get(
    '/admin/customer-support-management/dashboard/cs',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmd_view]),
    AsyncFunction(DashboardController.getDataDashboardCS)
);

router.get(
    '/admin/customer-support-management/dashboard/cs2',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmd_view]),
    AsyncFunction(DashboardController.getDataDashboardCS2)
);

router.get(
    '/admin/customer-support-management/dashboard/statistics',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmd_view]),
    AsyncFunction(DashboardController.getDataDashBoardStatistics)
);
export default router;
