import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CommentSuggestionControllers from '../../../controllers/comment-suggestion.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    newCommentSuggestionValidator
} from '../../../validator';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/comment-suggestions',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sacs_view]),
    AsyncFunction(CommentSuggestionControllers.getCommentSuggestionBanksByAdmin)
);

router.get(
    '/admin/comment-suggestion',
    auth.validateToken(),
    AsyncFunction(CommentSuggestionControllers.getCommentSuggestionForAdmin)
);

router.post(
    '/admin/comment-suggestions',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sacs_create]),
    newCommentSuggestionValidator(),
    ValidationResult(),
    AsyncFunction(CommentSuggestionControllers.createSuggestion)
);

router.put(
    '/admin/comment-suggestions/:suggestion_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sacs_update]),
    AsyncFunction(CommentSuggestionControllers.editSuggestion)
);

router.delete(
    '/admin/comment-suggestions/:suggestion_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sacs_delete]),
    AsyncFunction(CommentSuggestionControllers.removeComment)
);

export default router;
