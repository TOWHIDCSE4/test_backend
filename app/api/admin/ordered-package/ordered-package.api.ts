import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import OrderedPackageControllers from '../../../controllers/ordered-package.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/ordered-packages/:ordered_package_id',
    auth.validateToken(),
    AsyncFunction(OrderedPackageControllers.getOrderedPackageById)
);

router.put(
    '/admin/ordered-packages/:ordered_package_id',
    auth.validateToken(),
    AsyncFunction(OrderedPackageControllers.editOrderedPackageByAdmin)
);

router.post(
    '/admin/ordered-packages/stop',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.omao_op_stop]),
    AsyncFunction(OrderedPackageControllers.stopOrderedPackage)
);

router.delete(
    '/admin/ordered-packages/delete',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.omao_op_delete]),
    AsyncFunction(OrderedPackageControllers.deleteOrderedPackageByAdmin)
);
export default router;
