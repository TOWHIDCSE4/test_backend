import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TeacherLevelControllers from '../../../controllers/teacher-level.controller';
import ValidationResult, {
    createTeacherLevelValidator,
    changeTeacherLevelValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/teacher-levels',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_view,
        PERMISSIONS.tpr_view,
        PERMISSIONS.artr_view,
        PERMISSIONS.arsr_view,
        PERMISSIONS.arlr_view,
        PERMISSIONS.satl_view
    ]),
    AsyncFunction(TeacherLevelControllers.getTeacherLevels)
);

router.post(
    '/admin/teacher-levels',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.satl_create]),
    createTeacherLevelValidator(),
    ValidationResult(),
    AsyncFunction(TeacherLevelControllers.createTeacherLevel)
);

router.put(
    '/admin/teacher-levels/:teacher_level_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.satl_update]),
    changeTeacherLevelValidator(),
    ValidationResult(),
    AsyncFunction(TeacherLevelControllers.editTeacherLevel)
);

router.delete(
    '/admin/teacher-levels/:teacher_level_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.satl_delete]),
    AsyncFunction(TeacherLevelControllers.deleteTeacherLevel)
);

export default router;
