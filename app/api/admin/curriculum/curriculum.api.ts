import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CurriculumControllers from '../../../controllers/curriculum.controller';
import ValidationResult, {
    createCurriculumValidator,
    editCurriculumValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/curriculums',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_view, PERMISSIONS.pmc2_view]),
    AsyncFunction(CurriculumControllers.getCurriculums)
);

router.get(
    '/admin/curriculums/course',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_update]),
    AsyncFunction(CurriculumControllers.getCoursesByCurriculumId)
);

router.get(
    '/admin/curriculums/dont-match-course',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_update]),
    AsyncFunction(CurriculumControllers.getCoursesDontMatchCurriculum)
);

router.post(
    '/admin/curriculums/update-course',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_update]),
    AsyncFunction(CurriculumControllers.updateCurriculumCouse)
);

router.post(
    '/admin/curriculums',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_create]),
    createCurriculumValidator(),
    ValidationResult(),
    AsyncFunction(CurriculumControllers.createCurriculum)
);

router.put(
    '/admin/curriculums/:curriculum_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_update]),
    editCurriculumValidator(),
    ValidationResult(),
    AsyncFunction(CurriculumControllers.editCurriculum)
);

router.delete(
    '/admin/curriculums/:curriculum_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pmc_delete]),
    AsyncFunction(CurriculumControllers.removeCurriculum)
);

export default router;
