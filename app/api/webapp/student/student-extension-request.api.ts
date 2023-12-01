import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import StudentExtensionRequestControllers from '../../../controllers/student-extension-request.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    newStudentExtensionRequestValidator
} from '../../../validator';

const router = express.Router();

router.get(
    '/student/extension-requests',
    auth.validateToken(),
    AsyncFunction(
        StudentExtensionRequestControllers.getExtensionRequestsByStudent
    )
);

router.get(
    '/student/extension-requests/cost-preview',
    auth.validateToken(),
    AsyncFunction(StudentExtensionRequestControllers.getExtensionCostPreview)
);

router.post(
    '/student/extension-requests',
    auth.validateToken(),
    newStudentExtensionRequestValidator(),
    ValidationResult(),
    AsyncFunction(StudentExtensionRequestControllers.createExtensionRequest)
);

export default router;
