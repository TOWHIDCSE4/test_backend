import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import PackageControllers from '../../../controllers/package.controller';
import ValidationResult, {
    createPackageValidator,
    editPackageValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/all-packages',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc2_view]),
    AsyncFunction(PackageControllers.getAllPackages)
);

router.get(
    '/admin/packages',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmcsc_view,
        PERMISSIONS.tmctc_view,
        PERMISSIONS.omao_create_trial,
        PERMISSIONS.ompo_create_order,
        PERMISSIONS.pmp_view
    ]),
    AsyncFunction(PackageControllers.getPackages)
);

router.post(
    '/admin/packages',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmp_create]),
    createPackageValidator(),
    ValidationResult(),
    AsyncFunction(PackageControllers.createPackage)
);

router.get(
    '/admin/packages/:id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.asasm_update,
        PERMISSIONS.ascas_view,
        PERMISSIONS.tmo_update_time
    ]),
    AsyncFunction(PackageControllers.getPackageInfo)
);

router.get(
    '/admin/packages/:id/ordered-packages',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmp_view]),
    AsyncFunction(PackageControllers.getOrderedPackageByPackageId)
);

router.put(
    '/admin/packages/:id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmp_update]),
    editPackageValidator(),
    ValidationResult(),
    AsyncFunction(PackageControllers.editPackage)
);

router.delete(
    '/admin/packages/:id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmp_delete]),
    AsyncFunction(PackageControllers.removePackage)
);

router.get(
    '/admin/packages/:package_id/discount-for-student',
    auth.validateToken(),
    AsyncFunction(PackageControllers.checkDiscountOfAPackageForAStudent)
);

export default router;
