import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import UserControllers from '../../../controllers/user.controller';
import ValidationResult, { sendMailValidator } from '../../../validator';
const router = express.Router();

router.get('/user/verify-email', AsyncFunction(UserControllers.verifyEmail));

router.post(
    '/user/resend-verify-email',
    sendMailValidator(),
    ValidationResult(),
    AsyncFunction(UserControllers.resendVerifyUrl)
);

export default router;
