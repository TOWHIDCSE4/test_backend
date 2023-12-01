export enum RoleCode {
    SUPER_ADMIN = 0,
    STUDENT = 1,
    TEACHER = 2,
    ADMIN = 3,
    CONFIG_SYSTEM = 4,
    REPORT = 5
}

export const ROLES_ADMIN = {
    SUPERADMIN: 'SUPERADMIN',
    REPORT: 'REPORT',
    CONFIG_SYSTEM: 'CONFIG_SYSTEM'
};

export const roleDataSeed = [
    {
        code: 'SUPERADMIN',
        name: 'Quản trị viên cao cấp',
        canUpdate: false
    }
];

export const roleString = [
    {
        id: RoleCode.SUPER_ADMIN,
        role: 'admin'
    },
    {
        id: RoleCode.STUDENT,
        role: 'student'
    },
    {
        id: RoleCode.TEACHER,
        role: 'teacher'
    },
    {
        id: RoleCode.ADMIN,
        role: 'admin'
    }
];
