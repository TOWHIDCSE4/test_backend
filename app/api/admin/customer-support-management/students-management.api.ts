import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CustomerSupportManagementController from '../../../controllers/customer-support-management/student-management.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/customer-support-management/export',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.csmsm_export_excel,
        PERMISSIONS.csmsm_export_student_list
    ]),
    AsyncFunction(CustomerSupportManagementController.exportExcel)
);

router.get(
    '/admin/customer-support-management/students-management',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmsm_view]),
    AsyncFunction(CustomerSupportManagementController.getStudents)
);

router.get(
    '/admin/customer-support-management/get-all-regular-calendar',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmrcs_view]),
    AsyncFunction(CustomerSupportManagementController.getAllRegularCalendar)
);

router.put(
    '/admin/customer-support-management/students-management',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmsm_update]),
    AsyncFunction(CustomerSupportManagementController.updateData)
);

router.put(
    '/admin/customer-support-management/students-management/update-staff',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmsm_update_supporter]),
    AsyncFunction(CustomerSupportManagementController.updateStaffStudents)
);

export default router;
