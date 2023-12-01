import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentLevelControllers from '../../../controllers/student-level.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/student-levels',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.sasl_view,
        PERMISSIONS.csmsm_view,
        PERMISSIONS.rcpr_view
    ]),
    AsyncFunction(StudentLevelControllers.getStudentLevels)
);

router.get(
    '/admin/student-levels/check-id',
    auth.validateToken(),
    AsyncFunction(StudentLevelControllers.checkStudentLevelId)
);

router.post(
    '/admin/student-levels',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sasl_create]),
    AsyncFunction(StudentLevelControllers.createStudentLevel)
);

router.put(
    '/admin/student-levels/:student_level_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sasl_update]),
    AsyncFunction(StudentLevelControllers.editStudentLevel)
);

router.delete(
    '/admin/student-levels/:student_level_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sasl_delete]),
    AsyncFunction(StudentLevelControllers.deleteStudentLevel)
);

export default router;
