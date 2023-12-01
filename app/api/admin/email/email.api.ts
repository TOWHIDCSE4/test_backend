import express from 'express';
import auth from '../../../auth/validate-request';
import AsyncFunction from '../../../core/async-handler';
import EmailControllers from '../../../controllers/email.controller';
import ValidationResult, {
    sendUnicastMailValidator,
    sendMulticastMailValidator
} from '../../../validator';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.post(
    '/admin/emails/unicast',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.srs_send_email]),
    sendUnicastMailValidator(),
    ValidationResult(),
    AsyncFunction(EmailControllers.sendOneSpecificEmail)
);

router.post(
    '/admin/emails/multicast-template',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.mem_send_email]),
    sendMulticastMailValidator(),
    ValidationResult(),
    AsyncFunction(EmailControllers.sendMulticastEmail)
);

export default router;
