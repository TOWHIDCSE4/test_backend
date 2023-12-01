import DepartmentController from '../../../controllers/department.controller';
import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import {
    createDepartmentValidator,
    updatePermissionOfDepartmentValidator
} from '../../../validator/department.validator';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/department',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.mmi_view,
        PERMISSIONS.hrmum_view,
        PERMISSIONS.hrmrm_view
    ]),
    AsyncFunction(DepartmentController.getAllDepartment)
);

router.get(
    '/admin/department/:idDepartment',
    auth.validateToken(),
    AsyncFunction(DepartmentController.getDepartment)
);

router.post(
    '/admin/department',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmrm_create]),
    createDepartmentValidator(),
    ValidationResult(),
    AsyncFunction(DepartmentController.createDepartment)
);

router.put(
    '/admin/department/:idDepartment/update-permission',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmrm_update]),
    updatePermissionOfDepartmentValidator(),
    ValidationResult(),
    AsyncFunction(DepartmentController.updatePermissionOfDepartment)
);

router.put(
    '/admin/department/:idDepartment',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmrm_update]),
    createDepartmentValidator(),
    ValidationResult(),
    AsyncFunction(DepartmentController.editDepartment)
);

router.delete(
    '/admin/department/:idDepartment',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmrm_delete]),
    AsyncFunction(DepartmentController.deleteDepartment)
);

router.get(
    '/admin/feature',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmrm_view]),
    AsyncFunction(DepartmentController.getAllFeature)
);

export default router;
