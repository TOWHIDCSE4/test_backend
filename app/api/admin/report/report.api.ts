import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import ReportController from '../../../controllers/report.controller';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/report/claim/list',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmcr_view, PERMISSIONS.amcr_view]),
    AsyncFunction(ReportController.getReportListByAdmin)
);
router.get(
    '/admin/report/claim/find-staff-by-student',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmcr_view, PERMISSIONS.amcr_view]),
    AsyncFunction(ReportController.findStaffByStudent)
);

router.get(
    '/admin/report/claim/find-staff-by-teacher',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.csmcr_view, PERMISSIONS.amcr_view]),
    AsyncFunction(ReportController.findStaffByTeacher)
);

router.put(
    '/admin/report/claim/update/:id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.csmcr_update,
        PERMISSIONS.amcr_update,
        PERMISSIONS.t2scr_update
    ]),
    AsyncFunction(ReportController.updateReport)
);

router.delete(
    '/admin/report/claim/delete/:id',
    auth.validateToken(),
    AsyncFunction(ReportController.deleteReport)
);

router.post(
    '/admin/report/claim/create',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.csmcr_create,
        PERMISSIONS.amcr_update
    ]),
    AsyncFunction(ReportController.createReport)
);

export default router;
