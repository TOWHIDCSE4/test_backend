import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import ScreenConfigController from '../../../controllers/screen-config.controller';

const router = express.Router();

router.get(
    '/admin/screen-config/get-one',
    auth.validateToken(),
    AsyncFunction(ScreenConfigController.getOneScreenConfig)
);

router.get(
    '/student/screen-config/get-one',
    auth.validateToken(),
    AsyncFunction(ScreenConfigController.getOneScreenConfig)
);

router.post(
    '/admin/screen-config',
    auth.validateToken(),
    ValidationResult(),
    AsyncFunction(ScreenConfigController.createScreenConfig)
);

router.put(
    '/admin/screen-config/:_idScreenConfig',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.slr_screen_config]),
    ValidationResult(),
    AsyncFunction(ScreenConfigController.updateScreenConfig)
);

router.delete(
    '/admin/screen-config/:_idScreenConfig',
    auth.validateToken(),
    AsyncFunction(ScreenConfigController.deleteScreenConfig)
);

export default router;
