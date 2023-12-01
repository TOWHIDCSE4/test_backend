const logger = require('dy-logger');
import CounterActions from '../../actions/counter';
import CourseActions from '../../actions/course';
import UserActions from '../../actions/user';
import StudentActions from '../../actions/student';
import TeacherActions from '../../actions/teacher';
import AdminActions from '../../actions/admin';
import DepartmentActions from '../../actions/department';
import PackageActions from '../../actions/package';
import SubjectActions from '../../actions/subject';
import TeacherLevelActions from '../../actions/teacher-level';
import LocationActions from '../../actions/location';
import Course, { CourseModel } from '../../models/course';
import User, { UserModel } from '../../models/user';
import Teacher from '../../models/teacher';
import Student from '../../models/student';
import Admin, { AdminModel } from '../../models/admin';
import Department, { DepartmentModel } from '../../models/department';
import Package, { PackageModel } from '../../models/package';
import { EnumRole } from '../../models/department';
import Subject, { SubjectModel } from '../../models/subject';
import TeacherLevel, { LocationRate } from '../../models/teacher-level';
import { CalendarModel } from '../../models/calendar';
import { BookingModel } from './../../models/booking';
import { TeacherRegularRequestModel } from '../../models/teacher-regular-request';
import { CommentSuggestionModel } from './../../models/comment-suggestion';
import { TrialTestIeltsResultModel } from './../../models/trial-test-ielts-result';
import { HomeworkTestResultModel } from './../../models/homework-test-result';
import { SkypeMeetingPoolModel } from './../../models/skype-meeting-pool';
import { CurriculumModel } from './../../models/curriculum';
import { StudentExtensionRequestModel } from './../../models/student-extension-request';
import { OrderedPackageModel } from './../../models/ordered-package';
import { CouponModel } from './../../models/coupon';
import { StudentReservationRequestModel } from './../../models/student-reservation-request';
import { ScheduledMemoModel } from './../../models/scheduled-memo';
import { ReportModel } from './../../models/report';
import { TeacherAbsentRequestModel } from './../../models/teacher-absent-request';
import { TeacherLevelModel } from './../../models/teacher-level';
import { TeamModel } from './../../models/team';
import { RegularCalendarModel } from './../../models/regular-calendar';
import { UnitModel } from './../../models/unit';
import { LocationModel } from './../../models/location';
import { OrderModel } from './../../models/order';
import { PromptTemplateAIModel } from '../../models/prompt-template-AI';
import { RoleCode } from '../../const/role';
import * as DefaultId from '../../const/default-id';
import { departments } from './data';
import { PERMISSIONS } from '../../const/permission';
import { CMSHamiaMeetPlusInfoModel } from '../../models/cms-hamia-meet-plus-info';
import { LearningAssessmentReportsModel } from '../../models/learning-assessment-reports';
import { AIReportResultModel } from '../../models/ai-report-result';
import { StudentLeaveRequestModel } from '../../models/student-leave-request';
export default class InitDb {
    public COUNTER_DEFAULT = {
        user_id: 1,
        admin_id: 1,
        calendar_id: 1,
        course_id: 1,
        booking_id: 1,
        subject_id: 1,
        package_id: 1,
        order_id: 1,
        location_id: 1,
        unit_id: 1,
        teacher_regular_request_id: 1,
        regular_calendar_id: 1,
        department_id: 1,
        team_id: 1,
        teacher_level_id: DefaultId.DEFAULT_TEACHER_LEVEL_ID,
        teacher_absent_request_id: 1,
        teacher_upgrade_request_id: 1,
        report_id: 1,
        scheduled_memo_id: 1,
        student_reservation_request_id: 1,
        coupon_id: 1,
        ordered_package_id: 1,
        student_extension_request_id: 1,
        curriculum_id: 1,
        suggestion_id: 1,
        trial_test_ielts_result_id: 1,
        homework_test_result_id: 1,
        prompt_template_id: 1,
        cms_hmp_info_id: 1,
        learning_assessment_reports_id: 1,
        ai_report_result_id: 1,
        student_leave_request_id: 1
    };

    public STUDENT_DEFAULT = {
        username: 'student.englishplus',
        email: 'student.englishplus@gmail.com',
        password: '123456',
        role: [RoleCode.STUDENT],
        is_active: true,
        is_verified_email: true,
        skype_account: 'ispeak.vn'
    };

    public TEACHER_DEFAULT = {
        username: 'teacher.englishplus',
        email: 'teacher.englishplus@gmail.com',
        password: '123456',
        role: [RoleCode.TEACHER],
        is_active: true,
        is_verified_email: true,
        skype_account: 'teacher_tester'
    };

    public ADMIN_DEFAULT = {
        username: 'admin',
        email: 'admin@gmail.com',
        password: 'admin123456',
        full_name: 'admin',
        canUpdate: false,
        role: [RoleCode.SUPER_ADMIN],
        is_active: true
    };

    public TEACHER_LEVEL_DEFAULT = {
        id: DefaultId.DEFAULT_TEACHER_LEVEL_ID,
        name: 'Starting Teacher',
        alias: 'startingteacher',
        is_active: true,
        hourly_rates: new Array<LocationRate>(),
        min_calendar_per_circle: 80,
        min_peak_time_per_circle: 70,
        max_missed_class_per_circle: 3,
        max_absent_request_per_circle: 2,
        class_accumulated_for_promotion: 500
    };

    public SUBJECT_DEFAULT = {
        id: DefaultId.DEFAULT_SUBJECT_ID,
        name: 'English',
        alias: 'english',
        slug: 'english',
        is_active: true
    };

    private TRIAL_COURSE_DEFAULT: any = {
        id: DefaultId.DEFAULT_TRIAL_COURSE_ID,
        name: 'Khóa Học Thử Cho Học Viên English Plus',
        alias: 'khoa-hoc-thu-cho-hoc-vien-english-plus',
        slug: 'khoa-hoc-thu-cho-hoc-vien-english-plus',
        image: 'https://class.ispeak.vn/uploads/2016/07/ispeak_square_160726105336.png',
        description: 'Dành cho các buổi học thử cho học viên',
        is_active: true,
        subject_id: DefaultId.DEFAULT_SUBJECT_ID,
        subject: null /* Add later when init */,
        package_id_list: [],
        packages: []
    };

    private LOCATION_DEFAULT: any = {
        id: this.COUNTER_DEFAULT.location_id,
        name: 'location test',
        currency: 'VND',
        weekend_bonus: 0,
        referral_bonus: 1,
        accept_time: 1,
        cancel_time: 1
    };

    private TRIAL_PACKAGE_DEFAULT: any = {
        id: DefaultId.DEFAULT_TRIAL_PACKAGE_ID,
        name: 'Buổi Học Thử EnglishPlus',
        alias: 'buoi-hoc-thu-english-plus',
        slug: 'buoi-hoc-thu-english-plus',
        description: 'Mỗi 1 học viên sẽ được học thử miễn phí 1 lần',
        image: 'https://api-dev.englishplus.vn/api/v1/st/ftp/uploads/1632539955096-kh.jpg',
        is_active: true,
        type: 3 /* trial */,
        subject_id: DefaultId.DEFAULT_SUBJECT_ID,
        subject: null /* Add later when init */,
        location_id: -1,
        location: null,
        price: 0,
        number_class: 1,
        day_of_use: 7,
        is_support: true
    };

    constructor() {
        this.InitCounter().then(() => {
            this.InitPermission();
            this.InitDepartment();
            this.InitTeacherLevel();
            this.InitLocation();
            this.InitSubject();
            this.InitTrialCourse();
            this.InitTrialPackage();
            this.InitUser();
            this.InitAdmin();
        });
    }
    private async InitCounter() {
        try {
            let check = await CounterActions.findOneToInit({});
            if (!check) {
                check = await CounterActions.create(this.COUNTER_DEFAULT);
            } else {
                const diff = {
                    ...this.COUNTER_DEFAULT
                };

                const userHasMaxId = await UserModel.findOne().sort({ id: -1 });
                if (userHasMaxId) {
                    diff.user_id = userHasMaxId.id + 1;
                }

                const adminHasMaxId = await AdminModel.findOne().sort({
                    id: -1
                });
                if (adminHasMaxId) {
                    diff.admin_id = adminHasMaxId.id + 1;
                }

                const calendarHasMaxId = await CalendarModel.findOne().sort({
                    id: -1
                });
                if (calendarHasMaxId) {
                    diff.calendar_id = calendarHasMaxId.id + 1;
                }

                const courseHasMaxId = await CourseModel.findOne().sort({
                    id: -1
                });
                if (courseHasMaxId) {
                    diff.course_id = courseHasMaxId.id + 1;
                }

                const bookingHasMaxId = await BookingModel.findOne().sort({
                    id: -1
                });
                if (bookingHasMaxId) {
                    diff.booking_id = bookingHasMaxId.id + 1;
                }

                const subjectHasMaxId = await SubjectModel.findOne().sort({
                    id: -1
                });
                if (subjectHasMaxId) {
                    diff.subject_id = subjectHasMaxId.id + 1;
                }

                const packageHasMaxId = await PackageModel.findOne().sort({
                    id: -1
                });
                if (packageHasMaxId) {
                    diff.package_id = packageHasMaxId.id + 1;
                }

                const orderHasMaxId = await OrderModel.findOne().sort({
                    id: -1
                });
                if (orderHasMaxId) {
                    diff.order_id = orderHasMaxId.id + 1;
                }

                const locationHasMaxId = await LocationModel.findOne().sort({
                    id: -1
                });
                if (locationHasMaxId) {
                    diff.location_id = locationHasMaxId.id + 1;
                }

                const unitHasMaxId = await UnitModel.findOne().sort({ id: -1 });
                if (unitHasMaxId) {
                    diff.unit_id = unitHasMaxId.id + 1;
                }

                const teacherRegularRequestHasMaxId =
                    await TeacherRegularRequestModel.findOne().sort({ id: -1 });
                if (teacherRegularRequestHasMaxId) {
                    diff.teacher_regular_request_id =
                        teacherRegularRequestHasMaxId.id + 1;
                }

                const regularCalendarHasMaxId =
                    await RegularCalendarModel.findOne().sort({ id: -1 });
                if (regularCalendarHasMaxId) {
                    diff.regular_calendar_id = regularCalendarHasMaxId.id + 1;
                }

                const departmentHasMaxId = await DepartmentModel.findOne().sort(
                    { id: -1 }
                );
                if (departmentHasMaxId) {
                    diff.department_id = departmentHasMaxId.id + 1;
                }

                const teamHasMaxId = await TeamModel.findOne().sort({ id: -1 });
                if (teamHasMaxId) {
                    diff.team_id = teamHasMaxId.id + 1;
                }

                const teacherLevelHasMaxId =
                    await TeacherLevelModel.findOne().sort({ id: -1 });
                if (teacherLevelHasMaxId) {
                    diff.teacher_level_id = teacherLevelHasMaxId.id + 1;
                }

                const teacherAbsentRequestHasMaxId =
                    await TeacherAbsentRequestModel.findOne().sort({ id: -1 });
                if (teacherAbsentRequestHasMaxId) {
                    diff.teacher_absent_request_id =
                        teacherAbsentRequestHasMaxId.id + 1;
                }

                const reportHasMaxId = await ReportModel.findOne().sort({
                    id: -1
                });
                if (reportHasMaxId) {
                    diff.report_id = reportHasMaxId.id + 1;
                }

                const scheduledMemoHasMaxId =
                    await ScheduledMemoModel.findOne().sort({ id: -1 });
                if (scheduledMemoHasMaxId) {
                    diff.scheduled_memo_id = scheduledMemoHasMaxId.id + 1;
                }

                const studentReservationRequestHasMaxId =
                    await StudentReservationRequestModel.findOne().sort({
                        id: -1
                    });
                if (studentReservationRequestHasMaxId) {
                    diff.student_reservation_request_id =
                        studentReservationRequestHasMaxId.id + 1;
                }

                const couponHasMaxId = await CouponModel.findOne().sort({
                    id: -1
                });
                if (couponHasMaxId) {
                    diff.coupon_id = couponHasMaxId.id + 1;
                }

                const orderedPackageHasMaxId =
                    await OrderedPackageModel.findOne().sort({ id: -1 });
                if (orderedPackageHasMaxId) {
                    diff.ordered_package_id = orderedPackageHasMaxId.id + 1;
                }

                const studentExtensionRequestHasMaxId =
                    await StudentExtensionRequestModel.findOne().sort({
                        id: -1
                    });
                if (studentExtensionRequestHasMaxId) {
                    diff.student_extension_request_id =
                        studentExtensionRequestHasMaxId.id + 1;
                }

                const curriculumHasMaxId = await CurriculumModel.findOne().sort(
                    { id: -1 }
                );
                if (curriculumHasMaxId) {
                    diff.curriculum_id = curriculumHasMaxId.id + 1;
                }

                const commentSuggestionHasMaxId =
                    await CommentSuggestionModel.findOne().sort({ id: -1 });
                if (commentSuggestionHasMaxId) {
                    diff.suggestion_id = commentSuggestionHasMaxId.id + 1;
                }

                const trialTestIeltsResultId =
                    await TrialTestIeltsResultModel.findOne().sort({ id: -1 });
                if (trialTestIeltsResultId) {
                    diff.trial_test_ielts_result_id =
                        trialTestIeltsResultId.id + 1;
                }

                const homeworkTestResultId =
                    await HomeworkTestResultModel.findOne().sort({ id: -1 });
                if (homeworkTestResultId) {
                    diff.homework_test_result_id = homeworkTestResultId.id + 1;
                }

                const promptTemplateId =
                    await PromptTemplateAIModel.findOne().sort({ id: -1 });
                if (promptTemplateId) {
                    diff.prompt_template_id = promptTemplateId.id + 1;
                }

                const cmsHMPInfoId =
                    await CMSHamiaMeetPlusInfoModel.findOne().sort({ id: -1 });
                if (cmsHMPInfoId) {
                    diff.cms_hmp_info_id = cmsHMPInfoId.id + 1;
                }

                const learningAssessmentReportsId =
                    await LearningAssessmentReportsModel.findOne().sort({
                        id: -1
                    });
                if (learningAssessmentReportsId) {
                    diff.learning_assessment_reports_id =
                        learningAssessmentReportsId.id + 1;
                }

                const aiReportResultId =
                    await AIReportResultModel.findOne().sort({ id: -1 });
                if (aiReportResultId) {
                    diff.ai_report_result_id = aiReportResultId.id + 1;
                }

                const studentLeaveRequestId =
                    await StudentLeaveRequestModel.findOne().sort({ id: -1 });
                if (studentLeaveRequestId) {
                    diff.student_leave_request_id =
                        studentLeaveRequestId.id + 1;
                }
                check = await CounterActions.update(check._id, diff);
            }

            // update counter
        } catch (e) {
            logger.error('Error initCounter', e);
        }
    }

    private async InitPermission() {
        const data = Object.values(PERMISSIONS);
        await DepartmentModel.findOneAndUpdate({ id: 1 }, [
            {
                $set: {
                    'permissionOfMember.manager': data,
                    'permissionOfMember.deputy_manager': data,
                    'permissionOfMember.leader': data,
                    'permissionOfMember.staff': data,
                    updatedAt: Date.now()
                }
            }
        ]).exec();
    }

    private async InitDepartment() {
        for (const department of departments) {
            const found = await DepartmentActions.findOne({
                filter: {
                    id: department.id
                }
            });
            if (found) continue;
            await DepartmentActions.create({
                ...department
            } as unknown as Department);
        }
        const departmentAdmin = await DepartmentActions.findOne({
            filter: { id: 1 }
        });
        const admin = await AdminActions.findOne({ username: 'admin' });
        if (admin) {
            await AdminActions.update(admin._id, {
                department: {
                    department: departmentAdmin?._id,
                    isRole: EnumRole.Manager
                }
            } as any);
        }
    }

    private async InitUser() {
        try {
            // Student Default
            let check = await UserActions.findOne({
                email: this.STUDENT_DEFAULT.email
            });
            if (!check) {
                const counter = await CounterActions.findOne({});
                if (counter) {
                    const user_id = counter.user_id;
                    const user = await UserActions.create({
                        id: user_id,
                        username: this.STUDENT_DEFAULT.username,
                        email: this.STUDENT_DEFAULT.email,
                        password: this.STUDENT_DEFAULT.password,
                        role: this.STUDENT_DEFAULT.role,
                        is_active: this.STUDENT_DEFAULT.is_active,
                        is_verified_email:
                            this.STUDENT_DEFAULT.is_verified_email,
                        first_name: 'Student',
                        last_name: 'Tester',
                        full_name: 'Student Tester'
                    } as User);
                    const check_student = await StudentActions.findOne({
                        user_id: user.id
                    });
                    if (!check_student) {
                        await StudentActions.create({
                            user_id: user_id
                        } as Student);
                    }
                }
            }
            // Teacher Default
            check = await UserActions.findOne({
                email: this.TEACHER_DEFAULT.email
            });

            if (!check) {
                const counter = await CounterActions.findOne({});
                if (counter) {
                    const user_id = counter.user_id;
                    const user = await UserActions.create({
                        id: user_id,
                        username: this.TEACHER_DEFAULT.username,
                        email: this.TEACHER_DEFAULT.email,
                        password: this.TEACHER_DEFAULT.password,
                        role: this.TEACHER_DEFAULT.role,
                        is_active: this.TEACHER_DEFAULT.is_active,
                        is_verified_email:
                            this.TEACHER_DEFAULT.is_verified_email,
                        first_name: 'Teacher',
                        last_name: 'Tester',
                        full_name: 'Teacher Tester'
                    } as User);
                    const check_teacher = await TeacherActions.findOne({
                        user_id: user.id
                    });
                    if (!check_teacher) {
                        const location = await LocationActions.findOne({
                            id: this.COUNTER_DEFAULT.location_id
                        });
                        const level = await TeacherLevelActions.findOne({
                            id: this.COUNTER_DEFAULT.teacher_level_id
                        });
                        await TeacherActions.create({
                            user_id: user_id,
                            location_id: this.COUNTER_DEFAULT.location_id,
                            location: location && location._id,
                            teacher_level_id:
                                this.COUNTER_DEFAULT.teacher_level_id,
                            level: level && level._id,
                            hourly_rate: 10,
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                full_name: user.full_name,
                                is_active: true
                            } as any
                        } as Teacher);
                    }
                }
            }
        } catch (e) {
            logger.error('Error InitUser', e);
        }
    }

    private async InitAdmin() {
        try {
            const check = await AdminActions.findOne({
                username: this.ADMIN_DEFAULT.username
            });
            const permissions = Object.values(PERMISSIONS);
            if (!check) {
                const counter = await CounterActions.findOne({});
                if (counter) {
                    const admin_id = counter.admin_id;
                    await AdminActions.create({
                        id: admin_id,
                        username: this.ADMIN_DEFAULT.username,
                        password: this.ADMIN_DEFAULT.password,
                        is_active: this.ADMIN_DEFAULT.is_active,
                        fullname: this.ADMIN_DEFAULT.full_name,
                        canUpdate: this.ADMIN_DEFAULT.canUpdate,
                        permissions: permissions
                        // role: this.ADMIN_DEFAULT.role
                    } as Admin);
                }
            } else {
                check.permissions = permissions;
                await check.save();
            }
        } catch (e) {
            logger.error('Error InitAdmin', e);
        }
    }

    public async InitTeacherLevel() {
        try {
            const check = await TeacherLevelActions.findOne({
                id: DefaultId.DEFAULT_TEACHER_LEVEL_ID
            });
            if (!check) {
                const counter = await CounterActions.findOne();
                if (counter) {
                    await TeacherLevelActions.create({
                        ...this.TEACHER_LEVEL_DEFAULT
                    } as TeacherLevel);
                }
            }
        } catch (e) {
            logger.info('Error InitTeacherLevel: ', e);
        }
    }

    public async InitLocation() {
        try {
            const check = await LocationActions.findOne({
                id: this.LOCATION_DEFAULT.id
            });
            if (!check) {
                const counter = await CounterActions.findOne();
                if (counter) {
                    await LocationActions.create({
                        ...this.LOCATION_DEFAULT
                    } as any);
                }
            }
        } catch (e) {
            logger.info('Error InitTeacherLevel: ', e);
        }
    }

    public async InitSubject() {
        try {
            const check = await SubjectActions.findOne({
                id: DefaultId.DEFAULT_SUBJECT_ID
            });
            if (!check) {
                const alias_check = await SubjectActions.findOne({
                    alias: this.SUBJECT_DEFAULT.alias
                });
                if (alias_check) {
                    throw 'Error with default subject alias';
                }
                const counter = await CounterActions.findOne();
                if (counter) {
                    await SubjectActions.create({
                        ...this.SUBJECT_DEFAULT
                    } as Subject);
                }
            }
        } catch (e) {
            logger.info('Error InitSubject: ', e);
        }
    }

    public async InitTrialCourse() {
        try {
            const check = await CourseActions.findOne({
                id: DefaultId.DEFAULT_TRIAL_COURSE_ID
            });
            if (!check) {
                const alias_check = await CourseActions.findOne({
                    alias: this.TRIAL_COURSE_DEFAULT.alias
                });
                if (alias_check) {
                    throw 'Error with default trial course alias';
                }
                const counter = await CounterActions.findOne();
                const trial_course = this.TRIAL_COURSE_DEFAULT;
                const subject = await SubjectActions.findOne({
                    id: DefaultId.DEFAULT_SUBJECT_ID
                });
                trial_course.subject = subject;
                if (counter && subject) {
                    await CourseActions.create({
                        ...trial_course,
                        id: 0,
                        name: 'Unknow',
                        alias: 'unknow',
                        slug: 'unknow',
                        image: 'https://class.ispeak.vn/uploads/2016/07/ispeak_square_160726105336.png',
                        description: 'unknow'
                    } as Course);
                    await CourseActions.create({
                        ...trial_course
                    } as Course);
                } else {
                    throw 'Error with counter or subject';
                }
            }
        } catch (e) {
            logger.info('Error InitTrialCourse: ', e);
        }
    }

    public async InitTrialPackage() {
        try {
            const check = await PackageActions.findOne({
                id: DefaultId.DEFAULT_TRIAL_PACKAGE_ID
            });
            if (!check) {
                const alias_check = await PackageActions.findOne({
                    alias: this.TRIAL_PACKAGE_DEFAULT.alias
                });
                if (alias_check) {
                    throw 'Error with default trial course alias';
                }
                const counter = await CounterActions.findOne();
                const trial_package = this.TRIAL_PACKAGE_DEFAULT;
                const subject = await SubjectActions.findOne({
                    id: DefaultId.DEFAULT_SUBJECT_ID
                });
                trial_package.subject = subject;
                if (counter && subject) {
                    await PackageActions.create({
                        ...trial_package,
                        id: 0,
                        name: 'unknow',
                        alias: 'unknow',
                        slug: 'unknow',
                        description: 'unknow'
                    } as Package);
                    await PackageActions.create({
                        ...trial_package
                    } as Package);
                } else {
                    throw 'Error with counter or subject';
                }
            }
        } catch (e) {
            logger.info('Error InitTrialPackage: ', e);
        }
    }
}
