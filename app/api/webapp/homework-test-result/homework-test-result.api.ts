import express from 'express';
import AsyncFunction from '../../../core/async-handler';
const router = express.Router();
import HomeworkTestResultControllers from '../../../controllers/homework-test-result.controller';
import CommentSuggestionControllers from '../../../controllers/comment-suggestion.controller';
import auth from '../../../auth/validate-request';
import { validateStatusUser } from '../../../validator';
import { services } from '../../../const/services';

router.get(
    '/student/homework/get-homework-test-result',
    auth.validateToken(),
    AsyncFunction(HomeworkTestResultControllers.getAllHomeworkTestResult)
);

router.post(
    '/student/homework/start-test',
    auth.validateToken(),
    validateStatusUser(),
    AsyncFunction(HomeworkTestResultControllers.startTest)
);

router.put(
    '/student/homework/update-test-result',
    auth.validateService(services.trialTest),
    AsyncFunction(HomeworkTestResultControllers.updateTestResult)
);

export default router;
