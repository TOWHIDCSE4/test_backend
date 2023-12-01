import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import MergePackageController from '../../../controllers/merge-package.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import { createMergedPackageValidator } from '../../../validator/merge-package.validator';

const router = express.Router();

router.get(
    '/admin/merge-package',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asmp_view]),
    AsyncFunction(MergePackageController.getMergedPackages)
);

router.get(
    '/admin/package-unmatched',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asmp_view]),
    AsyncFunction(MergePackageController.getPremiumPackageUnMatchedByStudent)
);

router.post(
    '/admin/merge-package',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asmp_create]),
    createMergedPackageValidator(),
    AsyncFunction(MergePackageController.mergePackages)
);

router.delete(
    '/admin/merge-package',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asmp_create]),
    createMergedPackageValidator(),
    AsyncFunction(MergePackageController.deleteMergedPackage)
);

export default router;
