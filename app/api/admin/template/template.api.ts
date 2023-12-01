import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TemplateControllers from '../../../controllers/template.controller';
import ValidationResult, {
    createTemplateValidator,
    updateTemplateValidator,
    removeTemplateValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/templates',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.mem_view, PERMISSIONS.met_view]),
    AsyncFunction(TemplateControllers.getTemplatesPaginated)
);

router.post(
    '/admin/templates',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.met_create]),
    createTemplateValidator(),
    ValidationResult(),
    AsyncFunction(TemplateControllers.createTemplate)
);

router.put(
    '/admin/templates/:_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.met_update]),
    updateTemplateValidator(),
    ValidationResult(),
    AsyncFunction(TemplateControllers.editTemplate)
);

router.delete(
    '/admin/templates/:_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.met_delete]),
    removeTemplateValidator(),
    ValidationResult(),
    AsyncFunction(TemplateControllers.removeTemplate)
);

router.get(
    '/admin/template-codes',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.met_create, PERMISSIONS.met_update]),
    AsyncFunction(TemplateControllers.getTemplateCodes)
);

router.get(
    '/admin/template-filters',
    auth.validateToken(),
    AsyncFunction(TemplateControllers.getTemplateFilters)
);

router.get(
    '/student/template-filters',
    auth.validateToken(),
    AsyncFunction(TemplateControllers.getTemplateStudentFilters)
);

router.get(
    '/student/all-template',
    auth.validateToken(),
    AsyncFunction(TemplateControllers.getAllTemplateByStudent)
);

export default router;
