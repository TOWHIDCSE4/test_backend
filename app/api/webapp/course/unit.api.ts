import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import UnitControllers from '../../../controllers/unit.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
const router = express.Router();

router.get(
    '/courses/:course_id/units',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_update_unit,
        PERMISSIONS.tmcsc_view,
        PERMISSIONS.tmctc_view,
        PERMISSIONS.asasm_update,
        PERMISSIONS.ascas_view
    ]),
    AsyncFunction(UnitControllers.getUnitsByCourse)
);

export default router;
