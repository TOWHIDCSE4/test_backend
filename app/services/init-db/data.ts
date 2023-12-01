import { CODE_DEPARTMENT } from '../../const/department';

export const memoSuggestions = [
    {
        id: 1,
        key: 'discipline',
        valuevi:
            '[' +
            '"Học sinh thường xuyên mất trật tự, nói tự do, gây rối trong lớp học ảnh hưởng đến các học viên khác"' +
            ',' +
            '"Học sinh hay vi phạm 1-2 qui tắc lớp học và gây rối"' +
            ',' +
            '"Học sinh thi thoảng vi phạm 1-2 qui tắc lớp học"' +
            ',' +
            '"Học sinh ngoan ngoãn, nghiêm túc chấp hành kỷ luật lớp học"' +
            ',' +
            '"Học sinh hoàn toàn giữ kỉ luật tốt trong buổi học và không để giáo viên phải nhắc nhở lần nào"' +
            ']',
        valueen:
            '[' +
            '"Students are always nosiy, talk freely, make a mess in class, affecting other students"' +
            ',' +
            '"Students always break 1 -2 class rules and desrupt in class"' +
            ',' +
            '"Students sometimes break the class rules"' +
            ',' +
            '"Students are obedient, follow the class descipline well"' +
            ',' +
            '"Students are completely follow descipline without teachers\' reminder"' +
            ']'
    },
    {
        id: 2,
        key: 'interaction',
        valuevi:
            '[' +
            '"Học sinh từ chối tham gia mọi hoạt động học tập"' +
            ',' +
            '"Học sinh hiếm khi tham gia hoạt động học"' +
            ',' +
            '"Học sinh tham gia hầu hết nhưng chưa nhiệt tình"' +
            ',' +
            '"Học sinh xung phong tham gia các hoạt động học 1 cách hăng hái"' +
            ',' +
            '"Học sinh tham gia hăng hái và hầu như luôn có kết quả tốt"' +
            ']',
        valueen:
            '[' +
            '"Students refuse to join all class activities"' +
            ',' +
            '"Students seldomly join class activities"' +
            ',' +
            '"Students take part in almost all activites, however they are not enthusiastic"' +
            ',' +
            '"Students volunteer to take part in all the activities enthusiastically"' +
            ',' +
            '"Students enthusiastically join activities and get great results"' +
            ']'
    },
    {
        id: 3,
        key: 'attention',
        valuevi:
            '[' +
            '"Học sinh không tập trung và làm việc riêng"' +
            ',' +
            '"Học sinh hay mất tập trung làm việc riêng"' +
            ',' +
            '"Học sinh có cố gắng tập trung nhưng đôi khi xao nhãng"' +
            ',' +
            '"Học sinh tập trung nghe giảng và làm bài tập khi được giao"' +
            ',' +
            '"Học sinh tập trung nghe giảng và thực hiện đúng theo các hướng dẫn của giáo viên suốt cả tiết học"' +
            ']',
        valueen:
            '[' +
            '"Students are not focused on lessons and do their own work"' +
            ',' +
            '"Students always lose attention"' +
            ',' +
            '"Students try to focus but sometimes they lose concentration"' +
            ',' +
            '"Students are focused on  listening to teachers and do exercises"' +
            ',' +
            '"Students are focused on  listening to teachers and follow teachers\' instructions during classtime"' +
            ']'
    }
];

export const departments = [
    {
        id: 1,
        name: 'Admin',
        description: 'Quản trị hệ thống phần mềm',
        canUpdateManager: false,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.ADMIN,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    },
    {
        id: 2,
        name: 'Phòng CSKH',
        description: 'Phòng CSKH',
        canUpdateManager: true,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.CSKH,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    },
    {
        id: 3,
        name: 'Phòng Học thuật',
        description: 'Phòng Học thuật',
        canUpdateManager: true,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.HOC_THUAT,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    },
    {
        id: 4,
        name: 'Phòng Sale1',
        description: 'Phòng Sale1',
        canUpdateManager: true,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.SALE1,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    },
    {
        id: 5,
        name: 'Phòng Sale2',
        description: 'Phòng Sale2',
        canUpdateManager: true,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.SALE2,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    },
    {
        id: 6,
        name: 'Phòng Sale3',
        description: 'Phòng Sale3',
        canUpdateManager: true,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.SALE3,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    },
    {
        id: 7,
        name: 'Phòng IT',
        description: 'Phòng IT',
        canUpdateManager: true,
        canDelete: false,
        unsignedName: CODE_DEPARTMENT.IT,
        permissionOfMember: {
            manager: [],
            deputy_manager: [],
            leader: [],
            staff: []
        }
    }
];
