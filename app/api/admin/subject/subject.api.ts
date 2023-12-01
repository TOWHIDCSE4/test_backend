import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import SubjectControllers from '../../../controllers/subject.controller';
import ValidationResult, { subjectValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/subjects',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.pmp_view,
        PERMISSIONS.pmc2_view,
        PERMISSIONS.pms_view
    ]),
    AsyncFunction(SubjectControllers.getSubjectsByAdmin)
);

router.post(
    '/admin/subjects',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pms_create]),
    subjectValidator(),
    ValidationResult(),
    AsyncFunction(SubjectControllers.createSubject)
);

router.put(
    '/admin/subjects/:id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pms_update]),
    subjectValidator(),
    ValidationResult(),
    AsyncFunction(SubjectControllers.editSubject)
);

router.delete(
    '/admin/subjects/:id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.pms_delete]),
    AsyncFunction(SubjectControllers.removeSubject)
);

export default router;
