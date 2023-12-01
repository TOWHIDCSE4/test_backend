import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import PackageControllers from '../../../controllers/package.controller';
import OrderedPackageControllers from '../../../controllers/ordered-package.controller';
import auth from '../../../auth/validate-request';

const router = express.Router();

router.get(
    '/packages',
    auth.validateToken(),
    AsyncFunction(PackageControllers.getPackagesByStudent)
);

router.get(
    '/my-packages',
    auth.validateToken(),
    AsyncFunction(
        OrderedPackageControllers.getActiveOrderedPackagesOfStudentByThemshelves
    )
);

router.get(
    '/packages/:package_id/discount-for-student',
    auth.validateToken(),
    AsyncFunction(PackageControllers.checkDiscountOfAPackageForAStudent)
);

export default router;
