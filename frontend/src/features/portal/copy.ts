import type { Locale } from '@/i18n/dictionaries';
const copy: Record<string, [string, string]> = {
 'vehicle-issues':['Vehicle Issues / Maintenance','بلاغات المركبات / الصيانة'],
 vi_issue:['Issue','بلاغ'], vi_report:['Report vehicle issue','تسجيل بلاغ مركبة'], vi_back:['Back to vehicle issues','العودة إلى بلاغات المركبات'],
 vi_category:['Category / type','الفئة / النوع'], vi_severity:['Severity','الخطورة'], vi_description:['Description','الوصف'], vi_notes:['Maintenance notes','ملاحظات الصيانة'],
 vi_reported_by:['Reported by','أبلغ بواسطة'], vi_reported_at:['Reported at','وقت الإبلاغ'], vi_resolved_by:['Resolved by','عولج بواسطة'], vi_resolved_at:['Resolved at','وقت المعالجة'],
 vi_send:['Send to maintenance','إرسال إلى الصيانة'], vi_resolve:['Resolve issue','معالجة البلاغ'], vi_field:['Field','الحقل'],
 vi_OPEN:['Open','مفتوح'], vi_IN_MAINTENANCE:['In Maintenance','قيد الصيانة'], vi_RESOLVED:['Resolved','تمت المعالجة'],
 vi_LOW:['Low','منخفضة'], vi_MEDIUM:['Medium','متوسطة'], vi_HIGH:['High','عالية'], vi_CRITICAL:['Critical','حرجة'],
 vi_hint:['Open reports do not block dispatch. Sending an issue to maintenance prevents new vehicle assignments and mission starts.','البلاغات المفتوحة لا تمنع التكليف. إرسال البلاغ إلى الصيانة يمنع تكليف المركبة وبدء مهمات جديدة بها.'],
 vi_resolution_hint:['Describe the outcome in maintenance notes before resolving. Other maintenance holds and active missions are preserved.','دوّن نتيجة المعالجة في ملاحظات الصيانة قبل إغلاق البلاغ. تبقى قيود الصيانة الأخرى والمهمات النشطة محفوظة.'],
 vi_manual_hold:['This vehicle has a manual maintenance hold. Resolve issues first, then release the hold from Vehicles when appropriate.','هذه المركبة قيد الصيانة يدوياً. عالج البلاغات أولاً ثم حدّث حالتها من صفحة المركبات عند الملاءمة.'],
 vi_locked:['Resolved issues are locked. Report a new issue for a new problem.','البلاغات المعالجة مغلقة. سجّل بلاغاً جديداً لأي مشكلة جديدة.'], vi_load_failed:['Unable to load vehicle issues.','تعذر تحميل بلاغات المركبات.'],
 issue_closed:['This issue is resolved and cannot be changed.','تمت معالجة هذا البلاغ ولا يمكن تعديله.'], issue_invalid_transition:['This transition is not allowed for the current issue status.','هذا الانتقال غير مسموح لحالة البلاغ الحالية.'], issue_resolution_notes_required:['Enter maintenance notes describing the resolution.','أدخل ملاحظات الصيانة التي تشرح المعالجة.'], issue_unknown_fields:['Only the fields for this action may be changed.','يمكن تعديل حقول هذا الإجراء فقط.'], vehicle_issue_maintenance_hold:['Resolve all issues in maintenance before releasing the vehicle.','عالج جميع البلاغات قيد الصيانة قبل إتاحة المركبة.'],
 vi_action_report:['Reported','تم الإبلاغ'], vi_action_notes:['Notes updated','تم تحديث الملاحظات'], vi_action_maintenance:['Sent to maintenance','أرسل إلى الصيانة'], vi_action_resolve:['Resolved','تمت المعالجة'],
 vi_audit_vehicle:['Vehicle ID','رقم المركبة'], vi_audit_vehicle_status:['Vehicle status','حالة المركبة'], vi_audit_manual_maintenance:['Manual maintenance hold','صيانة يدوية'], vi_audit_category:['Category','الفئة'], vi_audit_severity:['Severity','الخطورة'], vi_audit_description:['Description','الوصف'], vi_audit_status:['Issue status','حالة البلاغ'], vi_audit_maintenance_notes:['Maintenance notes','ملاحظات الصيانة'], vi_audit_reported_by:['Reporter ID','رقم المبلّغ'], vi_audit_reported_at:['Reported at','وقت الإبلاغ'], vi_audit_resolved_by:['Resolver ID','رقم المعالج'], vi_audit_resolved_at:['Resolved at','وقت المعالجة'],

 Trauma:['Trauma','إصابة'], Cardiac:['Cardiac','حالة قلبية'], Respiratory:['Respiratory','حالة تنفسية'], Fall:['Fall','سقوط'], Other:['Other','أخرى'],
 finishMission:['Finish mission','إنهاء المهمة'], actualEndOptional:['Actual end (optional)','النهاية الفعلية (اختياري)'],
 resetPassword:['Reset password','إعادة تعيين كلمة المرور'], new_password:['New password','كلمة المرور الجديدة'], confirm_password:['Confirm new password','تأكيد كلمة المرور الجديدة'], showPassword:['Show passwords','إظهار كلمات المرور'], hidePassword:['Hide passwords','إخفاء كلمات المرور'], password_mismatch:['The new passwords do not match.','كلمتا المرور الجديدتان غير متطابقتين.'], password_reset_success:['Password reset successfully.','تمت إعادة تعيين كلمة المرور بنجاح.'], use_password_reset:['Use the Reset password action to change a password.','استخدم إجراء إعادة تعيين كلمة المرور لتغييرها.'],
 dashboard:['Dashboard','لوحة التحكم'], missions:['Missions','المهمات'], activity:['Staff activity','نشاط المسعفين'], staff:['Staff accounts','حسابات الموظفين'],crewParamedic: ['Paramedic', 'مسعف'],
crewAssistant: ['Assistant Paramedic', 'مساعد مسعف'],
crewLeader: ['Mission Leader', 'مسؤول مهمة'],
crewDriver: ['Driver', 'سائق'], vehicles:['Vehicles','المركبات'], portal:['Operations portal','بوابة العمليات'], welcome:['Welcome back','مرحباً بعودتك'], logout:['Sign out','تسجيل الخروج'], menu:['Menu','القائمة'], close:['Close','إغلاق'], home:['Public website','الموقع العام'], loading:['Loading…','جارٍ التحميل…'], retry:['Try again','إعادة المحاولة'], save:['Save changes','حفظ التغييرات'], create:['Create','إنشاء'], edit:['Edit','تعديل'], back:['Back to missions','العودة إلى المهمات'], search:['Search','بحث'], clear:['Clear filters','مسح الفلاتر'], all:['All','الكل'], empty:['No records found','لا توجد سجلات'], emptyHint:['Create a record or adjust your filters.','أنشئ سجلاً أو عدّل الفلاتر.'], noAccess:['You do not have access to this module.','ليس لديك صلاحية الوصول إلى هذه الوحدة.'], saved:['Changes saved','تم حفظ التغييرات'], newMission:['New mission','مهمة جديدة'], historical:['Record a completed mission','تسجيل مهمة مكتملة'], pendingEntry:['Plan a mission','إنشاء مهمة قيد الانتظار'], details:['Mission details','تفاصيل المهمة'], mission_number:['Mission number','رقم المهمة'], date:['Mission date','تاريخ المهمة'], date_from:['From date','من تاريخ'], date_to:['To date','إلى تاريخ'], location:['Location','الموقع'], incident_type:['Incident type','نوع الحادث'], destination:['Destination','الوجهة'], notes:['Operational notes','ملاحظات تشغيلية'], title:['Title / legacy description','العنوان / الوصف السابق'], status:['Status','الحالة'], vehicle:['Vehicle','المركبة'], crew:['Crew','الطاقم'], planned:['Planned assignment','التكليف المسبق'], actual:['Actual participating crew','الطاقم المشارك فعلياً'], crew_role:['Crew role','الدور في الطاقم'], addCrew:['Add crew member','إضافة فرد للطاقم'], remove:['Remove','إزالة'], select:['Select…','اختر…'], actual_start:['Actual start','البداية الفعلية'], actual_end:['Actual end','النهاية الفعلية'], timesHint:['Enter actual times in your device’s local timezone. Mission date follows Beirut time.','أدخل الأوقات الفعلية حسب المنطقة الزمنية لجهازك. تاريخ المهمة حسب توقيت بيروت.'], created_at:['Recorded at','وقت إدخال السجل'], creator:['Recorded by','أُدخل بواسطة'], cancellation_reason:['Cancellation reason','سبب الإلغاء'], correction_reason:['Correction reason','سبب التصحيح'], start:['Start mission','بدء المهمة'], complete:['Complete mission','إنهاء المهمة'], cancel:['Cancel mission','إلغاء المهمة'], correct:['Correct closed record','تصحيح سجل مغلق'], action:['Action','الإجراء'], locked:['This record is closed. It cannot be reopened or deleted.','هذا السجل مغلق ولا يمكن إعادة فتحه أو حذفه.'], audit:['Audit history','سجل التدقيق'], before:['Before','قبل'], after:['After','بعد'], noAudit:['No changes recorded yet','لا توجد تغييرات مسجلة بعد'], legacy:['Legacy record: missing actual details have not been invented.','سجل سابق: لم تُفترض التفاصيل الفعلية المفقودة.'], assignedHint:['Advance assignments are controlled by management.','التكليف المسبق من صلاحيات الإدارة.'], historicalHint:['Recording a completed mission does not change current vehicle availability.','تسجيل مهمة مكتملة لا يغيّر توفر المركبة الحالي.'], overview:['Live operational summary','ملخص العمليات الفعلي'], recent:['Recent missions','أحدث المهمات'], total:['Total','المجموع'], completedCount:['Completed participations','المشاركات في المهمات المكتملة'], activityHint:['Calculated from actual crew participation in completed missions.','محسوب من المشاركة الفعلية في المهمات المكتملة.'], next:['Next','التالي'], previous:['Previous','السابق'], page:['Page','الصفحة'], code:['Vehicle code','رمز المركبة'], plate_number:['Plate number','رقم اللوحة'], type:['Type','النوع'], model:['Model','الطراز'], year:['Year','السنة'], mileage:['Mileage (km)','المسافة المقطوعة (كم)'], newVehicle:['Add vehicle','إضافة مركبة'], newStaff:['Create staff account','إنشاء حساب موظف'], username:['Username','اسم المستخدم'], password:['Password','كلمة المرور'], passwordHint:['Leave blank to keep the current password when editing.','اتركها فارغة عند التعديل للإبقاء على كلمة المرور.'], first_name:['First name','الاسم الأول'], last_name:['Last name','اسم العائلة'], phone:['Phone','الهاتف'], email:['Email (optional contact)','البريد الإلكتروني (للتواصل، اختياري)'], role:['Role','الدور'], is_active:['Account enabled','الحساب مفعّل'], enabled:['Enabled','مفعّل'], disabled:['Disabled','معطّل'], passwordRules:['Use at least 8 characters; avoid common or entirely numeric passwords.','استخدم ٨ أحرف على الأقل وتجنب كلمات المرور الشائعة أو المؤلفة من أرقام فقط.'], PENDING:['Pending','قيد الانتظار'], ACTIVE:['Active','نشطة'], COMPLETED:['Completed','مكتملة'], CANCELLED:['Cancelled','ملغاة'], AVAILABLE:['Available','متاحة'], ON_MISSION:['On Mission','في مهمة'], MAINTENANCE:['Maintenance','صيانة'], SUPER_ADMIN:['Super Admin','المسؤول العام'], OPERATIONS_MANAGER:['Operations Manager','مدير العمليات'], PARAMEDIC:['Paramedic','مسعف'], LENDING_OFFICER:['Lending Officer','مسؤول الإعارة'], VEHICLE_MANAGER:['Vehicle Manager','مسؤول المركبات'], confirm:['Confirm this action','تأكيد هذا الإجراء'], unavailable:['The service is unavailable. Please retry.','الخدمة غير متاحة. يرجى المحاولة مجدداً.'], session_expired:['Your session expired. Please sign in.','انتهت الجلسة. يرجى تسجيل الدخول.'], invalidForm:['Check the fields and try again.','تحقق من الحقول وحاول مجدداً.'], completion_fields_required:['Completion requires a vehicle, actual crew, location, incident type, date, and actual start time. End time is optional.','يتطلب الإنهاء مركبة وطاقماً فعلياً وموقعاً ونوع الحادث والتاريخ ووقت البداية الفعلي. وقت النهاية اختياري.'], mission_fields_required:['Enter the date, location, and incident type.','أدخل التاريخ والموقع ونوع الحادث.'], vehicle_unavailable:['This vehicle is unavailable or already on an active mission.','هذه المركبة غير متاحة أو مرتبطة بمهمة نشطة.'], vehicle_maintenance:['A vehicle in maintenance cannot be assigned to a pending mission.','لا يمكن تكليف مركبة قيد الصيانة بمهمة معلقة.'], vehicle_has_active_mission:['This vehicle still has an active mission.','لا تزال للمركبة مهمة نشطة.'], vehicle_status_automatic:['On Mission status is managed by the mission workflow.','حالة في مهمة تُدار من خلال سير المهمة.'], cancellation_reason_required:['A cancellation reason is required.','سبب الإلغاء مطلوب.'], correction_reason_required:['A correction reason is required.','سبب التصحيح مطلوب.'], invalid_actual_times:['End must follow start, and actual times cannot be in the future.','يجب أن تكون النهاية بعد البداية وألا تكون الأوقات الفعلية في المستقبل.'], future_actual_time:['Actual times cannot be in the future.','لا يمكن أن تكون الأوقات الفعلية في المستقبل.'], date_start_mismatch:['Mission date must match the actual start date in Beirut time.','يجب أن يطابق تاريخ المهمة تاريخ البداية الفعلية بتوقيت بيروت.'], start_required:['Enter the actual start time.','أدخل وقت البداية الفعلي.'], invalid_crew:['Choose active Paramedic accounts for the crew.','اختر حسابات مسعفين مفعّلة للطاقم.'], duplicate_crew:['A crew member can only appear once in each crew list.','لا يمكن تكرار الفرد في قائمة الطاقم نفسها.'], concurrent_conflict:['This record conflicts with a concurrent update. Reload and retry.','يتعارض السجل مع تحديث متزامن. أعد التحميل والمحاولة.'], active_vehicle_locked:['The vehicle cannot be changed while the mission is active.','لا يمكن تغيير المركبة أثناء المهمة النشطة.'], cannot_disable_self:['You cannot disable or demote your own account.','لا يمكنك تعطيل حسابك أو تخفيض صلاحياتك.'], last_super_admin:['Keep at least one enabled Super Admin.','يجب الإبقاء على مسؤول عام مفعّل واحد على الأقل.'], invalid_transition:['This action is not allowed for the current status.','هذا الإجراء غير مسموح للحالة الحالية.'], planned_assignment_forbidden:['Only management may change advance assignments.','الإدارة وحدها تستطيع تغيير التكليف المسبق.'], pending_actual_times:['Pending missions cannot have actual times.','لا يمكن أن تحتوي المهمات المعلقة على أوقات فعلية.'], active_end_time:['Complete the mission to record its end time.','أنهِ المهمة لتسجيل وقت نهايتها.'], vehicle_required:['Select a vehicle.','اختر مركبة.'], not_closed:['Only closed records can be corrected.','يمكن تصحيح السجلات المغلقة فقط.'], closed_mission:['This mission is locked.','هذه المهمة مغلقة.']

};
Object.assign(copy, {
  equipment: ['Equipment', 'المعدات'],
  lending: ['Lending', 'الإعارة'],
  equipmentHint: ['Track individual items and their availability.', 'متابعة المعدات وتوفرها.'],
  lendingHint: ['Check out equipment, record returns, and review overdue loans.', 'إعارة المعدات وتسجيل إرجاعها ومتابعة الإعارات المتأخرة.'],
  equipmentCode: ['Equipment code', 'رمز المعدة'],
  equipmentName: ['Equipment name', 'اسم المعدة'],
  equipmentNotes: ['Notes', 'ملاحظات'],
  addEquipment: ['Add equipment', 'إضافة معدة'],
  checkout: ['Check out equipment', 'إعارة معدة'],
  returnEquipment: ['Record return', 'تسجيل الإرجاع'],
  borrower_name: ['Borrower name', 'اسم المستعير'],
  borrower_phone: ['Borrower phone', 'هاتف المستعير'],
  borrower_address: ['Borrower address (optional)', 'عنوان المستعير (اختياري)'],
  due_date: ['Return due date', 'تاريخ الإرجاع المتوقع'],
  dueDateHint: ['Due dates follow Beirut time. A loan becomes overdue the following day.', 'تعتمد المواعيد توقيت بيروت. تصبح الإعارة متأخرة في اليوم التالي للموعد.'],
  checked_out_at: ['Checked out', 'تاريخ الإعارة'],
  returned_at: ['Returned', 'تاريخ الإرجاع'],
  return_status: ['Condition after return', 'الحالة بعد الإرجاع'],
  return_notes: ['Return notes', 'ملاحظات الإرجاع'],
  serial_number: ['Serial number (optional)', 'الرقم التسلسلي (اختياري)'],
  ON_LOAN: ['On loan', 'قيد الإعارة'],
  RETIRED: ['Retired', 'خارج الخدمة'],
  OVERDUE: ['Overdue', 'متأخرة'],
  RETURNED: ['Returned', 'أُعيدت'],
  noAvailableEquipment: ['No equipment is currently available.', 'لا توجد معدات متاحة حالياً.'],
  equipment_unavailable: ['This equipment is no longer available. Refresh and choose another item.', 'لم تعد هذه المعدة متاحة. حدّث الصفحة واختر معدة أخرى.'],
  equipment_on_loan_locked: ['Return this item before editing it.', 'سجّل إرجاع هذه المعدة قبل تعديلها.'],
  equipment_status_automatic: ['On loan status is controlled by checkout and return.', 'تُضبط حالة الإعارة تلقائياً عند الإعارة والإرجاع.'],
  loan_already_returned: ['This loan has already been returned.', 'سُجّل إرجاع هذه الإعارة بالفعل.'],
  due_date_in_past: ['The due date cannot be before today.', 'لا يمكن أن يسبق موعد الإرجاع تاريخ اليوم.'],
  resourceNotFound: [
    'The requested page or service was not found. If you just updated the backend, restart it and retry.',
    'لم يتم العثور على الصفحة أو الخدمة المطلوبة. إذا حدّثت الخادم للتو، فأعد تشغيله وحاول مجدداً.',
  ],

  activityMonthly: [
    'Completed missions by month',
    'المهمات المكتملة حسب الشهر',
  ],

  activityIncidents: [
    'Completed missions by incident type',
    'المهمات المكتملة حسب نوع الحادث',
  ],

  activityUndated: [
    'Missions without a recorded date',
    'مهمات دون تاريخ مسجل',
  ],

  activityUnspecified: [
    'Not specified',
    'غير محدد',
  ],

  activityHistory: [
    'Mission participation history',
    'سجل المشاركة في المهمات',
  ],

  activityStaffName: [
    'Staff member',
    'الموظف',
  ],

  activityMissionTotal: [
    'Completed missions',
    'المهمات المكتملة',
  ],

  activityParticipationTotal: [
    'Staff participations',
    'مشاركات الموظفين',
  ],

  activityLoadError: [
    'Could not load staff activity. Please try again.',
    'تعذر تحميل نشاط الموظفين. يرجى المحاولة مجدداً.',
  ],

  reports: [
    'Reports',
    'التقارير',
  ],

  reportsHint: [
    'Filter and review the missions you have permission to access.',
    'تصفية واستعراض المهمات التي تملك صلاحية الوصول إليها.',
  ],

  reportSummary: [
    'Mission summary',
    'ملخص المهمات',
  ],

  reportTotalsHint: [
    'Totals include all matching missions across all pages.',
    'تشمل الأعداد جميع المهمات المطابقة في كل الصفحات.',
  ],

  reportLoadError: [
    'Could not load the report. Please try again.',
    'تعذر تحميل التقرير. يرجى المحاولة مجدداً.',
  ],

  reportDateError: [
    'The end date must be on or after the start date.',
    'يجب أن يكون تاريخ النهاية في تاريخ البداية أو بعده.',
  ],

  // =======================================================
  // Submissions
  // =======================================================

  submissions: [
    'Submissions',
    'الطلبات',
  ],

  submissionsHint: [
    'Review contact messages and volunteer applications received from the public website.',
    'مراجعة رسائل التواصل وطلبات التطوع الواردة من الموقع العام.',
  ],

  contactSubmissions: [
    'Contact messages',
    'رسائل التواصل',
  ],

  volunteerApplications: [
    'Volunteer applications',
    'طلبات التطوع',
  ],

  contactMessage: [
    'Contact message',
    'رسالة تواصل',
  ],

  volunteerApplication: [
    'Volunteer application',
    'طلب تطوع',
  ],

  applicant: [
    'Applicant',
    'مقدم الطلب',
  ],

  name: [
    'Name',
    'الاسم',
  ],

  subject: [
    'Subject',
    'الموضوع',
  ],

  message: [
    'Message',
    'الرسالة',
  ],

  area: [
    'Area',
    'المنطقة',
  ],

  submittedAt: [
    'Submitted at',
    'وقت الإرسال',
  ],

  reviewedBy: [
    'Reviewed by',
    'تمت المراجعة بواسطة',
  ],

  reviewedAt: [
    'Reviewed at',
    'وقت المراجعة',
  ],

  submissionStatus: [
    'Submission status',
    'حالة الطلب',
  ],

  NEW: [
    'New',
    'جديد',
  ],

  REVIEWED: [
    'Reviewed',
    'تمت المراجعة',
  ],

  CLOSED: [
    'Closed',
    'مغلق',
  ],

  markReviewed: [
    'Mark as reviewed',
    'تحديد كمراجع',
  ],

  markClosed: [
    'Close submission',
    'إغلاق الطلب',
  ],

  reopenSubmission: [
    'Return to new',
    'إعادة إلى جديد',
  ],

  contactEmpty: [
    'No contact messages found.',
    'لا توجد رسائل تواصل.',
  ],

  volunteerEmpty: [
    'No volunteer applications found.',
    'لا توجد طلبات تطوع.',
  ],

  submissionsLoadError: [
    'Could not load submissions. Please try again.',
    'تعذر تحميل الطلبات. يرجى المحاولة مجدداً.',
  ],

  submissionUpdateError: [
    'Could not update the submission. Please try again.',
    'تعذر تحديث حالة الطلب. يرجى المحاولة مجدداً.',
  ],

  submissionUpdated: [
    'Submission updated successfully.',
    'تم تحديث الطلب بنجاح.',
  ],

  filterByStatus: [
    'Filter by status',
    'تصفية حسب الحالة',
  ],

  contactTab: [
    'Contact',
    'التواصل',
  ],

  volunteerTab: [
    'Volunteers',
    'المتطوعون',
  ],

  viewDetails: [
    'View details',
    'عرض التفاصيل',
  ],

  noSubject: [
    'No subject',
    'بدون موضوع',
  ],
});

export function translator(locale: Locale) {
  return (key: string) =>
    copy[key]?.[locale === 'ar' ? 1 : 0] || key;
}

export type T = ReturnType<typeof translator>;

export const roles = [
  'SUPER_ADMIN',
  'OPERATIONS_MANAGER',
  'PARAMEDIC',
  'LENDING_OFFICER',
  'VEHICLE_MANAGER',
];

export const incidentTypes: string[] = [
  'Trauma',
  'Cardiac',
  'Respiratory',
  'Fall',
  'Other',
];

