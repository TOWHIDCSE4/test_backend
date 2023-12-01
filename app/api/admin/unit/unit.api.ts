import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import UnitControllers from '../../../controllers/unit.controller';
import ValidationResult, { unitValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/units',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmu_view, PERMISSIONS.pmc2_update]),
    AsyncFunction(UnitControllers.getUnitsByAdmin)
);

router.post(
    '/admin/units',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmu_create]),
    unitValidator(),
    ValidationResult(),
    AsyncFunction(UnitControllers.createUnit)
);

router.put(
    '/admin/units/:unit_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmu_update]),
    AsyncFunction(UnitControllers.editUnit)
);

router.put(
    '/admin/course/update-unit-course',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmu_update]),
    AsyncFunction(UnitControllers.updateUnitCourse)
);

router.delete(
    '/admin/units/:unit_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmu_delete]),
    AsyncFunction(UnitControllers.removeUnit)
);

export default router;
