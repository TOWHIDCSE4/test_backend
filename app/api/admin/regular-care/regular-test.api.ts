import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/regular-test',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcrt_view]),
    AsyncFunction(CsCallManagementController.getAllRegularTest)
);

export default router;
