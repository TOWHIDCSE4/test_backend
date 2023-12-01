import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/get-all-checking-call',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rccc_view]),
    AsyncFunction(CsCallManagementController.getAllCheckingCall)
);

router.put(
    '/admin/regular-care/update-checking-call',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rccc_update]),
    AsyncFunction(CsCallManagementController.updateCheckingCall)
);

export default router;
