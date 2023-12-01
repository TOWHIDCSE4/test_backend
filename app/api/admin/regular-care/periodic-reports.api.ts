import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import CsCallManagementController from '../../../controllers/cs-call-management.controller';

const router = express.Router();

router.get(
    '/admin/regular-care/get-all-periodic-reports',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcpr_view]),
    AsyncFunction(CsCallManagementController.getAllPeriodicReports)
);

router.put(
    '/admin/regular-care/update-periodic-reports',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.rcpr_update,
        PERMISSIONS.rcpr_assign_academic,
        PERMISSIONS.rcpr_assign_manager
    ]),
    AsyncFunction(CsCallManagementController.updatePeriodicReports)
);

router.put(
    '/admin/regular-care/create-periodic-reports-for-learning-assessment',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcpr_add_report]),
    AsyncFunction(
        CsCallManagementController.createPeriodicReportsForLearningAssessment
    )
);

router.delete(
    '/admin/regular-care/periodic-reports/:obj_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.rcpr_delete]),
    AsyncFunction(CsCallManagementController.removeRegularCare)
);

router.get(
    '/admin/regular-care/periodic-reports/get-list-action-history',
    auth.validateToken(),
    AsyncFunction(CsCallManagementController.getListActionHistory)
);

export default router;
