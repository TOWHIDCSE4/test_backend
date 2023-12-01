import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/get-all-upcoming-test',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcut_view]),
    AsyncFunction(CsCallManagementController.getAllUpcomingTest)
);

router.put(
    '/admin/regular-care/update-upcoming-test',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcut_update]),
    AsyncFunction(CsCallManagementController.updateUpcomingTest)
);

export default router;
