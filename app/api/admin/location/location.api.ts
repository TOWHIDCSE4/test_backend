import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import LocationControllers from '../../../controllers/location.controller';
import ValidationResult, {
    createLocationValidator,
    editLocationValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/locations',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_view,
        PERMISSIONS.ompo_create_order,
        PERMISSIONS.pmp_view,
        PERMISSIONS.satl_view,
        PERMISSIONS.satl2_view
    ]),
    AsyncFunction(LocationControllers.getLocations)
);

router.post(
    '/admin/locations',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.satl2_create]),
    createLocationValidator(),
    ValidationResult(),
    AsyncFunction(LocationControllers.createLocation)
);

router.put(
    '/admin/locations/:location_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.satl2_update]),
    editLocationValidator(),
    ValidationResult(),
    AsyncFunction(LocationControllers.editLocation)
);

router.delete(
    '/admin/locations/:location_id',
    auth.validateToken(),
    AsyncFunction(LocationControllers.removeLocation)
);

export default router;
