import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentExtensionRequestControllers from '../../../controllers/student-extension-request.controller';
import ValidationResult, {
    changeStudentExtensionRequestValidator,
    newStudentExtensionRequestValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/student/extension-requests',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmer_view]),
    AsyncFunction(
        StudentExtensionRequestControllers.getAllStudentExtensionRequestsByAdmin
    )
);

router.put(
    '/admin/student/extension-requests/:request_id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmer_approve,
        PERMISSIONS.tmer_reject
    ]),
    changeStudentExtensionRequestValidator(),
    ValidationResult(),
    AsyncFunction(
        StudentExtensionRequestControllers.editExtensionRequestByAdmin
    )
);

router.get(
    '/admin/extension-requests/cost-preview',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmer_create]),
    AsyncFunction(StudentExtensionRequestControllers.getExtensionCostPreview)
);

router.post(
    '/admin/extension-requests',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmer_create,
        PERMISSIONS.tmer_create_pro
    ]),
    newStudentExtensionRequestValidator(),
    AsyncFunction(StudentExtensionRequestControllers.createExtensionRequest)
);

export default router;
