import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import SubjectControllers from '../../../controllers/subject.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.get(
    '/subjects',
    auth.validateToken(),
    AsyncFunction(SubjectControllers.getSubjectsByClient)
);

export default router;
