import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/all-observation',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rco_view]),
    AsyncFunction(CsCallManagementController.getAllObservation)
);

router.put(
    '/admin/regular-care/update-observation',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rco_update]),
    AsyncFunction(CsCallManagementController.updateObservation)
);

router.delete(
    '/admin/regular-care/observation/:obj_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rco_delete]),
    AsyncFunction(CsCallManagementController.removeRegularCare)
);

export default router;
