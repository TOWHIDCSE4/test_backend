import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentControllers from '../../../controllers/student.controller';
import OrderedPackageControllers from '../../../controllers/ordered-package.controller';
import ValidationResult, { adminUserCreateValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.post(
    '/admin/users/students',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.srs_create, PERMISSIONS.sas_create]),
    adminUserCreateValidator(),
    ValidationResult(),
    AsyncFunction(StudentControllers.createStudentUserByAdmin)
);

router.post(
    '/admin/students/:user_id',
    auth.validateToken(),
    AsyncFunction(StudentControllers.createStudentInfoByAdmin)
);

router.put(
    '/admin/students/:student_id',
    auth.validateToken(),
    AsyncFunction(StudentControllers.editStudentByAdmin)
);

/*
 * Admin get the list of active packages of 1 student, with pagination
 */
router.get(
    '/admin/students/:student_id/packages',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_update_unit,
        PERMISSIONS.tmcic_view,
        PERMISSIONS.tmrr_create,
        PERMISSIONS.tmer_create,
        PERMISSIONS.asasm_update,
        PERMISSIONS.ascas_view
    ]),
    AsyncFunction(
        OrderedPackageControllers.getActiveOrderedPackagesOfStudentByAdmin
    )
);

router.get(
    '/admin/students/:user_id/all-packages',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmo_update_unit,
        PERMISSIONS.tmcic_view,
        PERMISSIONS.tmrr_create,
        PERMISSIONS.tmer_create,
        PERMISSIONS.asasm_update,
        PERMISSIONS.ascas_view
    ]),
    AsyncFunction(
        OrderedPackageControllers.getAllOrderedPackagesOfAnUserByAdmin
    )
);

router.get(
    '/admin/students/renew-students-statistics',
    auth.validateToken(),
    AsyncFunction(StudentControllers.getRenewStudentStatistics)
);

router.get(
    '/admin/hr-report/trial-proportion-of-sale',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrrtp_view]),
    AsyncFunction(StudentControllers.getTrialProportionReport)
);

router.get(
    '/admin/hr-report/:sale_id/all-booking-trial-of-sale',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrrtp_view]),
    AsyncFunction(StudentControllers.getTrialBookingsOfSale)
);

router.get(
    '/admin/hr-report/:sale_id/all-trial-students-buy-main-package-of-sale',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrrtp_view]),
    AsyncFunction(StudentControllers.getAllTrialStudentBuyMainPackage)
);

export default router;
