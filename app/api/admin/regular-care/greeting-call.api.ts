import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult, { adminUserCreateValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/dashboard/active-form',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcd_view]),
    AsyncFunction(CsCallManagementController.getDataDashboardActiveForm)
);

router.get(
    '/admin/regular-care/get-all-greeting-call',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcgc_view]),
    AsyncFunction(CsCallManagementController.getAllGreetingCall)
);

router.put(
    '/admin/regular-care/update-greeting-call',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcgc_update]),
    AsyncFunction(CsCallManagementController.updateGreetingCall)
);

router.get(
    '/admin/regular-care/get-list-staff-contact-history',
    auth.validateToken(),
    AsyncFunction(CsCallManagementController.getListStaffContactHistory)
);

export default router;
