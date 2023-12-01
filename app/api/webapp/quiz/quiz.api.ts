import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import QuizController from '../../../controllers/quiz.controller';
import auth from '../../../auth/validate-request';

const router = express.Router();

router.get(
    '/quiz/homeworks',
    auth.validateToken(),
    AsyncFunction(QuizController.getHomeworksByUser)
);

router.get(
    '/quiz/exams',
    auth.validateToken(),
    AsyncFunction(QuizController.getExamByUser)
);

router.get(
    '/homework/check-has-homework-v1',
    auth.validateToken(),
    AsyncFunction(QuizController.checkHasHomeworkV1)
);

export default router;
