export const ADMIN_FEATURE = {
    GOI_SAN_PHAM: 1,
    PHONG_BAN: 2,
    QUOC_TICH: 3,
    NGUOI_DUNG: 14,
    NHOM: 15
};

const actions = {
    view: 'View',
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    approve: 'Approve',
    reject: 'Reject',
    clone: 'Clone',
    viewDetail: 'View detail',
    savePdf: 'Save pdf',
    watchVideo: 'Watch video',
    updateStatus: 'Update status',
    updateUnit: 'Update unit',
    updateTime: 'Update time',
    updateNote: 'Update note',
    joinMeeting: 'Join meeting',
    bestMemo: 'Best memo',
    createMemoAI: 'Create memo AI',
    markPaid: 'Mark paid',
    editRegular: 'Edit regular',
    adminView: 'Admin view',
    exportExcel: 'Export excel',
    sendEmail: 'Send email',
    createBooking: 'Create booking',
    createTrial: 'Create trial',
    createOrder: 'Create order',
    addQuestion: 'Add question',
    updateSupporter: 'Update supporter',
    caculate: 'Caculate',
    edit: 'Edit',
    libtestCreator: 'Libtest creator',
    exportStudentList: 'Export student list',
    addLinkSkype: 'Add Link Skype',
    addLinkHMP: 'Add Link HMP',
    screenConfig: 'Screen Setting',
    createExtensionPro: 'Create Extension Pro',
    deleteOrderedPackage: 'Delete Ordered Package',
    stopOrderedPackage: 'Stop Ordered Package',
    assignManager: 'Assign to Academic Manager',
    assignAcademic: 'Assign to Academic staff',
    addLearningAssessmentReport: 'Add learning assessment report',
    toggleLockUnit: 'Unlock/Lock Unit',
};

export const PERMISSIONS = {
    // Teaching Management
    tm: 'tm',
    // Teaching Management - Overview
    tmo: 'tmo',
    tmo_view: 'tmo_view',
    tmo_view_detail: 'tmo_view_detail',
    tmo_watch_video: 'tmo_watch_video',
    tmo_update_status: 'tmo_update_status',
    tmo_update_unit: 'tmo_update_unit',
    tmo_update_time: 'tmo_update_time',
    tmo_update_note: 'tmo_update_note',
    tmo_join_meeting: 'tmo_join_meeting',
    tmo_add_link_hmp: 'tmo_add_link_hmp',
    tmo_toggle_lock_unit: 'tmo_toggle_lock_unit',
    // Teaching Management - Create standard class
    tmcsc: 'tmcsc',
    tmcsc_view: 'tmcsc_view',
    tmcsc_create: 'tmcsc_create',
    // Teaching Management - Create trial class
    tmctc: 'tmctc',
    tmctc_view: 'tmctc_view',
    tmctc_create: 'tmctc_create',
    // Teaching Management - Create ielts class
    tmcic: 'tmcic',
    tmcic_view: 'tmcic_view',
    tmcic_create: 'tmcic_create',
    // Teaching Management - Memo management
    tmmm: 'tmmm',
    tmmm_view: 'tmmm_view',
    tmmm_update: 'tmmm_update',
    tmmm_best_memo: 'tmmm_best_memo',
    tmmm_create_memo_ai: 'tmmm_create_memo_ai',
    // Teaching Management - Exam history
    tmeh: 'tmeh',
    tmeh_view: 'tmeh_view',
    tmeh_view_detail: 'tmeh_view_detail',
    // Teaching Management - Homework history
    tmhh: 'tmhh',
    tmhh_view: 'tmhh_view',
    tmhh_view_detail: 'tmhh_view_detail',
    // Teaching Management Self-Study V2 - History
    ssv2h: 'ssv2h',
    ssv2h_view: 'ssv2h_view',
    // Teaching Management - Class Video
    tmcv: 'tmcv',
    tmcv_view: 'tmcv_view',
    // Teaching Management - Reservation requests
    tmrr: 'tmrr',
    tmrr_view: 'tmrr_view',
    tmrr_create: 'tmrr_create',
    tmrr_delete: 'tmrr_delete',
    tmrr_save_pdf: 'tmrr_save_pdf',
    tmrr_approve: 'tmrr_approve',
    tmrr_reject: 'tmrr_reject',
    tmrr_mark_paid: 'tmrr_mark_paid',
    // Teaching Management - Extension requests
    tmer: 'tmer',
    tmer_view: 'tmer_view',
    tmer_create: 'tmer_create',
    tmer_approve: 'tmer_approve',
    tmer_reject: 'tmer_reject',
    tmer_create_pro: 'tmer_create_pro',

    // Automatic Scheduling
    as: 'as',
    // Automatic Scheduling - Automatic Scheduling Management
    asasm: 'asasm',
    asasm_view: 'asasm_view',
    asasm_update: 'asasm_update',
    asasm_delete: 'asasm_delete',
    asasm_clone: 'asasm_clone',
    // Automatic Scheduling - Create Automatic Scheduling
    ascas: 'ascas',
    ascas_view: 'ascas_view',
    ascas_create: 'ascas_create',
    // Automatic Scheduling - merge package
    asmp: 'asmp',
    asmp_view: 'asmp_view',
    asmp_create: 'asmp_create',
    asmp_delete: 'asmp_delete',

    // Teachers
    t: 't',
    // Teachers - All teacher
    tat: 'tat',
    tat_view: 'tat_view',
    tat_create: 'tat_create',
    tat_export_excel: 'tat_export_excel',
    tat_update: 'tat_update',
    tat_edit_regular: 'tat_edit_regular',
    tat_admin_view: 'tat_admin_view',
    // Teachers - Teacher schedule
    tts2: 'tts2',
    tts2_view: 'tts2_view',
    // Teachers - Trial Pool
    ttp: 'ttp',
    ttp_view: 'ttp_view',
    ttp_create: 'ttp_create',
    ttp_update: 'ttp_update',
    ttp_delete: 'ttp_delete',
    // Teachers - Teacher Salary
    tts: 'tts',
    tts_view: 'tts_view',
    tts_caculate: 'tts_caculate',
    tts_export_excel: 'tts_export_excel',
    tts_mark_paid: 'tts_mark_paid',
    // Teachers - Upgrade Request
    tur: 'tur',
    tur_view: 'tur_view',
    tur_create: 'tur_create',
    tur_update: 'tur_update',
    // Teachers - Teacher Referral
    ttr: 'ttr',
    ttr_view: 'ttr_view',
    // Teachers - Pending Register
    tpr: 'tpr',
    tpr_view: 'tpr_view',
    tpr_approve: 'tpr_approve',
    tpr_reject: 'tpr_reject',
    // Teachers - Regular Request
    trr: 'trr',
    trr_view: 'trr_view',
    trr_approve: 'trr_approve',
    trr_reject: 'trr_reject',
    // Teachers - Leave/Absent Request
    tlr: 'tlr',
    tlr_view: 'tlr_view',
    tlr_update: 'tlr_update',

    // Students
    s: 's',
    // Students - Regular Students
    srs: 'srs',
    srs_view: 'srs_view',
    srs_create: 'srs_create',
    srs_update: 'srs_update',
    srs_edit_regular: 'srs_edit_regular',
    srs_send_email: 'srs_send_email',
    srs_admin_view: 'srs_admin_view',
    // Students - Trial Students
    sts: 'sts',
    sts_view: 'sts_view',
    // Students - All Students
    sas: 'sas',
    sas_view: 'sas_view',
    sas_create: 'sas_create',
    sas_update: 'sas_update',
    sas_edit_regular: 'sas_edit_regular',
    sas_admin_view: 'sas_admin_view',
    sas_add_link_skype: 'sas_add_link_skype',
    // Students - Expire Soon
    ses: 'ses',
    ses_view: 'ses_view',
    // Students - Course Analytics
    sca: 'sca',
    sca_view: 'sca_view',
    // Students - Monthly Analytics
    sma: 'sma',
    sma_view: 'sma_view',
    // Students - Students Wallet
    ssw: 'ssw',
    ssw_view: 'ssw_view',
    ssw_view_detail: 'ssw_view_detail',
    // Student - Leave Request
    slr: 'slr',
    slr_view: 'slr_view',
    slr_create: 'slr_create',
    slr_delete: 'slr_delete',
    slr_screen_config: 'slr_screen_config',

    // AI reports
    air: 'air',
    // AI reports - Report Generate
    airrg: 'airrg',
    airrg_view: 'airrg_view',
    airrg_create: 'airrg_create',

    // AI reports - Report Results
    airrr: 'airrr',
    airrr_view: 'airrr_view',
    airrr_create: 'airrr_create',
    airrr_update: 'airrr_update',
    airrr_delete: 'airrr_delete',

    // Customer Support Management
    csm: 'csm',
    // Customer Support Management - Dashboard
    csmd: 'csmd',
    csmd_view: 'csmd_view',
    // Customer Support Management - Student Management
    csmsm: 'csmsm',
    csmsm_view: 'csmsm_view',
    csmsm_update: 'csmsm_update',
    csmsm_export_excel: 'csmsm_export_excel',
    csmsm_update_supporter: 'csmsm_update_supporter',
    csmsm_export_student_list: 'csmsm_export_student_list',
    // Customer Support Management - Claim Recommendations
    csmcr: 'csmcr',
    csmcr_view: 'csmcr_view',
    csmcr_update: 'csmcr_update',
    csmcr_create: 'csmcr_create',
    csmcr_export_excel: 'csmcr_export_excel',
    // Customer Support Management - Regular Calendar Status
    csmrcs: 'csmrcs',
    csmrcs_view: 'csmrcs_view',
    csmrcs_create_booking: 'csmrcs_create_booking',
    // Customer Support Management - Lesson statistics
    csmls: 'csmls',
    csmls_view: 'csmls_view',
    csmls_export_excel: 'csmls_export_excel',

    // Regular Care
    rc: 'rc',
    // Regular Care - Dashboard
    rcd: 'rcd',
    rcd_view: 'rcd_view',
    // Regular Care - Greeting Call
    rcgc: 'rcgc',
    rcgc_view: 'rcgc_view',
    rcgc_update: 'rcgc_update',
    // Regular Care - Checking Call
    rccc: 'rccc',
    rccc_view: 'rccc_view',
    rccc_update: 'rccc_update',
    // Regular Care - Observation
    rco: 'rco',
    rco_view: 'rco_view',
    rco_update: 'rco_update',
    rco_delete: 'rco_delete',
    rco_export: 'rco_export',
    // Regular Care - Upcoming Test
    rcut: 'rcut',
    rcut_view: 'rcut_view',
    rcut_update: 'rcut_update',
    // Regular Care - Regular Test
    rcrt: 'rcrt',
    rcrt_view: 'rcrt_view',
    rcrt_update: 'rcrt_update',
    // Regular Care - Test Reports
    rctr: 'rctr',
    rctr_view: 'rctr_view',
    rctr_update: 'rctr_update',

    // Regular Care - Periodic Reports
    rcpr: 'rcpr',
    rcpr_view: 'rcpr_view',
    rcpr_update: 'rcpr_update',
    rcpr_delete: 'rcpr_delete',
    rcpr_assign_manager: 'rcpr_assign_manager',
    rcpr_assign_academic: 'rcpr_assign_academic',
    rcpr_add_report: 'rcpr_add_report',

    // Sale Management
    sm: 'sm',
    // Sale Management - Trial Booking
    smtb: 'smtb',
    smtb_view: 'smtb_view',
    smtb_export_excel: 'smtb_export_excel',

    // Academic Management
    am: 'am',
    // Academic Management - Claim Recommendations
    amcr: 'amcr',
    amcr_view: 'amcr_view',
    amcr_update: 'amcr_update',
    // Academic Management - Trial Booking
    amtb: 'amtb',
    amtb_view: 'amtb_view',
    amtb_export_excel: 'amtb_export_excel',
    // Academic Management - Library test management
    amltm: 'amltm',
    amltm_view: 'amltm_view',
    amltm_edit: 'amltm_edit',

    // Academic Management - Trial Test Ielts Result
    amttir: 'amttir',
    amttir_view: 'amttir_view',
    amttir_edit: 'amttir_edit',

    // Advice Letter
    al: 'al',
    // Advice Letter - All Advice Letter
    alaal_view: 'alaal_view',
    alaal_create: 'alaal_create',
    alaal_edit: 'alaal_edit',
    alaal_delete: 'alaal_delete',
    alaal_change_status: 'alaal_change_status',

    // Wallet Management
    wm: 'wm',
    // Wallet Management - Deposit Management
    wmdm: 'wmdm',
    wmdm_view: 'wmdm_view',
    wmdm_approve: 'wmdm_approve',
    wmdm_reject: 'wmdm_reject',

    // Order Management
    om: 'om',
    // Order Management - All Orders
    omao: 'omao',
    omao_view: 'omao_view',
    omao_update: 'omao_update',
    omao_create_trial: 'omao_create_trial',
    // delete order package
    omao_op_delete: 'omao_op_delete',
    omao_op_stop: 'omao_op_stop',
    // Order Management - Pre Orders
    ompo: 'ompo',
    ompo_view: 'ompo_view',
    ompo_update: 'ompo_update',
    ompo_create_order: 'ompo_create_order',
    ompo_approve: 'ompo_approve',
    ompo_reject: 'ompo_reject',
    ompo_remove: 'ompo_remove',

    // Package Management
    pm: 'pm',
    // Package Management - Packages
    pmp: 'pmp',
    pmp_view: 'pmp_view',
    pmp_create: 'pmp_create',
    pmp_update: 'pmp_update',
    pmp_delete: 'pmp_delete',
    // Package Management - Curriculums
    pmc: 'pmc',
    pmc_view: 'pmc_view',
    pmc_create: 'pmc_create',
    pmc_update: 'pmc_update',
    pmc_delete: 'pmc_delete',
    // Package Management - Courses
    pmc2: 'pmc2',
    pmc2_view: 'pmc2_view',
    pmc2_create: 'pmc2_create',
    pmc2_update: 'pmc2_update',
    pmc2_delete: 'pmc2_delete',
    // Package Management - Units
    pmu: 'pmu',
    pmu_view: 'pmu_view',
    pmu_create: 'pmu_create',
    pmu_update: 'pmu_update',
    pmu_delete: 'pmu_delete',
    // Package Management - Subject
    pms: 'pms',
    pms_view: 'pms_view',
    pms_create: 'pms_create',
    pms_update: 'pms_update',
    pms_delete: 'pms_delete',

    // Quiz Management
    qm: 'qm',
    // Quiz Management - Quiz Management
    qmqm: 'qmqm',
    qmqm_view: 'qmqm_view',
    qmqm_create: 'qmqm_create',
    qmqm_update: 'qmqm_update',
    qmqm_add_question: 'qmqm_add_question',
    // Quiz Management - Question Management
    qmqm2: 'qmqm2',
    qmqm2_view: 'qmqm2_view',
    qmqm2_create: 'qmqm2_create',
    qmqm2_update: 'qmqm2_update',
    // Quiz Management - History
    qmh: 'qmh',
    qmh_view: 'qmh_view',

    // CMS
    cms: 'cms',
    // CMS - Page Management
    cmsp: 'cmsp',
    cmsp_view: 'cmsp_view',
    cmsp_create: 'cmsp_create',
    cmsp_update: 'cmsp_update',
    cmsp_delete: 'cmsp_delete',
    // CMS - Post
    cmsp2: 'cmsp2',
    cmsp2_view: 'cmsp2_view',
    cmsp2_create: 'cmsp2_create',
    cmsp2_update: 'cmsp2_update',
    cmsp2_delete: 'cmsp2_delete',
    // CMS - Category
    cmsc: 'cmsc',
    cmsc_view: 'cmsc_view',
    cmsc_create: 'cmsc_create',
    cmsc_update: 'cmsc_update',
    cmsc_delete: 'cmsc_delete',
    // CMS - Tag
    cmst: 'cmst',
    cmst_view: 'cmst_view',
    cmst_create: 'cmst_create',
    cmst_update: 'cmst_update',
    cmst_delete: 'cmst_delete',

    // Marketing
    m: 'm',
    // Marketing - Email Marketing
    mem: 'mem',
    mem_view: 'mem_view',
    mem_send_email: 'mem_send_email',
    // Marketing - Email Template
    met: 'met',
    met_view: 'met_view',
    met_create: 'met_create',
    met_update: 'met_update',
    met_delete: 'met_delete',
    // Marketing - Coupons
    mc: 'mc',
    mc_view: 'mc_view',
    mc_create: 'mc_create',
    mc_update: 'mc_update',
    mc_delete: 'mc_delete',
    // Marketing - Marketing Inbox
    mmi: 'mmi',
    mmi_view: 'mmi_view',

    // Ticket
    t2: 't2',
    // Ticket - Student Class Report
    t2scr: 't2scr',
    t2scr_view: 't2scr_view',
    t2scr_update: 't2scr_update',

    // Customer Support Report
    csr: 'csr',
    // Customer Support Report - New Student Report
    csrnsr: 'csrnsr',
    csrnsr_view: 'crnsr_view',
    // Customer Support Report - Attendence Report
    csrar: 'csrar',
    csrar_view: 'csrar_view',
    // Customer Support Report - Claim
    csrc: 'csrc',
    csrc_view: 'csrc_view',
    // Customer Support Report - Test Report
    csrtr: 'csrtr',
    csrtr_view: 'csrtr_view',
    // Customer Support Report - Birthday Report
    csrbr: 'csrbr',
    csrbr_view: 'csrbr_view',
    // Customer Support Report - 'Number Class Report
    csrncr: 'csrncr',
    csrncr_view: 'csrncr_view',
    csrncr_export_excel: 'csrncr_export_excel',
    // Customer Support Report - renew
    csrrn: 'csrrn',
    csrrn_view: 'csrrn_view',
    csrrn_caculate: 'csrrn_caculate',

    // Customer Support Report - List Expired Student Not Renew
    csrles: 'csrles',
    csrles_view: 'csrles_view',
    csrles_export_excel: 'csrles_export_excel',

    // Academic Report
    ar: 'ar',
    // Academic Report - Teacher Report
    artr: 'artr',
    artr_view: 'artr_view',
    // Academic Report - Schedule Report
    arsr: 'arsr',
    arsr_view: 'arsr_view',
    // Academic Report - Class Report
    arcr: 'arcr',
    arcr_view: 'arcr_view',
    // Academic Report - Trial Report
    artr2: 'artr2',
    artr2_view: 'artr2_view',
    // Academic Report - Leave Report
    arlr: 'arlr',
    arlr_view: 'arlr_view',
    // Academic Report - Performance Report
    arpr2: ' arpr2',
    arpr2_view: 'arpr2_view',
    // Academic Report - Renew
    arrn: ' arpr2',
    arrn_view: 'arrn_view',
    arrn_export_excel: 'arrn_export_excel',
    // Academic Report - Learning Assessment Report
    arla: 'arlr',
    arla_view: 'arla_view',
    arla_create: 'arla_create',
    arla_update: 'arla_update',
    arla_update_note: 'arla_update_note',
    arla_update_status: 'arla_update_status',
    arla_delete: 'arla_delete',

    // HR Report
    hrr: 'hrr',
    // HR Report - Trial Proportion
    hrrtp: 'hrrtp',
    hrrtp_view: 'hrrtp_view',
    // Zalo Report - Zalo Interact
    zlrzi: ' zlrzi',
    zlrzi_view: 'zlrzi_view',
    // HRM
    hrm: 'hrm',
    // HRM - User Management
    hrmum: 'hrmum',
    hrmum_view: 'hrmum_view',
    hrmum_create: 'hrmum_create',
    hrmum_update: 'hrmum_update',
    hrmum_delete: 'hrmum_delete',
    // HRM - Role Management
    hrmrm: 'hrmrm',
    hrmrm_view: 'hrmrm_view',
    hrmrm_create: 'hrmrm_create',
    hrmrm_update: 'hrmrm_update',
    hrmrm_delete: 'hrmrm_delete',
    // HRM - Team Management
    hrmtm: 'hrmtm',
    hrmtm_view: 'hrmtm_view',
    hrmtm_create: 'hrmtm_create',
    hrmtm_update: 'hrmtm_update',
    hrmtm_delete: 'hrmtm_delete',

    // System Admin
    sa: 'sa',
    // System Admin- Template AI - API Key Management
    taakm: 'taakm',
    taakm_view: 'taakm_view',
    taakm_update: 'taakm_update',
    taakm_create: 'taakm_create',
    taakm_delete: 'taakm_delete',
    // System Admin- Template AI - Prompt Category Management
    tapcm: 'tapcm',
    tapcm_view: 'tapcm_view',
    tapcm_update: 'tapcm_update',
    tapcm_create: 'tapcm_create',
    tapcm_delete: 'tapcm_delete',
    // System Admin - Template AI - Prompt Template Management
    taptm: 'taptm',
    taptm_view: 'taptm_view',
    taptm_update: 'taptm_update',
    taptm_create: 'taptm_create',
    taptm_delete: 'taptm_delete',
    // System Admin - Logs
    sal: 'sal',
    sal_view: 'sal_view',
    // System Admin - Comment Suggestion
    sacs: 'sacs',
    sacs_view: 'sacs_view',
    sacs_create: 'sacs_create',
    sacs_update: 'sacs_update',
    sacs_delete: 'sacs_delete',
    // System Admin - Teacher Level
    satl: 'satl',
    satl_view: 'satl_view',
    satl_create: 'satl_create',
    satl_update: 'satl_update',
    satl_delete: 'satl_delete',
    // System Admin - Student Level
    sasl: 'sasl',
    sasl_view: 'sasl_view',
    sasl_create: 'sasl_create',
    sasl_update: 'sasl_update',
    sasl_delete: 'sasl_delete',
    // System Admin - Teacher Location
    satl2: 'satl2',
    satl2_view: 'satl2_view',
    satl2_create: 'satl2_create',
    satl2_update: 'satl2_update',
    // System Admin - Event Notice
    saen: 'saen',
    saen_view: 'saen_view',
    saen_create: 'saen_create',
    saen_update: 'saen_update',
    saen_delete: 'saen_delete',
    // System Admin - Cron Jobs
    sacr: 'sacr',
    sacr_view: 'sacr_view'
};

export const LIST_PERMISSIONS = [
    {
        name: 'Teaching Management',
        childs: [
            {
                name: 'Overview',
                key: PERMISSIONS.tmo,
                permissions: [
                    {
                        key: PERMISSIONS.tmo_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmo_view_detail,
                        name: actions.viewDetail
                    },
                    {
                        key: PERMISSIONS.tmo_watch_video,
                        name: actions.watchVideo
                    },
                    {
                        key: PERMISSIONS.tmo_update_status,
                        name: actions.updateStatus
                    },
                    {
                        key: PERMISSIONS.tmo_update_unit,
                        name: actions.updateUnit
                    },
                    {
                        key: PERMISSIONS.tmo_update_time,
                        name: actions.updateTime
                    },
                    {
                        key: PERMISSIONS.tmo_update_note,
                        name: actions.updateNote
                    },
                    {
                        key: PERMISSIONS.tmo_join_meeting,
                        name: actions.joinMeeting
                    },
                    {
                        key: PERMISSIONS.tmo_add_link_hmp,
                        name: actions.addLinkHMP
                    },
                    {
                        key: PERMISSIONS.tmo_toggle_lock_unit,
                        name: actions.toggleLockUnit
                    }
                ]
            },
            {
                name: 'Create standard class',
                permissions: [
                    {
                        key: PERMISSIONS.tmcsc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmcsc_create,
                        name: actions.create
                    }
                ],
                key: PERMISSIONS.tmcsc
            },
            {
                name: 'Create trial class',
                permissions: [
                    {
                        key: PERMISSIONS.tmctc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmctc_create,
                        name: actions.create
                    }
                ],
                key: PERMISSIONS.tmctc
            },
            {
                name: 'Create ielts class',
                permissions: [
                    {
                        key: PERMISSIONS.tmcic_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmcic_create,
                        name: actions.create
                    }
                ],
                key: PERMISSIONS.tmcic
            },
            {
                name: 'Memo management',
                permissions: [
                    {
                        key: PERMISSIONS.tmmm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmmm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.tmmm_best_memo,
                        name: actions.bestMemo
                    },
                    {
                        key: PERMISSIONS.tmmm_create_memo_ai,
                        name: actions.createMemoAI
                    }
                ],
                key: PERMISSIONS.tmmm
            },
            {
                name: 'Exam history',
                permissions: [
                    {
                        key: PERMISSIONS.tmeh_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmeh_view_detail,
                        name: actions.viewDetail
                    }
                ],
                key: PERMISSIONS.tmeh
            },
            // {
            //     name: 'Homework history',
            //     permissions: [
            //         {
            //             key: PERMISSIONS.tmhh_view,
            //             name: actions.view
            //         },
            //         {
            //             key: PERMISSIONS.tmhh_view_detail,
            //             name: actions.viewDetail
            //         }
            //     ],
            //     key: PERMISSIONS.tmhh
            // },
            {
                name: 'Self-Study V1 History',
                permissions: [
                    {
                        key: PERMISSIONS.qmh_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.qmh
            },
            {
                name: 'Self-Study V2 History',
                permissions: [
                    {
                        key: PERMISSIONS.ssv2h_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.ssv2h
            },
            {
                name: 'Class Video',
                permissions: [
                    {
                        key: PERMISSIONS.tmcv_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.tmcv
            },
            {
                name: 'Reservation requests',
                permissions: [
                    {
                        key: PERMISSIONS.tmrr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmrr_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.tmrr_delete,
                        name: actions.delete
                    },
                    {
                        key: PERMISSIONS.tmrr_save_pdf,
                        name: actions.savePdf
                    },
                    {
                        key: PERMISSIONS.tmrr_approve,
                        name: actions.approve
                    },
                    {
                        key: PERMISSIONS.tmrr_reject,
                        name: actions.reject
                    },
                    {
                        key: PERMISSIONS.tmrr_mark_paid,
                        name: 'Mark paid'
                    }
                ],
                key: PERMISSIONS.tmrr
            },
            {
                name: 'Extension requests',
                permissions: [
                    {
                        key: PERMISSIONS.tmer_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tmer_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.tmer_approve,
                        name: actions.approve
                    },
                    {
                        key: PERMISSIONS.tmer_reject,
                        name: actions.reject
                    },
                    {
                        key: PERMISSIONS.tmer_create_pro,
                        name: actions.createExtensionPro
                    }
                ],
                key: PERMISSIONS.tmer
            }
        ]
    },
    {
        name: 'Automatic Scheduling',
        childs: [
            {
                name: 'Automatic Scheduling Management',
                permissions: [
                    {
                        key: PERMISSIONS.asasm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.asasm_update,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.asasm_delete,
                        name: actions.delete
                    },
                    {
                        key: PERMISSIONS.asasm_clone,
                        name: actions.clone
                    }
                ],
                key: PERMISSIONS.asasm
            },
            {
                name: 'Create Automatic Scheduling',
                permissions: [
                    {
                        key: PERMISSIONS.ascas_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.ascas_create,
                        name: actions.create
                    }
                ],
                key: PERMISSIONS.ascas
            },
            {
                name: 'Merge Package',
                permissions: [
                    {
                        key: PERMISSIONS.asmp_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.asmp_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.asmp_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.asmp
            }
        ]
    },
    {
        name: 'Teachers',
        childs: [
            {
                name: 'All teacher',
                permissions: [
                    {
                        key: PERMISSIONS.tat_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tat_export_excel,
                        name: actions.exportExcel
                    },
                    {
                        key: PERMISSIONS.tat_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.tat_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.tat_edit_regular,
                        name: actions.editRegular
                    },
                    {
                        key: PERMISSIONS.tat_admin_view,
                        name: actions.adminView
                    }
                ],
                key: PERMISSIONS.tat
            },
            {
                name: 'Teacher Schedules',
                permissions: [
                    {
                        key: PERMISSIONS.tts2_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.tts2
            },
            {
                name: 'Trial Pool',
                permissions: [
                    {
                        key: PERMISSIONS.ttp_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.ttp_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.ttp_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.ttp_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.ttp
            },
            {
                name: 'Teacher Salary',
                permissions: [
                    {
                        key: PERMISSIONS.tts_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tts_caculate,
                        name: actions.caculate
                    },
                    {
                        key: PERMISSIONS.tts_export_excel,
                        name: actions.exportExcel
                    },
                    {
                        key: PERMISSIONS.tts_mark_paid,
                        name: actions.markPaid
                    }
                ],
                key: PERMISSIONS.tts
            },
            {
                name: 'Upgrade Request',
                permissions: [
                    {
                        key: PERMISSIONS.tur_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tur_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.tur_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.tur
            },
            {
                name: 'Teacher Referral',
                permissions: [
                    {
                        key: PERMISSIONS.ttr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.ttr
            },
            {
                name: 'Pending Register',
                permissions: [
                    {
                        key: PERMISSIONS.tpr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tpr_approve,
                        name: actions.approve
                    },
                    {
                        key: PERMISSIONS.tpr_reject,
                        name: actions.reject
                    }
                ],
                key: PERMISSIONS.tpr
            },
            {
                name: 'Regular Request',
                permissions: [
                    {
                        key: PERMISSIONS.trr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.trr_approve,
                        name: actions.approve
                    },
                    {
                        key: PERMISSIONS.trr_reject,
                        name: actions.reject
                    }
                ],
                key: PERMISSIONS.trr
            },
            {
                name: 'Leave/Absent Request',
                permissions: [
                    {
                        key: PERMISSIONS.tlr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tlr_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.tlr
            }
        ]
    },
    {
        name: 'Students',
        childs: [
            {
                name: 'Regular Students',
                permissions: [
                    {
                        key: PERMISSIONS.srs_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.srs_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.srs_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.srs_edit_regular,
                        name: actions.editRegular
                    },
                    {
                        key: PERMISSIONS.srs_send_email,
                        name: actions.sendEmail
                    },
                    {
                        key: PERMISSIONS.srs_admin_view,
                        name: actions.adminView
                    }
                ],
                key: PERMISSIONS.srs
            },
            {
                name: 'Trial Students',
                permissions: [
                    {
                        key: PERMISSIONS.sts_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.sts
            },
            {
                name: 'All Students',
                permissions: [
                    {
                        key: PERMISSIONS.sas_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.sas_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.sas_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.sas_edit_regular,
                        name: actions.editRegular
                    },
                    {
                        key: PERMISSIONS.sas_admin_view,
                        name: actions.adminView
                    },
                    {
                        key: PERMISSIONS.sas_add_link_skype,
                        name: actions.addLinkSkype
                    }
                ],
                key: PERMISSIONS.sas
            },
            {
                name: 'Expire Soon',
                permissions: [
                    {
                        key: PERMISSIONS.ses_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.ses
            },
            {
                name: 'Course Analytics',
                permissions: [
                    {
                        key: PERMISSIONS.sca_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.sca
            },
            {
                name: 'Monthly Analytics',
                permissions: [
                    {
                        key: PERMISSIONS.sma_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.sma
            },
            {
                name: 'Students Wallet',
                permissions: [
                    {
                        key: PERMISSIONS.ssw_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.ssw_view_detail,
                        name: actions.viewDetail
                    }
                ],
                key: PERMISSIONS.ssw
            },
            {
                name: 'Leave Request',
                permissions: [
                    {
                        key: PERMISSIONS.slr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.slr_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.slr_delete,
                        name: actions.delete
                    },
                    {
                        key: PERMISSIONS.slr_screen_config,
                        name: actions.screenConfig
                    }
                ],
                key: PERMISSIONS.slr
            }
        ]
    },
    {
        name: 'AI Reports',
        childs: [
            {
                name: 'Report Generate',
                permissions: [
                    {
                        key: PERMISSIONS.airrg_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.airrg_create,
                        name: actions.create
                    }
                ],
                key: PERMISSIONS.airrg
            },
            {
                name: 'Report Results',
                permissions: [
                    {
                        key: PERMISSIONS.airrr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.airrr_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.airrr_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.airrr_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.slr
            }
        ]
    },
    {
        name: 'Customer Support Management',
        childs: [
            // {
            //     name: 'Dashboard',
            //     permissions: [
            //         {
            //             key: PERMISSIONS.csmd_view,
            //             name: actions.view
            //         }
            //     ],
            //     key: PERMISSIONS.csmd
            // },
            {
                name: 'Student Management',
                permissions: [
                    {
                        key: PERMISSIONS.csmsm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csmsm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.csmsm_export_excel,
                        name: actions.exportExcel
                    },
                    {
                        key: PERMISSIONS.csmsm_update_supporter,
                        name: actions.updateSupporter
                    },
                    {
                        key: PERMISSIONS.csmsm_export_student_list,
                        name: actions.exportStudentList
                    }
                ],
                key: PERMISSIONS.csmsm
            },
            {
                name: 'Claim Recommendations',
                permissions: [
                    {
                        key: PERMISSIONS.csmcr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csmcr_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.csmcr_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.csmcr_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.csmcr
            },
            {
                name: 'Regular Calendar Status',
                permissions: [
                    {
                        key: PERMISSIONS.csmrcs_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csmrcs_create_booking,
                        name: actions.createBooking
                    }
                ],
                key: PERMISSIONS.csmrcs
            },
            {
                name: 'Lesson statistics',
                permissions: [
                    {
                        key: PERMISSIONS.csmls_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csmls_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.csmls
            }
        ]
    },
    {
        name: 'Regular Care',
        childs: [
            {
                name: 'Dashboard',
                permissions: [
                    {
                        key: PERMISSIONS.rcd_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.rcd
            },
            {
                name: 'Greeting Call',
                permissions: [
                    {
                        key: PERMISSIONS.rcgc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rcgc_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.rcgc
            },
            {
                name: 'Checking Call',
                permissions: [
                    {
                        key: PERMISSIONS.rccc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rccc_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.rccc
            },
            {
                name: 'Observation List',
                permissions: [
                    {
                        key: PERMISSIONS.rco_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rco_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.rco_delete,
                        name: actions.delete
                    },
                    {
                        key: PERMISSIONS.rco_export,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.rccc
            },
            {
                name: 'Upcoming Test',
                permissions: [
                    {
                        key: PERMISSIONS.rcut_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rcut_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.rcut
            },
            {
                name: 'Regular Test',
                permissions: [
                    {
                        key: PERMISSIONS.rcrt_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rcrt_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.rcrt
            },
            {
                name: 'Test Reports',
                permissions: [
                    {
                        key: PERMISSIONS.rctr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rctr_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.rctr
            },
            {
                name: 'Period Reports',
                permissions: [
                    {
                        key: PERMISSIONS.rcpr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.rcpr_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.rcpr_delete,
                        name: actions.delete
                    },
                    {
                        key: PERMISSIONS.rcpr_assign_manager,
                        name: actions.assignManager
                    },
                    {
                        key: PERMISSIONS.rcpr_assign_academic,
                        name: actions.assignAcademic
                    },
                    {
                        key: PERMISSIONS.rcpr_add_report,
                        name: actions.addLearningAssessmentReport
                    }
                ],
                key: PERMISSIONS.rcpr
            }
        ]
    },
    {
        name: 'Sale Management',
        childs: [
            {
                name: 'Trial Booking',
                permissions: [
                    {
                        key: PERMISSIONS.smtb_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.smtb_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.smtb
            }
        ]
    },
    {
        name: 'Academic Management',
        childs: [
            {
                name: 'Claim Recommendations',
                permissions: [
                    {
                        key: PERMISSIONS.amcr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.amcr_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.amcr
            },
            {
                name: 'Trial Booking',
                permissions: [
                    {
                        key: PERMISSIONS.amtb_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.amtb_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.amtb
            },
            {
                name: 'Library Test Management',
                permissions: [
                    {
                        key: PERMISSIONS.amltm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.amltm_edit,
                        name: actions.edit
                    }
                ],
                key: PERMISSIONS.amltm
            },
            {
                name: 'Trial Test Ielts Result',
                permissions: [
                    {
                        key: PERMISSIONS.amttir_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.amttir_edit,
                        name: actions.edit
                    }
                ],
                key: PERMISSIONS.amttir
            }
        ]
    },
    {
        name: 'Advice Letter',
        childs: [
            {
                name: 'All Advice Letter',
                permissions: [
                    {
                        key: PERMISSIONS.alaal_view,
                        name: actions.view
                    }
                ]
            },
            {
                name: 'Create Advice Letter',
                permissions: [
                    {
                        key: PERMISSIONS.alaal_create,
                        name: actions.create
                    }
                ]
            },
            {
                name: 'Edit Advice Letter',
                permissions: [
                    {
                        key: PERMISSIONS.alaal_edit,
                        name: actions.edit
                    }
                ]
            },
            {
                name: 'Delete Advice Letter',
                permissions: [
                    {
                        key: PERMISSIONS.alaal_delete,
                        name: actions.delete
                    }
                ]
            },
            {
                name: 'Change status Advice Letter',
                permissions: [
                    {
                        key: PERMISSIONS.alaal_change_status,
                        name: actions.updateStatus
                    }
                ]
            }
        ]
    },
    {
        name: 'Wallet Management',
        childs: [
            {
                name: 'Deposit Management',
                permissions: [
                    {
                        key: PERMISSIONS.wmdm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.wmdm_approve,
                        name: actions.approve
                    },
                    {
                        key: PERMISSIONS.wmdm_reject,
                        name: actions.reject
                    }
                ],
                key: PERMISSIONS.wmdm
            }
        ]
    },
    {
        name: 'Order Management',
        childs: [
            {
                name: 'All Orders',
                permissions: [
                    {
                        key: PERMISSIONS.omao_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.omao_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.omao_create_trial,
                        name: actions.createTrial
                    },
                    {
                        key: PERMISSIONS.omao_op_delete,
                        name: actions.deleteOrderedPackage
                    },
                    {
                        key: PERMISSIONS.omao_op_stop,
                        name: actions.stopOrderedPackage
                    }
                ],
                key: PERMISSIONS.omao
            },
            {
                name: 'Pre Orders',
                permissions: [
                    {
                        key: PERMISSIONS.ompo_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.ompo_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.ompo_create_order,
                        name: actions.createOrder
                    },
                    {
                        key: PERMISSIONS.ompo_approve,
                        name: actions.approve
                    },
                    {
                        key: PERMISSIONS.ompo_reject,
                        name: actions.reject
                    },
                    {
                        key: PERMISSIONS.ompo_remove,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.ompo
            }
        ]
    },
    {
        name: 'Package Management',
        childs: [
            {
                name: 'Packages',
                permissions: [
                    {
                        key: PERMISSIONS.pmp_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.pmp_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.pmp_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.pmp_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.pmp
            },
            {
                name: 'Curriculums',
                permissions: [
                    {
                        key: PERMISSIONS.pmc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.pmc_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.pmc_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.pmc_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.pmc
            },
            {
                name: 'Courses',
                permissions: [
                    {
                        key: PERMISSIONS.pmc2_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.pmc2_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.pmc2_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.pmc2_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.pmc2
            },
            {
                name: 'Units',
                permissions: [
                    {
                        key: PERMISSIONS.pmu_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.pmu_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.pmu_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.pmu_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.pmu
            },
            {
                name: 'Subject',
                permissions: [
                    {
                        key: PERMISSIONS.pms_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.pms_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.pms_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.pms_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.pms
            }
        ]
    },
    {
        name: 'Quiz Management',
        childs: [
            {
                name: 'Quiz Management',
                permissions: [
                    {
                        key: PERMISSIONS.qmqm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.qmqm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.qmqm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.qmqm_add_question,
                        name: actions.addQuestion
                    }
                ],
                key: PERMISSIONS.qmqm
            },
            {
                name: 'Question Management',
                permissions: [
                    {
                        key: PERMISSIONS.qmqm2_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.qmqm2_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.qmqm2_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.qmqm2
            }
        ]
    },
    {
        name: 'CMS',
        childs: [
            {
                name: 'Page Management',
                permissions: [
                    {
                        key: PERMISSIONS.cmsp_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.cmsp_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.cmsp_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.cmsp_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.cmsp
            },
            {
                name: 'Post',
                permissions: [
                    {
                        key: PERMISSIONS.cmsp2_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.cmsp2_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.cmsp2_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.cmsp2_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.cmsp2
            },
            {
                name: 'Category',
                permissions: [
                    {
                        key: PERMISSIONS.cmsc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.cmsc_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.cmsc_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.cmsc_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.cmsc
            },
            {
                name: 'Tag',
                permissions: [
                    {
                        key: PERMISSIONS.cmst_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.cmst_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.cmst_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.cmst_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.cmst
            }
        ]
    },
    {
        name: 'Marketing',
        childs: [
            {
                name: 'Email Marketing',
                permissions: [
                    {
                        key: PERMISSIONS.mem_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.mem_send_email,
                        name: actions.sendEmail
                    }
                ],
                key: PERMISSIONS.mem
            },
            {
                name: 'Email Template',
                permissions: [
                    {
                        key: PERMISSIONS.met_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.met_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.met_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.met_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.met
            },
            {
                name: 'Coupons',
                permissions: [
                    {
                        key: PERMISSIONS.mc_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.mc_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.mc_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.mc_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.mc
            },
            {
                name: 'Marketing Inbox',
                permissions: [
                    {
                        key: PERMISSIONS.mmi_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.mmi
            }
        ]
    },
    {
        name: 'Ticket',
        childs: [
            {
                name: 'Student Class Report',
                permissions: [
                    {
                        key: PERMISSIONS.t2scr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.t2scr_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.t2scr
            }
        ]
    },
    {
        name: 'Customer Support Report',
        childs: [
            {
                name: 'New Student Report',
                permissions: [
                    {
                        key: PERMISSIONS.csrnsr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.csrnsr
            },
            {
                name: 'Attendance Report',
                permissions: [
                    {
                        key: PERMISSIONS.csrar_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.csrar
            },
            {
                name: 'User Claim and Recommendation',
                permissions: [
                    {
                        key: PERMISSIONS.csrc_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.csrc
            },
            {
                name: 'Test Report',
                permissions: [
                    {
                        key: PERMISSIONS.csrtr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.csrtr
            },
            {
                name: 'Birthday Report',
                permissions: [
                    {
                        key: PERMISSIONS.csrbr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.csrbr
            },
            {
                name: 'Number Class Report',
                permissions: [
                    {
                        key: PERMISSIONS.csrncr_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csrncr_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.csrncr
            },
            {
                name: 'Renew',
                permissions: [
                    {
                        key: PERMISSIONS.csrrn_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csrrn_caculate,
                        name: actions.caculate
                    }
                ],
                key: PERMISSIONS.csrrn
            },
            {
                name: 'Expired Student Not Renew',
                permissions: [
                    {
                        key: PERMISSIONS.csrles,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.csrles_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.csrles
            }
        ]
    },
    {
        name: 'Academic Report',
        childs: [
            {
                name: 'Teacher Report',
                permissions: [
                    {
                        key: PERMISSIONS.artr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.artr
            },
            {
                name: 'Schedule Report',
                permissions: [
                    {
                        key: PERMISSIONS.arsr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.arsr
            },
            {
                name: 'Class Report',
                permissions: [
                    {
                        key: PERMISSIONS.arcr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.arcr
            },
            {
                name: 'Trial Report',
                permissions: [
                    {
                        key: PERMISSIONS.artr2_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.artr2
            },
            {
                name: 'Performance Report',
                permissions: [
                    {
                        key: PERMISSIONS.arpr2_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.arpr2
            },
            {
                name: 'Renew Report',
                permissions: [
                    {
                        key: PERMISSIONS.arrn_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.arrn_export_excel,
                        name: actions.exportExcel
                    }
                ],
                key: PERMISSIONS.arrn
            },
            {
                name: 'Leave Report',
                permissions: [
                    {
                        key: PERMISSIONS.arlr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.arlr
            },
            {
                name: 'Learning Assessment Report',
                permissions: [
                    {
                        key: PERMISSIONS.arla_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.arla_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.arla_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.arla_update_note,
                        name: actions.updateNote
                    },
                    {
                        key: PERMISSIONS.arla_update_status,
                        name: actions.updateStatus
                    },
                    {
                        key: PERMISSIONS.arla_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.arla
            }
        ]
    },
    {
        name: 'Trial Report',
        childs: [
            {
                name: 'Trial Proportion Report',
                permissions: [
                    {
                        key: PERMISSIONS.hrrtp_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.hrrtp
            }
        ]
    },
    {
        name: 'Zalo Report',
        childs: [
            {
                name: 'Zalo Interactive Report',
                permissions: [
                    {
                        key: PERMISSIONS.zlrzi_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.zlrzi
            }
        ]
    },
    {
        name: 'HRM',
        childs: [
            {
                name: 'User Management',
                permissions: [
                    {
                        key: PERMISSIONS.hrmum_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.hrmum_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.hrmum_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.hrmum_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.hrmum
            },
            {
                name: 'Role Management',
                permissions: [
                    {
                        key: PERMISSIONS.hrmrm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.hrmrm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.hrmrm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.hrmrm_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.hrmrm
            },
            {
                name: 'Team Management',
                permissions: [
                    {
                        key: PERMISSIONS.hrmtm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.hrmtm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.hrmtm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.hrmtm_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.hrmtm
            }
        ]
    },
    {
        name: 'System Admin',
        childs: [
            {
                name: 'Api key Management',
                permissions: [
                    {
                        key: PERMISSIONS.taakm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.taakm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.taakm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.taakm_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.taakm
            },
            {
                name: 'Api key Management',
                permissions: [
                    {
                        key: PERMISSIONS.taakm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.taakm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.taakm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.taakm_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.taakm
            },
            {
                name: 'Prompt Category Management',
                permissions: [
                    {
                        key: PERMISSIONS.tapcm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.tapcm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.tapcm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.tapcm_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.tapcm
            },
            {
                name: 'Prompt Template Management',
                permissions: [
                    {
                        key: PERMISSIONS.taptm_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.taptm_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.taptm_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.taptm_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.taptm
            },
            {
                name: 'Logs Management',
                permissions: [
                    {
                        key: PERMISSIONS.sal_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.sal
            },
            {
                name: 'Comment Suggestion',
                permissions: [
                    {
                        key: PERMISSIONS.sacs_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.sacs_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.sacs_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.sacs_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.sacs
            },

            {
                name: 'Teacher Level',
                permissions: [
                    {
                        key: PERMISSIONS.satl_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.satl_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.satl_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.satl_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.satl
            },
            {
                name: 'Student Level',
                permissions: [
                    {
                        key: PERMISSIONS.sasl_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.sasl_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.sasl_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.sasl_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.sasl
            },
            {
                name: 'Teacher Location',
                permissions: [
                    {
                        key: PERMISSIONS.satl2_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.satl2_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.satl2_update,
                        name: actions.update
                    }
                ],
                key: PERMISSIONS.satl2
            },
            {
                name: 'Event Notice',
                permissions: [
                    {
                        key: PERMISSIONS.saen_view,
                        name: actions.view
                    },
                    {
                        key: PERMISSIONS.saen_create,
                        name: actions.create
                    },
                    {
                        key: PERMISSIONS.saen_update,
                        name: actions.update
                    },
                    {
                        key: PERMISSIONS.saen_delete,
                        name: actions.delete
                    }
                ],
                key: PERMISSIONS.saen
            },
            {
                name: 'Cron Jobs',
                permissions: [
                    {
                        key: PERMISSIONS.sacr_view,
                        name: actions.view
                    }
                ],
                key: PERMISSIONS.sacr
            }
        ]
    }
];
