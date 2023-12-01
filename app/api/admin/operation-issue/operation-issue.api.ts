import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import OperationIssueControllers from '../../../controllers/operation-issue.controller';
import ValidationResult from '../../../validator';
import auth from '../../../auth/validate-request';

const router = express.Router();

router.put(
    '/admin/mark-operation-by-id',
    auth.validateToken(),
    ValidationResult(),
    AsyncFunction(OperationIssueControllers.markOperationById)
);

router.get(
    '/admin/staff-name-by-ids',
    auth.validateToken(),
    AsyncFunction(OperationIssueControllers.getStaffNameByIds)
);

export default router;
