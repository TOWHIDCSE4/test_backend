import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import Controller from '../../../controllers/academic-report.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/academic-report/renew',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.arrn_view]),
    AsyncFunction(Controller.renew)
);

export default router;
