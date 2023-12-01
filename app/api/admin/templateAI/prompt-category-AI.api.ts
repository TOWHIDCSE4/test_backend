import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import PromptCategoryAIController from '../../../controllers/prompt-category-AI.controller';

const router = express.Router();

router.get(
    '/admin/prompt-category-AI/all',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tapcm,
        PERMISSIONS.tapcm_view,
        PERMISSIONS.arla_update
    ]),
    AsyncFunction(PromptCategoryAIController.getAllPromptCategoryPagination)
);

router.post(
    '/admin/prompt-category-AI',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tapcm_create]),
    ValidationResult(),
    AsyncFunction(PromptCategoryAIController.createPromptCategory)
);

router.put(
    '/admin/prompt-category-AI/:_idPromptCategory',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tapcm_update]),
    ValidationResult(),
    AsyncFunction(PromptCategoryAIController.updatePromptCategory)
);

router.delete(
    '/admin/prompt-category-AI/:_idPromptCategory',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tapcm_delete]),
    AsyncFunction(PromptCategoryAIController.deletePromptCategory)
);

export default router;
