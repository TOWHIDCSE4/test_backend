import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TrialTeacherControllers from '../../../controllers/trial-teacher.controller';
import ValidationResult, { createTrialTeacher } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/teachers/trial-pool',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmctc_view, PERMISSIONS.ttp_view]),
    AsyncFunction(TrialTeacherControllers.getTrialTeacherProfiles)
);

router.post(
    '/admin/teachers/trial-pool',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ttp_create]),
    createTrialTeacher(),
    ValidationResult(),
    AsyncFunction(TrialTeacherControllers.createTrialTeacherProfile)
);

router.put(
    '/admin/teachers/trial-pool/:teacher_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ttp_update]),
    AsyncFunction(TrialTeacherControllers.editTrialTeacherProfile)
);

router.delete(
    '/admin/teachers/trial-pool/:teacher_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ttp_delete]),
    AsyncFunction(TrialTeacherControllers.removeTrialTeacherProfile)
);

router.get(
    '/admin/teachers/trial-pool/teachers',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ttp_view]),
    AsyncFunction(TrialTeacherControllers.getAllTeacherNotInTrialAndPaginated)
);

export default router;
