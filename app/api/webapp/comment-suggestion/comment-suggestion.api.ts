import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';

import CommentSuggestionControllers from '../../../controllers/comment-suggestion.controller';

const router = express.Router();

router.get(
    '/teacher/comment-suggestion',
    auth.validateToken(),
    AsyncFunction(CommentSuggestionControllers.getCommentSuggestionForTeacher)
);

router.get(
    '/teacher/comment-suggestions',
    auth.validateToken(),
    AsyncFunction(CommentSuggestionControllers.getCommentSuggestionsForTeacher)
);

export default router;
