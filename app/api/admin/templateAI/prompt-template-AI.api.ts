import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import PromptTemplateAIController from '../../../controllers/prompt-template-AI.controller';

const router = express.Router();

router.get(
    '/admin/prompt-template-AI/all',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.taptm,
        PERMISSIONS.taptm_view,
        PERMISSIONS.tmmm_create_memo_ai,
        PERMISSIONS.arla_update
    ]),
    AsyncFunction(PromptTemplateAIController.getAllPromptTemplatePagination)
);

router.post(
    '/admin/prompt-template-AI',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taptm_create]),
    ValidationResult(),
    AsyncFunction(PromptTemplateAIController.createPromptTemplate)
);

router.put(
    '/admin/prompt-template-AI/:_idPromptTemplate',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taptm_update]),
    ValidationResult(),
    AsyncFunction(PromptTemplateAIController.updatePromptTemplate)
);

router.delete(
    '/admin/prompt-template-AI/:_idPromptTemplate',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.taptm_delete]),
    AsyncFunction(PromptTemplateAIController.deletePromptTemplate)
);

export default router;
