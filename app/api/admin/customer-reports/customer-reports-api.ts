import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CustomerReportController from '../../../controllers/customer-report.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/customer-report/attendance',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrncr_view]),
    AsyncFunction(CustomerReportController.attendanceReport)
);

router.get(
    '/admin/customer-report/booking',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrncr_view]),
    AsyncFunction(CustomerReportController.bookingReport)
);

router.get(
    '/admin/customer-report/expire-soon',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrncr_view]),
    AsyncFunction(CustomerReportController.getExpireSoonClass)
);

router.get(
    '/admin/customer-report/export-expire-soon',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrncr_export_excel]),
    AsyncFunction(CustomerReportController.exportExpireSoonClass)
);

router.get(
    '/admin/customer-report/birthday',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrbr_view]),
    AsyncFunction(CustomerReportController.getStudentBirthdays)
);

router.get(
    '/admin/customer-report/new-student',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrncr_view]),
    AsyncFunction(CustomerReportController.getNewStudentInMonth)
);

router.get(
    '/admin/customer-report/renew',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrrn_view]),
    AsyncFunction(CustomerReportController.getReNew)
);

router.post(
    '/admin/customer-report/renew',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csrrn_caculate]),
    AsyncFunction(CustomerReportController.caculateReNewByAdmin)
);

router.get(
    '/admin/customer-report/list-expired-student-not-renew',
    auth.validateToken(),
    AsyncFunction(CustomerReportController.getListExpiredStudentNotRenew)
);

export default router;
