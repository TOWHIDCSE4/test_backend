import { registerCsmValidator } from './../../../validator/index';
import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import UserControllers from '../../../controllers/user.controller';
import auth from '../../../auth/validate-request';
import { services } from '../../../const/services';
import ValidationResult from '../../../validator';
const router = express.Router();

router.post(
    '/users',
    registerCsmValidator(),
    ValidationResult(),
    auth.validateService(services.crm),
    AsyncFunction(UserControllers.createUserByCRM)
);

router.post(
    '/create-skype-link',
    ValidationResult(),
    auth.validateService(services.crm),
    AsyncFunction(UserControllers.createSkypeLink)
);

router.get(
    '/check-email-or-phone-number-exists',
    ValidationResult(),
    auth.validateService(services.crm),
    AsyncFunction(UserControllers.checkEmailOrPhoneNumberExists)
);

router.post(
    '/save-and-get-link-register-user',
    auth.validateService(services.crm),
    AsyncFunction(UserControllers.saveTemptAndGetLinkRegisterByCRM)
);

export default router;
