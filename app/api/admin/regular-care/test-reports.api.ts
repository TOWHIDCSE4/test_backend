import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/get-all-test-reports',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rctr_view]),
    AsyncFunction(CsCallManagementController.getAllTestReports)
);

router.put(
    '/admin/regular-care/update-test-reports',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rctr_update]),
    AsyncFunction(CsCallManagementController.updateTestReports)
);

export default router;
