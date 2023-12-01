import { EnumRole } from '../models/department';
import { body } from 'express-validator';

export const createTeamValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Tên nhóm không được để rỗng')
            .not()
            .isEmpty()
            .withMessage('Tên nhóm không được để rỗng'),
        body('idDepartment')
            .exists()
            .withMessage('Phòng/ban không được để rỗng')
            .not()
            .isEmpty()
            .withMessage('Phòng/ban không được để rỗng')
    ];
};

export const updatePermissionOfDepartmentValidator = () => {
    return [
        body('role')
            .exists()
            .withMessage('Chức vụ không được để rỗng')
            .not()
            .isEmpty()
            .withMessage('Chức vụ không được để rỗng')
            .isIn([
                EnumRole.Leader,
                EnumRole.Manager,
                EnumRole.Deputy_manager,
                EnumRole.Staff
            ])
            .withMessage('Chức vụ sai'),
        body('permission')
            .exists()
            .withMessage('Quyền không được để rỗng')
            .isArray()
            .withMessage('Quyền không được để rỗng1')
    ];
};
