import express from 'express';
import AsyncFunction from '../../../../core/async-handler';
import AdminControllers from '../../../../controllers/admin.controller';
import ValidationResult, {
    roleValidator,
    createAdminValidate,
    updateAdminValidate,
    updatePermissionAdminValidate
} from '../../../../validator';
import auth from '../../../../auth/validate-request';
import { PERMISSIONS } from '../../../../const/permission';

const router = express.Router();

router.put(
    '/admin/administrators/role/:admin_id',
    auth.validateToken(),
    roleValidator(),
    ValidationResult(),
    AsyncFunction(AdminControllers.changeRoleAdminBySuperAdmin)
);

router.get(
    '/admin/administrators',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_view,
        PERMISSIONS.tpr_approve,
        PERMISSIONS.tpr_reject,
        PERMISSIONS.csmcr_view,
        PERMISSIONS.amcr_view,
        PERMISSIONS.csrc_view,
        PERMISSIONS.hrmum_view,
        PERMISSIONS.hrmrm_view
    ]),
    AsyncFunction(AdminControllers.getAllAdminPaginate)
);

router.get(
    '/admin/administrators/all',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_view,
        PERMISSIONS.tpr_approve,
        PERMISSIONS.tpr_reject,
        PERMISSIONS.csmcr_view,
        PERMISSIONS.amcr_view,
        PERMISSIONS.csrc_view,
        PERMISSIONS.hrmum_view,
        PERMISSIONS.hrmrm_view,
        PERMISSIONS.tmo_view
    ]),
    AsyncFunction(AdminControllers.getAllAdmin)
);

router.post(
    '/admin/administrators',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmum_create]),
    createAdminValidate(),
    ValidationResult(),
    AsyncFunction(AdminControllers.createAdmin)
);

router.put(
    '/admin/administrators/:admin_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmum_update]),
    updateAdminValidate(),
    ValidationResult(),
    AsyncFunction(AdminControllers.updateAdmin)
);

router.get(
    '/admin/administrators/information/:admin_id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_view,
        PERMISSIONS.tpr_approve,
        PERMISSIONS.tpr_reject,
        PERMISSIONS.csmcr_view,
        PERMISSIONS.amcr_view,
        PERMISSIONS.csrc_view,
        PERMISSIONS.hrmum_view,
        PERMISSIONS.hrmrm_view
    ]),
    AsyncFunction(AdminControllers.getAdminInformation)
);

router.put(
    '/admin/administrators/:admin_id/update-permissions',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmum_update]),
    updatePermissionAdminValidate(),
    ValidationResult(),
    AsyncFunction(AdminControllers.updatePermissionAdmin)
);

router.delete(
    '/admin/administrators/:admin_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmum_delete]),
    AsyncFunction(AdminControllers.removeAdmin)
);

export default router;
