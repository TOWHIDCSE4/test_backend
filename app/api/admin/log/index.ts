import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import Controller from '../../../controllers/log.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/logs',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sal_view]),
    AsyncFunction(Controller.get)
);

router.get(
    '/admin/list-api',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sal_view]),
    AsyncFunction(Controller.getListApi)
);

export default router;
