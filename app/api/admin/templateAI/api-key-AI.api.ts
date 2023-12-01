import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import ApiKeyAIController from '../../../controllers/api-key-AI.controller';

const router = express.Router();

router.get(
    '/admin/api-key-AI/all',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taakm, PERMISSIONS.taakm_view]),
    AsyncFunction(ApiKeyAIController.getAllApiKeyPagination)
);

router.post(
    '/admin/api-key-AI',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taakm_create]),
    ValidationResult(),
    AsyncFunction(ApiKeyAIController.createApiKey)
);

router.post(
    '/admin/api-key-AI/reload-balance',
    auth.validateToken(),
    AsyncFunction(ApiKeyAIController.reloadBalance)
);

router.put(
    '/admin/api-key-AI/:_idApiKey',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taakm_update]),
    ValidationResult(),
    AsyncFunction(ApiKeyAIController.updateApiKey)
);

router.delete(
    '/admin/api-key-AI/:_idApiKey',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taakm_delete]),
    AsyncFunction(ApiKeyAIController.deleteApiKey)
);

export default router;
