import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import OrderedPackageControllers from '../../../controllers/ordered-package.controller';
import auth from '../../../auth/validate-request';

const router = express.Router();

router.get(
    '/ordered-packages',
    auth.validateToken(),
    AsyncFunction(OrderedPackageControllers.getAllOrderedPackagesByStudent)
);

router.get(
    '/ordered-packages/:ordered_package_id',
    auth.validateToken(),
    AsyncFunction(OrderedPackageControllers.getDetailOrderedPackage)
);

router.get(
    '/count-active-ordered-packages',
    auth.validateToken(),
    AsyncFunction(
        OrderedPackageControllers.getCountActiveOrderedPackagesWithTypeOfAStudent
    )
);

export default router;
