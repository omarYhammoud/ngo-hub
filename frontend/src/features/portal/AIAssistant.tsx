'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/i18n/dictionaries';

import type {
  Api,
  Equipment,
  Loan,
  Vehicle,
  VehicleIssue,
} from './types';

import { incidentTypes } from './copy';

import {
  Field,
  Notice,
} from './ui';

import {
  aiUrgencies,
  draftSeverity,
  draftStrings,
  draftText,
  issueDescription,
  matchCrewNames,
  matchVehicle,
  missionDraftDate,
  missionDraftTime,
  parseAIResult,
  type AIResult,
  type MissingQuestion,
} from './ai-assistant-data';


type Props = {
  api: Api;
  locale: Locale;
  base: string;
  canManageVehicles: boolean;
  canManageLending: boolean;
};


type CrewOption = {
  id: number;
  name: string;
};


type MissionCrewDraft = {
  user_id: number;
  name: string;
  crew_role: string;
};


type LoadState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'failed';


const labels: Record<
  string,
  [string, string]
> = {
  title: [
    'AI Operations Assistant',
    'مساعد العمليات بالذكاء الاصطناعي',
  ],

  intro: [
    'Turn an operational note into a structured draft for staff review.',
    'حوّل ملاحظة تشغيلية إلى مسودة منظمة لمراجعة الموظفين.',
  ],

  safety: [
    'Operational and administrative assistance only. No diagnosis or treatment advice. Verify AI suggestions; nothing is saved automatically.',
    'للمساعدة التشغيلية والإدارية فقط، دون تشخيص أو نصائح علاجية. تحقق من اقتراحات الذكاء الاصطناعي؛ لا يُحفظ شيء تلقائياً.',
  ],

  note: [
    'Operational note',
    'الملاحظة التشغيلية',
  ],

  analyze: [
    'Analyze note',
    'تحليل الملاحظة',
  ],

  analyzing: [
    'Analyzing…',
    'جارٍ التحليل…',
  ],

  clear: [
    'Clear',
    'مسح',
  ],

  summary: [
    'Summary',
    'الملخص',
  ],

  category: [
    'Category',
    'الفئة',
  ],

  urgency: [
    'Operational urgency',
    'الأولوية التشغيلية',
  ],

  details: [
    'Key details',
    'التفاصيل الرئيسية',
  ],

  questions: [
    'Missing information',
    'المعلومات الناقصة',
  ],

  actions: [
    'Recommended operational actions',
    'الإجراءات التشغيلية المقترحة',
  ],

  module: [
    'Suggested module',
    'الوحدة المقترحة',
  ],

  questionHint: [
    'Complete the missing information below. Answers for Lending and Equipment are also copied into their review forms.',
    'أكمل المعلومات الناقصة أدناه. يتم أيضاً نقل إجابات الإعارة والمعدات إلى نماذج المراجعة الخاصة بها.',
  ],

  vehicleQuestionHint: [
    'Answers are included in the description preview below. Leave unknown answers blank.',
    'تظهر الإجابات في معاينة الوصف أدناه. اترك الإجابة فارغة إن لم تكن معروفة.',
  ],

  select: [
    'Select…',
    'اختر…',
  ],

  yes: [
    'Yes',
    'نعم',
  ],

  no: [
    'No',
    'لا',
  ],

  retry: [
    'Retry',
    'إعادة المحاولة',
  ],

  creating: [
    'Creating…',
    'جارٍ الإنشاء…',
  ],

  failed: [
    'Analysis failed or returned an invalid response. Please retry.',
    'فشل التحليل أو أعاد نتيجة غير صالحة. يرجى إعادة المحاولة.',
  ],

  saveFailed: [
    'The record was not created. Check the fields and retry.',
    'لم يُنشأ السجل. تحقق من الحقول وأعد المحاولة.',
  ],

  noteLength: [
    'Enter 10–2000 characters.',
    'أدخل بين ١٠ و٢٠٠٠ حرف.',
  ],

  draftOnly: [
    'This module currently supports draft review only. No record has been saved.',
    'تدعم هذه الوحدة حالياً مراجعة المسودة فقط. لم يُحفظ أي سجل.',
  ],

  aiDetected: [
    'AI detected',
    'اكتشف الذكاء الاصطناعي',
  ],

  /*
   * Vehicle Issue
   */

  prepare: [
    'Review vehicle issue',
    'مراجعة بلاغ المركبة',
  ],

  vehicle: [
    'Vehicle',
    'المركبة',
  ],

  issueCategory: [
    'Issue category',
    'نوع المشكلة',
  ],

  severity: [
    'Severity',
    'الخطورة',
  ],

  description: [
    'Description',
    'الوصف',
  ],

  retryVehicles: [
    'Retry vehicle list',
    'إعادة تحميل المركبات',
  ],

  vehicleHint: [
    'Only a unique exact vehicle code or plate match is preselected. Confirm the vehicle before saving.',
    'يُحدد الخيار مسبقاً فقط عند تطابق فريد ودقيق مع رمز المركبة أو لوحتها. أكد المركبة قبل الحفظ.',
  ],

  detected: [
    'AI vehicle reference',
    'مرجع المركبة من الذكاء الاصطناعي',
  ],

  noMatch: [
    'No unique exact match was found. Select the correct vehicle manually.',
    'لم يتم العثور على تطابق دقيق وفريد. اختر المركبة الصحيحة يدوياً.',
  ],

  loadingVehicles: [
    'Loading vehicles…',
    'جارٍ تحميل المركبات…',
  ],

  vehiclesFailed: [
    'Unable to load vehicles. Retry before creating the record.',
    'تعذر تحميل المركبات. أعد المحاولة قبل إنشاء السجل.',
  ],

  noVehicles: [
    'No vehicles are available in the records.',
    'لا توجد مركبات مسجلة.',
  ],

  noVehiclePermission: [
    'Your role can analyze notes but cannot create vehicle issues.',
    'يسمح دورك بتحليل الملاحظات ولا يسمح بإنشاء بلاغات المركبات.',
  ],

  preview: [
    'Description to be saved',
    'الوصف الذي سيُحفظ',
  ],

  clarifications: [
    'Staff clarifications:',
    'توضيحات الموظف:',
  ],

  vehicleConfirm: [
    'I’ve reviewed the vehicle and issue details and confirm this record is correct.',
    'راجعت المركبة وتفاصيل البلاغ وأؤكد صحة هذا السجل.',
  ],

  createVehicle: [
    'Confirm and create vehicle issue',
    'تأكيد وإنشاء بلاغ المركبة',
  ],

  vehicleInvalid: [
    'Select a real vehicle, enter a category and description, and confirm your review.',
    'اختر مركبة مسجلة وأدخل الفئة والوصف وأكد المراجعة.',
  ],

  /*
   * Mission
   */

  missionReview: [
    'Review mission draft',
    'مراجعة مسودة المهمة',
  ],

  missionReviewHint: [
    'Review and complete the mission details below. AI references are matched only against real NGO Hub records.',
    'راجع وأكمل تفاصيل المهمة أدناه. تتم مطابقة مراجع الذكاء الاصطناعي فقط مع سجلات NGO Hub الحقيقية.',
  ],

  missionPendingHint: [
    'This creates a Pending mission only. Starting or completing it remains a separate staff action.',
    'سيتم إنشاء المهمة بحالة قيد الانتظار فقط. بدء المهمة أو إكمالها يبقى إجراءً منفصلاً للموظفين.',
  ],

  date: [
    'Mission date',
    'تاريخ المهمة',
  ],

  location: [
    'Location',
    'الموقع',
  ],

  incidentType: [
    'Incident type',
    'نوع الحادث',
  ],

  destination: [
    'Destination',
    'الوجهة',
  ],

  missionTitle: [
    'Title',
    'العنوان',
  ],

  notes: [
    'Notes',
    'ملاحظات',
  ],

  startTime: [
    'Detected start time',
    'وقت البدء المكتشف',
  ],

  endTime: [
    'Detected end time',
    'وقت الانتهاء المكتشف',
  ],

  timingHint: [
    'Detected times are shown for reference. They are not saved as actual mission times when creating a Pending mission.',
    'تظهر الأوقات المكتشفة كمرجع فقط، ولا تُحفظ كأوقات فعلية عند إنشاء مهمة قيد الانتظار.',
  ],

  crew: [
    'Planned crew',
    'الطاقم المخطط',
  ],

  crewMember: [
    'Crew member',
    'عضو الطاقم',
  ],

  crewRole: [
    'Crew role',
    'دور الطاقم',
  ],

  addCrew: [
    'Add crew member',
    'إضافة عضو طاقم',
  ],

  remove: [
    'Remove',
    'إزالة',
  ],

  crewParamedic: [
    'Paramedic',
    'مسعف',
  ],

  crewAssistant: [
    'Assistant Paramedic',
    'مساعد مسعف',
  ],

  crewLeader: [
    'Mission Leader',
    'مسؤول مهمة',
  ],

  crewDriver: [
    'Driver',
    'سائق',
  ],

  loadingMissionOptions: [
    'Loading vehicles and staff…',
    'جارٍ تحميل المركبات والموظفين…',
  ],

  missionOptionsFailed: [
    'Unable to load mission vehicle or staff options.',
    'تعذر تحميل خيارات المركبات أو الموظفين للمهمة.',
  ],

  unmatchedCrew: [
    'AI crew names that need manual matching',
    'أسماء الطاقم التي تحتاج إلى مطابقة يدوية',
  ],

  missionConfirm: [
    'I reviewed the mission details, vehicle and crew and confirm creating this Pending mission.',
    'راجعت تفاصيل المهمة والمركبة والطاقم وأؤكد إنشاء هذه المهمة بحالة قيد الانتظار.',
  ],

  createMission: [
    'Confirm and create mission',
    'تأكيد وإنشاء المهمة',
  ],

  missionInvalid: [
    'Enter the mission date, location and incident type, then confirm your review.',
    'أدخل تاريخ المهمة والموقع ونوع الحادث ثم أكد المراجعة.',
  ],

  /*
   * Lending
   */

  lendingReview: [
    'Review lending draft',
    'مراجعة مسودة الإعارة',
  ],

  checkoutReview: [
    'Review equipment checkout',
    'مراجعة إعارة المعدات',
  ],

  returnReview: [
    'Review equipment return',
    'مراجعة إعادة المعدات',
  ],

  lendingHint: [
    'The AI equipment reference is never used as a database ID. It must match a real equipment item or active loan before saving.',
    'لا يُستخدم مرجع المعدة من الذكاء الاصطناعي كمعرّف قاعدة بيانات. يجب مطابقته مع معدة حقيقية أو إعارة نشطة قبل الحفظ.',
  ],

  lendingPermission: [
    'Your role can analyze this note but cannot manage equipment lending.',
    'يسمح دورك بتحليل هذه الملاحظة لكنه لا يسمح بإدارة إعارة المعدات.',
  ],

  loadingLending: [
    'Loading equipment and lending records…',
    'جارٍ تحميل المعدات وسجلات الإعارة…',
  ],

  lendingLoadFailed: [
    'Unable to load equipment or lending records.',
    'تعذر تحميل المعدات أو سجلات الإعارة.',
  ],

  equipmentReference: [
    'AI equipment reference',
    'مرجع المعدة من الذكاء الاصطناعي',
  ],

  equipment: [
    'Equipment',
    'المعدة',
  ],

  equipmentNoMatch: [
    'No unique available equipment item matches this code. Select the correct item manually.',
    'لم يتم العثور على معدة متاحة واحدة مطابقة لهذا الرمز. اختر المعدة الصحيحة يدوياً.',
  ],

  loanNoMatch: [
    'No unique active loan matches this equipment code. Select the correct active loan manually.',
    'لم يتم العثور على إعارة نشطة واحدة مطابقة لرمز المعدة. اختر الإعارة الصحيحة يدوياً.',
  ],

  activeLoan: [
    'Active loan',
    'الإعارة النشطة',
  ],

  checkout: [
    'Checkout',
    'إعارة',
  ],

  returnEquipment: [
    'Return equipment',
    'إعادة المعدة',
  ],

  borrowerName: [
    'Borrower full name',
    'اسم المستعير الكامل',
  ],

  borrowerPhone: [
    'Borrower phone',
    'رقم هاتف المستعير',
  ],

  borrowerAddress: [
    'Borrower address',
    'عنوان المستعير',
  ],

  dueDate: [
    'Due date',
    'تاريخ الإرجاع المتوقع',
  ],

  lendingNotes: [
    'Notes',
    'ملاحظات',
  ],

  returnStatus: [
    'Return status',
    'حالة المعدة بعد الإرجاع',
  ],

  returnNotes: [
    'Return notes',
    'ملاحظات الإرجاع',
  ],

  available: [
    'Available',
    'متاحة',
  ],

  maintenance: [
    'Maintenance',
    'صيانة',
  ],

  fullNameNeeded: [
    'The AI only detected part of the borrower name. Enter the borrower’s full name before checkout.',
    'اكتشف الذكاء الاصطناعي جزءاً فقط من اسم المستعير. أدخل الاسم الكامل قبل الإعارة.',
  ],

  lendingConfirmCheckout: [
    'I reviewed the equipment, borrower details and due date and confirm this checkout.',
    'راجعت المعدة وبيانات المستعير وتاريخ الإرجاع وأؤكد عملية الإعارة.',
  ],

  lendingConfirmReturn: [
    'I reviewed the active loan, equipment condition and return status and confirm this return.',
    'راجعت الإعارة النشطة وحالة المعدة وحالة الإرجاع وأؤكد عملية الإعادة.',
  ],

  createCheckout: [
    'Confirm and checkout equipment',
    'تأكيد إعارة المعدة',
  ],

  createReturn: [
    'Confirm equipment return',
    'تأكيد إعادة المعدة',
  ],

  lendingCheckoutInvalid: [
    'Select available equipment and enter the borrower full name, phone number and due date.',
    'اختر معدة متاحة وأدخل اسم المستعير الكامل ورقم الهاتف وتاريخ الإرجاع.',
  ],

  lendingReturnInvalid: [
    'Select a real active loan and confirm the return details.',
    'اختر إعارة نشطة حقيقية وأكد تفاصيل الإرجاع.',
  ],

  equipmentReview: ['Review equipment draft', 'مراجعة مسودة المعدة'],
  equipmentHint: ['Enter the exact equipment code. Only a unique match against real records can be updated.', 'أدخل رمز المعدة المطابق تماماً. يمكن تحديث سجل حقيقي ذي تطابق فريد فقط.'],
  equipmentCode: ['Equipment code', 'رمز المعدة'],
  equipmentStatus: ['Equipment status', 'حالة المعدة'],
  equipmentLoading: ['Loading equipment…', 'جارٍ تحميل المعدات…'],
  equipmentFailed: ['Unable to load equipment. Retry before saving.', 'تعذر تحميل المعدات. أعد المحاولة قبل الحفظ.'],
  equipmentPermission: ['Your role can review this draft but cannot update equipment.', 'يمكن لدورك مراجعة المسودة دون تحديث المعدات.'],
  equipmentUnmatched: ['No unique exact equipment code match was found. Check the code before saving.', 'لم يتم العثور على تطابق دقيق وفريد لرمز المعدة. تحقق من الرمز قبل الحفظ.'],
  equipmentOnLoan: ['Draft only: this equipment is on loan. Use Lending return before changing its inventory status.', 'مسودة فقط: هذه المعدة مُعارة. استخدم إعادة المعدة في الإعارة قبل تغيير حالة المخزون.'],
  equipmentConfirm: ['I reviewed the matched equipment, status and notes and confirm this update.', 'راجعت المعدة المطابقة والحالة والملاحظات وأؤكد هذا التحديث.'],
  equipmentSave: ['Confirm and update equipment', 'تأكيد وتحديث المعدة'],
  equipmentSaving: ['Updating…', 'جارٍ التحديث…'],
  equipmentInvalid: ['Enter a unique exact equipment code, select an allowed status and confirm your review.', 'أدخل رمز معدة مطابقاً وفريداً واختر حالة مسموحة وأكد المراجعة.'],
  equipmentSaveFailed: ['Equipment was not updated. Check the record and retry.', 'لم يتم تحديث المعدة. تحقق من السجل وأعد المحاولة.'],
  retired: ['Retired', 'خارج الخدمة نهائياً'],

  /*
   * Machine values
   */

  MISSION: [
    'Mission',
    'مهمة',
  ],

  VEHICLE: [
    'Vehicle',
    'مركبة',
  ],

  EQUIPMENT: [
    'Equipment',
    'معدات',
  ],

  GENERAL: [
    'General',
    'عام',
  ],

  MISSIONS: [
    'Missions',
    'المهمات',
  ],

  VEHICLE_ISSUES: [
    'Vehicle Issues / Maintenance',
    'بلاغات المركبات / الصيانة',
  ],

  LENDING: [
    'Lending',
    'الإعارة',
  ],

  LOW: [
    'Low',
    'منخفضة',
  ],

  MEDIUM: [
    'Medium',
    'متوسطة',
  ],

  HIGH: [
    'High',
    'عالية',
  ],

  CRITICAL: [
    'Critical',
    'حرجة',
  ],
};


const translate =
  (locale: Locale) =>
  (key: string) =>
    labels[key]?.[
      locale === 'ar'
        ? 1
        : 0
    ] || key;


const tones:
  Record<string, string> = {
    LOW: 'AVAILABLE',
    MEDIUM: 'PENDING',
    HIGH: 'CANCELLED',
    CRITICAL: 'CANCELLED',
  };


const pageStyle = {
  width: '100%',
  maxWidth: '980px',
  marginInline: 'auto',
} as const;


const accentCardStyle = {
  background: '#ffffff',
  border: '1px solid #e3e7e5',
  borderInlineStart:
    '4px solid #ed1c24',
  borderRadius: '16px',
  padding: '28px',
  boxShadow:
    '0 8px 24px rgba(0, 0, 0, 0.035)',
} as const;


const normalCardStyle = {
  background: '#ffffff',
  border: '1px solid #e3e7e5',
  borderRadius: '16px',
  padding: '28px',
  boxShadow:
    '0 8px 24px rgba(0, 0, 0, 0.025)',
} as const;


const crewRoles = [
  {
    value: 'مسعف',
    label: 'crewParamedic',
  },

  {
    value: 'مساعد مسعف',
    label: 'crewAssistant',
  },

  {
    value: 'مسؤول مهمة',
    label: 'crewLeader',
  },

  {
    value: 'سائق',
    label: 'crewDriver',
  },
];


function normalize(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}


function completeName(
  value: string,
) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length >= 2;
}


function validDate(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}


type EquipmentUpdateStatus = Exclude<Equipment['status'], 'ON_LOAN'>;

function equipmentDraftStatus(value: string): EquipmentUpdateStatus | '' {
  const status = value.trim().toUpperCase();
  return status === 'AVAILABLE' || status === 'MAINTENANCE' || status === 'RETIRED'
    ? status : '';
}

function matchEquipment(code: string, items: Equipment[]): Equipment | undefined {
  if (!code.trim()) return undefined;
  // item_code is the draft field; real Equipment records expose code.
  const matches = items.filter(item => item.code === code.trim());
  return matches.length === 1 ? matches[0] : undefined;
}

function matchAvailableEquipment(
  code: string,
  items: Equipment[],
) {
  if (!code.trim()) {
    return '';
  }

  const wanted =
    normalize(code);

  const matches =
    items.filter(
      item =>
        item.status ===
          'AVAILABLE' &&
        normalize(
          item.code,
        ) === wanted,
    );

  return matches.length === 1
    ? String(
        matches[0].id,
      )
    : '';
}


function matchActiveLoan(
  code: string,
  loans: Loan[],
) {
  if (!code.trim()) {
    return '';
  }

  const wanted =
    normalize(code);

  const matches =
    loans.filter(
      loan =>
        !loan.returned_at &&
        normalize(
          loan.equipment_code,
        ) === wanted,
    );

  return matches.length === 1
    ? String(
        matches[0].id,
      )
    : '';
}


export default function AIAssistant({
  api,
  locale,
  base,
  canManageVehicles,
  canManageLending,
}: Props) {
  const t =
    translate(locale);

  const [
    note,
    setNote,
  ] = useState('');

  const [
    result,
    setResult,
  ] = useState<AIResult>();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const analyzing =
    useRef(false);


  async function analyze(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      analyzing.current ||
      saving
    ) {
      return;
    }

    const value =
      note.trim();

    if (
      value.length < 10 ||
      value.length > 2000
    ) {
      setError(
        t('noteLength'),
      );

      return;
    }

    analyzing.current = true;

    setLoading(true);
    setError('');
    setResult(undefined);

    try {
      const response =
        await api<unknown>(
          'ai/analyze/',
          'POST',
          {
            note: value,
            language:
              locale,
          },
        );

      setResult(
        parseAIResult(
          response,
        ),
      );
    } catch {
      setError(
        t('failed'),
      );
    } finally {
      analyzing.current =
        false;

      setLoading(false);
    }
  }


  return (
    <section
      className="ai-assistant-page"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      style={pageStyle}
    >
      <div className="portal-heading ai-assistant-heading">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('intro')}</p>
        </div>
      </div>

      <div className="ai-assistant-safety">
        <span className="ai-assistant-info-icon" aria-hidden="true">i</span>
        <p>{t('safety')}</p>
      </div>

      <form method="post" onSubmit={analyze} className="ai-assistant-form">
        <div className="ai-assistant-form-heading">
          <label htmlFor="ai-operational-note">{t('note')}</label>
          <p id="ai-note-hint">
            {locale === 'ar'
              ? 'اكتب التفاصيل التشغيلية المتاحة، ثم راجع المسودة المقترحة.'
              : 'Include the operational details you have, then review the suggested draft.'}
          </p>
        </div>
        <textarea
          id="ai-operational-note"
          className="ai-assistant-textarea"
          aria-describedby="ai-note-hint ai-note-length"
          name="note"
          rows={7}
          minLength={10}
          maxLength={2000}
          value={note}
          required
          disabled={loading || saving}
          onChange={event => {
            setNote(event.target.value);
            setResult(undefined);
            setError('');
          }}
        />

        <div className="ai-assistant-footer">
          <p id="ai-note-length" className="ai-assistant-length">
            <span>{t('noteLength')}</span>
            <span dir="ltr">{note.length} / 2000</span>
          </p>
          <div className="portal-buttons ai-assistant-actions">
            <button
              className="button button-secondary ai-assistant-clear"
              type="button"
              disabled={loading || saving}
              onClick={() => {
                setNote('');
                setResult(undefined);
                setError('');
              }}
            >
              {t('clear')}
            </button>
            <button
              className="button button-primary ai-assistant-analyze"
              type="submit"
              disabled={loading || saving || note.trim().length < 10}
            >
              {t(loading ? 'analyzing' : 'analyze')}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p className="portal-error" role="alert">{error}</p>
      )}

      {!result && (
        <div className="ai-assistant-empty" role="status" aria-live="polite">
          <span className="ai-assistant-draft-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M9 8h6M9 12h6M9 16h4" />
            </svg>
          </span>
          <div>
            <h2>{locale === 'ar' ? 'المسودة المنظمة' : 'Structured draft'}</h2>
            <p>
              {loading
                ? t('analyzing')
                : locale === 'ar'
                  ? 'ستظهر المسودة هنا بعد التحليل لتراجعها. لا يُحفظ شيء تلقائياً.'
                  : 'Your draft will appear here after analysis for your review. Nothing is saved automatically.'}
            </p>
          </div>
        </div>
      )}

      {result && (
        <AnalysisReview
          result={result}
          api={api}
          locale={locale}
          base={base}
          canManageVehicles={canManageVehicles}
          canManageLending={canManageLending}
          onSaving={setSaving}
        />
      )}
    </section>
  );
}


function AnalysisReview({
  result,
  api,
  locale,
  base,
  canManageVehicles,
  canManageLending,
  onSaving,
}: Props & {
  result: AIResult;

  onSaving:
    (value: boolean) => void;
}) {
  const t =
    translate(locale);

  const router =
    useRouter();


  const [
    answers,
    setAnswers,
  ] = useState<
    Record<string, string>
  >({});


  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  const [
    attempt,
    setAttempt,
  ] = useState(0);

  const submitting =
    useRef(false);


  const isVehicle =
    result.suggested_module ===
    'VEHICLE_ISSUES';

  const isMission =
    result.suggested_module ===
    'MISSIONS';

  const isEquipment = result.suggested_module === 'EQUIPMENT';

  const isLending =
    result.suggested_module ===
    'LENDING';


  /*
   * ============================================================
   * VEHICLE
   * ============================================================
   */

  const [
    vehicles,
    setVehicles,
  ] = useState<Vehicle[]>([]);

  const [
    fleetState,
    setFleetState,
  ] = useState<LoadState>(
    'idle',
  );

  const [
    vehicleId,
    setVehicleId,
  ] = useState('');

  const [
    category,
    setCategory,
  ] = useState(
    () =>
      draftText(
        result,
        'category',
      ),
  );

  const [
    severity,
    setSeverity,
  ] = useState(
    () =>
      draftSeverity(
        result,
      ),
  );

  const [
    description,
    setDescription,
  ] = useState(
    () =>
      draftText(
        result,
        'description',
      ) ||
      result.summary,
  );

  const detectedVehicle =
    draftText(
      result,
      'vehicle_name',
    );


  /*
   * ============================================================
   * MISSION
   * ============================================================
   */

  const detectedIncident =
    draftText(
      result,
      'incident_type',
    );

  const [
    missionDate,
    setMissionDate,
  ] = useState(
    () =>
      missionDraftDate(
        result,
      ),
  );

  const [
    missionLocation,
    setMissionLocation,
  ] = useState(
    () =>
      draftText(
        result,
        'location',
      ),
  );

  const [
    incidentType,
    setIncidentType,
  ] = useState(
    () =>
      detectedIncident,
  );

  const [
    destination,
    setDestination,
  ] = useState(
    () =>
      draftText(
        result,
        'destination',
      ),
  );

  const [
    missionTitle,
    setMissionTitle,
  ] = useState(
    () =>
      draftText(
        result,
        'title',
      ),
  );

  const [
    missionNotes,
    setMissionNotes,
  ] = useState(
    () =>
      draftText(
        result,
        'notes',
      ) ||
      result.summary,
  );

  const startTime =
    missionDraftTime(
      result,
      'start_time',
    );

  const endTime =
    missionDraftTime(
      result,
      'end_time',
    );

  const [
    crewOptions,
    setCrewOptions,
  ] = useState<
    CrewOption[]
  >([]);

  const [
    crewState,
    setCrewState,
  ] = useState<LoadState>(
    'idle',
  );

  const [
    plannedCrew,
    setPlannedCrew,
  ] = useState<
    MissionCrewDraft[]
  >([]);

  const [
    unmatchedCrew,
    setUnmatchedCrew,
  ] = useState<
    string[]
  >([]);

  const crewInitialized =
    useRef(false);


  /*
   * ============================================================
   * LENDING
   * ============================================================
   */

  const lendingActionRaw =
    draftText(
      result,
      'action',
    ).toUpperCase();

  const lendingAction:
    'CHECKOUT' |
    'RETURN' |
    '' =
      lendingActionRaw ===
        'CHECKOUT' ||
      lendingActionRaw ===
        'RETURN'
        ? lendingActionRaw
        : '';

  const detectedItemCode =
    draftText(
      result,
      'item_code',
    );

  const [
    equipmentItems,
    setEquipmentItems,
  ] = useState<
    Equipment[]
  >([]);

  const [
    loans,
    setLoans,
  ] = useState<
    Loan[]
  >([]);

  const [
    lendingState,
    setLendingState,
  ] = useState<LoadState>(
    'idle',
  );

  const [
    checkoutEquipmentId,
    setCheckoutEquipmentId,
  ] = useState('');

  const [
    returnLoanId,
    setReturnLoanId,
  ] = useState('');

  const [
    borrowerName,
    setBorrowerName,
  ] = useState(
    () =>
      draftText(
        result,
        'borrower_name',
      ),
  );

  const [
    borrowerPhone,
    setBorrowerPhone,
  ] = useState(
    () =>
      draftText(
        result,
        'borrower_phone',
      ),
  );

  const [
    borrowerAddress,
    setBorrowerAddress,
  ] = useState(
    () =>
      draftText(
        result,
        'borrower_address',
      ),
  );

  const [
    lendingDueDate,
    setLendingDueDate,
  ] = useState(
    () => {
      const value =
        draftText(
          result,
          'due_date',
        );

      return validDate(
        value,
      )
        ? value
        : '';
    },
  );

  const [
    lendingNotes,
    setLendingNotes,
  ] = useState(
    () =>
      draftText(
        result,
        'notes',
      ),
  );

  const draftReturnStatus =
    draftText(
      result,
      'return_status',
    ).toUpperCase();

  const [
    returnStatus,
    setReturnStatus,
  ] = useState(
    draftReturnStatus ===
      'MAINTENANCE'
      ? 'MAINTENANCE'
      : 'AVAILABLE',
  );

  const [
    returnNotes,
    setReturnNotes,
  ] = useState(
    () =>
      draftText(
        result,
        'return_condition',
      ) ||
      draftText(
        result,
        'notes',
      ),
  );


  const [equipmentCode, setEquipmentCode] = useState(() => draftText(result, 'item_code'));
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentUpdateStatus | ''>(
    () => equipmentDraftStatus(draftText(result, 'status')),
  );
  const [equipmentNotes, setEquipmentNotes] = useState(
    () => draftText(result, 'notes') || draftText(result, 'condition') || draftText(result, 'summary') || result.summary,
  );
  const [equipmentState, setEquipmentState] = useState<LoadState>('idle');
  const matchedEquipment = matchEquipment(equipmentCode, equipmentItems);
  const equipmentOnLoan = matchedEquipment?.status === 'ON_LOAN';

  useEffect(() => {
    if (!isEquipment || !canManageLending) return;
    let live = true;
    setEquipmentState('loading');
    setConfirmed(false);
    api<Equipment[]>('equipment/')
      .then(items => {
        if (!live) return;
        if (!Array.isArray(items)) {
          setEquipmentState('failed');
          return;
        }
        setEquipmentItems(items);
        setEquipmentState('ready');
      })
      .catch(() => { if (live) setEquipmentState('failed'); });
    return () => { live = false; };
  }, [api, isEquipment, canManageLending, attempt]);

  async function updateEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const selected = matchEquipment(equipmentCode, equipmentItems);
    if (!isEquipment || !canManageLending || equipmentState !== 'ready' ||
        !selected || !equipmentStatus || !equipmentDraftStatus(equipmentStatus) || !confirmed) {
      setError(t('equipmentInvalid'));
      return;
    }
    if (selected.status === 'ON_LOAN') {
      setError(t('equipmentOnLoan'));
      return;
    }
    submitting.current = true;
    setBusy(true);
    onSaving(true);
    setError('');
    try {
      // Recheck the real record in case it was checked out after the list loaded.
      const current = await api<Equipment>('equipment/' + selected.id + '/');
      if (current.id !== selected.id || current.code !== selected.code) {
        throw new Error('Equipment changed');
      }
      if (current.status === 'ON_LOAN') {
        setEquipmentItems(items => items.map(item => item.id === current.id ? current : item));
        setConfirmed(false);
        setError(t('equipmentOnLoan'));
        submitting.current = false;
        setBusy(false);
        onSaving(false);
        return;
      }
      const payload: Pick<Equipment, 'status' | 'notes'> = {
        status: equipmentStatus,
        notes: equipmentNotes.trim(),
      };
      await api<Equipment>('equipment/' + selected.id + '/', 'PATCH', payload);
      router.push(base + '/equipment');
      router.refresh();
    } catch {
      submitting.current = false;
      setBusy(false);
      onSaving(false);
      setConfirmed(false);
      setError(t('equipmentSaveFailed'));
    }
  }

  /*
   * Load vehicles.
   */
  useEffect(() => {
    if (
      !isMission &&
      !(
        isVehicle &&
        canManageVehicles
      )
    ) {
      return;
    }

    let live = true;

    setFleetState(
      'loading',
    );

    api<Vehicle[]>(
      'vehicles/',
    )
      .then(data => {
        if (!live) {
          return;
        }

        if (
          !Array.isArray(
            data,
          )
        ) {
          setFleetState(
            'failed',
          );
          return;
        }

        setVehicles(
          data,
        );

        setVehicleId(
          matchVehicle(
            detectedVehicle,
            data,
          ),
        );

        setFleetState(
          'ready',
        );
      })
      .catch(() => {
        if (live) {
          setFleetState(
            'failed',
          );
        }
      });

    return () => {
      live = false;
    };
  }, [
    api,
    canManageVehicles,
    isMission,
    isVehicle,
    detectedVehicle,
    attempt,
  ]);


  /*
   * Load mission crew.
   */
  useEffect(() => {
    if (!isMission) {
      return;
    }

    let live = true;

    setCrewState(
      'loading',
    );

    api<CrewOption[]>(
      'missions/crew_options/',
    )
      .then(data => {
        if (!live) {
          return;
        }

        if (
          !Array.isArray(
            data,
          )
        ) {
          setCrewState(
            'failed',
          );
          return;
        }

        setCrewOptions(
          data,
        );

        setCrewState(
          'ready',
        );
      })
      .catch(() => {
        if (live) {
          setCrewState(
            'failed',
          );
        }
      });

    return () => {
      live = false;
    };
  }, [
    api,
    isMission,
    attempt,
  ]);


  /*
   * Match mission crew.
   */
  useEffect(() => {
    if (
      !isMission ||
      crewState !==
        'ready' ||
      crewInitialized.current
    ) {
      return;
    }

    const names =
      draftStrings(
        result,
        'crew_names',
      );

    const match =
      matchCrewNames(
        names,
        crewOptions,
      );

    setPlannedCrew([
      ...match.matched.map(
        member => ({
          user_id:
            member.id,
          name:
            member.name,
          crew_role:
            '',
        }),
      ),

      ...match.unmatched.map(
        name => ({
          user_id: 0,
          name,
          crew_role: '',
        }),
      ),
    ]);

    setUnmatchedCrew(
      match.unmatched,
    );

    crewInitialized.current =
      true;
  }, [
    crewOptions,
    crewState,
    isMission,
    result,
  ]);


  /*
   * Load equipment and loans.
   */
  useEffect(() => {
    if (
      !isLending ||
      !canManageLending
    ) {
      return;
    }

    let live = true;

    setLendingState(
      'loading',
    );

    Promise.all([
      api<Equipment[]>(
        'equipment/',
      ),

      api<Loan[]>(
        'lending/',
      ),
    ])
      .then(
        ([
          items,
          history,
        ]) => {
          if (!live) {
            return;
          }

          if (
            !Array.isArray(
              items,
            ) ||
            !Array.isArray(
              history,
            )
          ) {
            setLendingState(
              'failed',
            );
            return;
          }

          setEquipmentItems(
            items,
          );

          setLoans(
            history,
          );

          if (
            lendingAction ===
            'CHECKOUT'
          ) {
            setCheckoutEquipmentId(
              matchAvailableEquipment(
                detectedItemCode,
                items,
              ),
            );
          }

          if (
            lendingAction ===
            'RETURN'
          ) {
            setReturnLoanId(
              matchActiveLoan(
                detectedItemCode,
                history,
              ),
            );
          }

          setLendingState(
            'ready',
          );
        },
      )
      .catch(() => {
        if (live) {
          setLendingState(
            'failed',
          );
        }
      });

    return () => {
      live = false;
    };
  }, [
    api,
    canManageLending,
    detectedItemCode,
    isLending,
    lendingAction,
    attempt,
  ]);


  const finalDescription =
    issueDescription(
      description,
      result.missing_information,
      answers,
      t('clarifications'),
    );


  /*
   * Missing-information answers.
   *
   * Lending answers are also copied
   * directly into the real Lending form.
   */
  function answer(
    index: number,
    value: string,
  ) {
    setAnswers(
      current => ({
        ...current,
        [String(index)]:
          value,
      }),
    );

    const question =
      result
        .missing_information[
          index
        ];

    if (isEquipment && question) {
      switch (question.field) {
        case 'item_code': setEquipmentCode(value); break;
        case 'status': setEquipmentStatus(equipmentDraftStatus(value)); break;
        case 'condition':
        case 'notes': setEquipmentNotes(value); break;
      }
      setError('');
    }

    if (
      isLending &&
      question
    ) {
      switch (
        question.field
      ) {
        case 'borrower_name':
          setBorrowerName(
            value,
          );
          break;

        case 'borrower_phone':
          setBorrowerPhone(
            value,
          );
          break;

        case 'borrower_address':
          setBorrowerAddress(
            value,
          );
          break;

        case 'due_date':
          setLendingDueDate(
            value,
          );
          break;

        case 'notes':
          setLendingNotes(
            value,
          );
          break;

        case 'return_condition':
          setReturnNotes(
            value,
          );
          break;

        case 'return_status':
          if (
            value ===
              'AVAILABLE' ||
            value ===
              'MAINTENANCE'
          ) {
            setReturnStatus(
              value,
            );
          }
          break;
      }
    }

    setConfirmed(false);
  }


  /*
   * ============================================================
   * VEHICLE CREATE
   * ============================================================
   */

  async function createVehicleIssue(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitting.current
    ) {
      return;
    }

    if (
      !canManageVehicles ||
      !isVehicle ||
      fleetState !==
        'ready' ||
      !confirmed ||
      !vehicles.some(
        vehicle =>
          String(
            vehicle.id,
          ) ===
          vehicleId,
      ) ||
      !category.trim() ||
      !description.trim() ||
      finalDescription.length >
        10000 ||
      !aiUrgencies.includes(
        severity as
          typeof aiUrgencies[number],
      )
    ) {
      setError(
        t('vehicleInvalid'),
      );
      return;
    }

    submitting.current =
      true;

    setBusy(true);
    onSaving(true);
    setError('');

    try {
      const created =
        await api<VehicleIssue>(
          'vehicle-issues/',
          'POST',
          {
            vehicle:
              Number(
                vehicleId,
              ),

            category:
              category.trim(),

            severity,

            description:
              finalDescription,
          },
        );

      router.push(
        `${base}/vehicle-issues/${created.id}`,
      );
    } catch {
      submitting.current =
        false;

      setBusy(false);
      onSaving(false);

      setError(
        t('saveFailed'),
      );
    }
  }


  /*
   * ============================================================
   * MISSION CREATE
   * ============================================================
   */

  async function createMission(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitting.current
    ) {
      return;
    }

    if (
      !isMission ||
      !missionDate ||
      !missionLocation.trim() ||
      !incidentType.trim() ||
      !confirmed
    ) {
      setError(
        t('missionInvalid'),
      );
      return;
    }

    if (
      vehicleId &&
      !vehicles.some(
        vehicle =>
          String(
            vehicle.id,
          ) ===
          vehicleId,
      )
    ) {
      setError(
        t('missionInvalid'),
      );
      return;
    }

    const validCrew =
      plannedCrew.filter(
        member =>
          member.user_id >
            0 &&
          crewOptions.some(
            option =>
              option.id ===
              member.user_id,
          ),
      );

    const body:
      Record<
        string,
        unknown
      > = {
        date:
          missionDate,

        location:
          missionLocation.trim(),

        incident_type:
          incidentType.trim(),

        planned_crew:
          validCrew.map(
            member => ({
              user_id:
                member.user_id,

              crew_role:
                member.crew_role,
            }),
          ),
      };

    if (
      vehicleId
    ) {
      body.vehicle_id =
        Number(
          vehicleId,
        );
    }

    if (
      destination.trim()
    ) {
      body.destination =
        destination.trim();
    }

    if (
      missionTitle.trim()
    ) {
      body.title =
        missionTitle.trim();
    }

    if (
      missionNotes.trim()
    ) {
      body.notes =
        missionNotes.trim();
    }

    submitting.current =
      true;

    setBusy(true);
    onSaving(true);
    setError('');

    try {
      const created =
        await api<{
          id: number;
        }>(
          'missions/',
          'POST',
          body,
        );

      router.push(
        `${base}/missions/${created.id}`,
      );
    } catch {
      submitting.current =
        false;

      setBusy(false);
      onSaving(false);

      setError(
        t('saveFailed'),
      );
    }
  }


  /*
   * ============================================================
   * LENDING CHECKOUT
   * ============================================================
   */

  async function createCheckout(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitting.current
    ) {
      return;
    }

    const selected =
      equipmentItems.find(
        item =>
          String(
            item.id,
          ) ===
          checkoutEquipmentId &&
          item.status ===
            'AVAILABLE',
      );

    if (
      !canManageLending ||
      !isLending ||
      lendingAction !==
        'CHECKOUT' ||
      lendingState !==
        'ready' ||
      !selected ||
      !completeName(
        borrowerName,
      ) ||
      !borrowerPhone.trim() ||
      !validDate(
        lendingDueDate,
      ) ||
      !confirmed
    ) {
      setError(
        t(
          'lendingCheckoutInvalid',
        ),
      );
      return;
    }

    submitting.current =
      true;

    setBusy(true);
    onSaving(true);
    setError('');

    const body:
      Record<
        string,
        unknown
      > = {
        equipment:
          selected.id,

        borrower_name:
          borrowerName.trim(),

        borrower_phone:
          borrowerPhone.trim(),

        due_date:
          lendingDueDate,
      };

    if (
      borrowerAddress.trim()
    ) {
      body.borrower_address =
        borrowerAddress.trim();
    }

    if (
      lendingNotes.trim()
    ) {
      body.notes =
        lendingNotes.trim();
    }

    try {
      await api(
        'lending/',
        'POST',
        body,
      );

      router.push(
        `${base}/lending`,
      );

      router.refresh();
    } catch {
      submitting.current =
        false;

      setBusy(false);
      onSaving(false);

      setError(
        t('saveFailed'),
      );
    }
  }


  /*
   * ============================================================
   * LENDING RETURN
   * ============================================================
   */

  async function createReturn(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitting.current
    ) {
      return;
    }

    const selectedLoan =
      loans.find(
        loan =>
          String(
            loan.id,
          ) ===
            returnLoanId &&
          !loan.returned_at,
      );

    if (
      !canManageLending ||
      !isLending ||
      lendingAction !==
        'RETURN' ||
      lendingState !==
        'ready' ||
      !selectedLoan ||
      ![
        'AVAILABLE',
        'MAINTENANCE',
      ].includes(
        returnStatus,
      ) ||
      !confirmed
    ) {
      setError(
        t(
          'lendingReturnInvalid',
        ),
      );
      return;
    }

    submitting.current =
      true;

    setBusy(true);
    onSaving(true);
    setError('');

    try {
      await api(
        `lending/${selectedLoan.id}/return/`,
        'POST',
        {
          status:
            returnStatus,

          return_notes:
            returnNotes.trim(),
        },
      );

      router.push(
        `${base}/lending`,
      );

      router.refresh();
    } catch {
      submitting.current =
        false;

      setBusy(false);
      onSaving(false);

      setError(
        t('saveFailed'),
      );
    }
  }


  function updateCrew(
    index: number,
    patch:
      Partial<MissionCrewDraft>,
  ) {
    setPlannedCrew(
      current =>
        current.map(
          (
            member,
            memberIndex,
          ) =>
            memberIndex ===
            index
              ? {
                  ...member,
                  ...patch,
                }
              : member,
        ),
    );

    setConfirmed(false);
  }


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      {/* Summary */}
      <section
        style={{
          ...normalCardStyle,
          marginBottom:
            '20px',
        }}
      >
        <div
          className="portal-buttons"
          style={{
            justifyContent:
              'flex-start',
            marginBottom:
              '1rem',
          }}
        >
          <span className="portal-badge PENDING">
            {t('category')}
            {': '}
            {t(
              result.category,
            )}
          </span>

          <span
            className={`portal-badge ${
              tones[
                result.urgency
              ]
            }`}
          >
            {t('urgency')}
            {': '}
            {t(
              result.urgency,
            )}
          </span>
        </div>

        <h2>
          {t('summary')}
        </h2>

        <p>
          {result.summary}
        </p>

        <p>
          <strong>
            {t('module')}:
          </strong>{' '}
          {t(
            result.suggested_module,
          )}
        </p>
      </section>


      {/* Key Details */}
      {!!result
        .key_details
        .length && (
        <section
          style={{
            ...normalCardStyle,
            marginBottom:
              '20px',
          }}
        >
          <h2>
            {t('details')}
          </h2>

          <ul>
            {result
              .key_details
              .map(
                (
                  detail,
                  index,
                ) => (
                  <li
                    key={
                      index
                    }
                  >
                    {detail}
                  </li>
                ),
              )}
          </ul>
        </section>
      )}


      {/* Missing Information */}
      {result
        .missing_information
        .length > 0 && (
        <section
          style={{
            ...accentCardStyle,
            marginBottom:
              '20px',
          }}
        >
          <h2>
            {t(
              'questions',
            )}
          </h2>

          <Notice
            text={
              isVehicle &&
              canManageVehicles
                ? t(
                    'vehicleQuestionHint',
                  )
                : t(
                    'questionHint',
                  )
            }
          />

          <div
            className="portal-form-grid"
            style={{
              marginTop:
                '1.25rem',
            }}
          >
            {result
              .missing_information
              .map(
                (
                  question,
                  index,
                ) => (
                  <Field
                    key={
                      index
                    }
                    label={
                      question.question
                    }
                  >
                    <QuestionInput
                      question={
                        question
                      }
                      index={
                        index
                      }
                      value={
                        answers[
                          String(
                            index,
                          )
                        ] ||
                        ''
                      }
                      disabled={
                        busy
                      }
                      locale={
                        locale
                      }
                      onChange={
                        value =>
                          answer(
                            index,
                            value,
                          )
                      }
                    />
                  </Field>
                ),
              )}
          </div>
        </section>
      )}


      {/* Recommended Actions */}
      {!!result
        .recommended_actions
        .length && (
        <section
          style={{
            ...normalCardStyle,
            marginBottom:
              '20px',
          }}
        >
          <h2>
            {t('actions')}
          </h2>

          <ul>
            {result
              .recommended_actions
              .map(
                (
                  action,
                  index,
                ) => (
                  <li
                    key={
                      index
                    }
                  >
                    {action}
                  </li>
                ),
              )}
          </ul>
        </section>
      )}


      {/* ================= VEHICLE ================= */}

      {isVehicle && (
        <section
          style={{
            ...accentCardStyle,
            marginBottom:
              '20px',
          }}
        >
          <p
            style={{
              margin: 0,
              color:
                '#ed1c24',
              fontWeight:
                700,
            }}
          >
            {t(
              'VEHICLE_ISSUES',
            )}
          </p>

          <h2>
            {t('prepare')}
          </h2>


          {!canManageVehicles ? (
            <Notice
              text={t(
                'noVehiclePermission',
              )}
            />
          ) : (
            <>
              <Notice
                text={t(
                  'vehicleHint',
                )}
              />

              {detectedVehicle && (
                <p>
                  <strong>
                    {t(
                      'detected',
                    )}
                    :
                  </strong>{' '}
                  {
                    detectedVehicle
                  }
                </p>
              )}

              {fleetState ===
                'loading' && (
                <p>
                  {t(
                    'loadingVehicles',
                  )}
                </p>
              )}

              {fleetState ===
                'failed' && (
                <div>
                  <p>
                    {t(
                      'vehiclesFailed',
                    )}
                  </p>

                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() =>
                      setAttempt(
                        value =>
                          value + 1,
                      )
                    }
                  >
                    {t(
                      'retryVehicles',
                    )}
                  </button>
                </div>
              )}

              {fleetState ===
                'ready' &&
                detectedVehicle &&
                !matchVehicle(
                  detectedVehicle,
                  vehicles,
                ) && (
                  <Notice
                    text={t(
                      'noMatch',
                    )}
                  />
                )}

              <form
                onSubmit={
                  createVehicleIssue
                }
              >
                <fieldset
                  className="portal-form-grid"
                  disabled={
                    busy ||
                    fleetState !==
                      'ready'
                  }
                  style={{
                    border: 0,
                    padding: 0,
                    margin:
                      '1.5rem 0 0',
                  }}
                >
                  <Field
                    label={t(
                      'vehicle',
                    )}
                  >
                    <select
                      value={
                        vehicleId
                      }
                      required
                      onChange={
                        event => {
                          setVehicleId(
                            event
                              .target
                              .value,
                          );
                          setConfirmed(
                            false,
                          );
                        }
                      }
                    >
                      <option value="">
                        {t(
                          'select',
                        )}
                      </option>

                      {vehicles.map(
                        vehicle => (
                          <option
                            key={
                              vehicle.id
                            }
                            value={
                              vehicle.id
                            }
                          >
                            {
                              vehicle.code
                            }
                            {' · '}
                            {
                              vehicle.plate_number
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>


                  <Field
                    label={t(
                      'issueCategory',
                    )}
                  >
                    <input
                      value={
                        category
                      }
                      maxLength={
                        100
                      }
                      required
                      onChange={
                        event => {
                          setCategory(
                            event
                              .target
                              .value,
                          );
                          setConfirmed(
                            false,
                          );
                        }
                      }
                    />
                  </Field>


                  <Field
                    label={t(
                      'severity',
                    )}
                  >
                    <select
                      value={
                        severity
                      }
                      onChange={
                        event => {
                          setSeverity(
                            event
                              .target
                              .value,
                          );
                          setConfirmed(
                            false,
                          );
                        }
                      }
                    >
                      {aiUrgencies.map(
                        value => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {t(
                              value,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>


                  <div className="portal-full">
                    <Field
                      label={t(
                        'description',
                      )}
                    >
                      <textarea
                        value={
                          description
                        }
                        rows={5}
                        maxLength={
                          10000
                        }
                        required
                        onChange={
                          event => {
                            setDescription(
                              event
                                .target
                                .value,
                            );
                            setConfirmed(
                              false,
                            );
                          }
                        }
                      />
                    </Field>
                  </div>


                  <div className="portal-full">
                    <h3>
                      {t(
                        'preview',
                      )}
                    </h3>

                    <p
                      style={{
                        whiteSpace:
                          'pre-wrap',
                      }}
                    >
                      {
                        finalDescription
                      }
                    </p>
                  </div>


                  <label className="portal-checkbox portal-full">
                    <input
                      type="checkbox"
                      checked={
                        confirmed
                      }
                      required
                      onChange={
                        event =>
                          setConfirmed(
                            event
                              .target
                              .checked,
                          )
                      }
                    />

                    <span>{t('vehicleConfirm')}</span>
                  </label>


                  <div
                    className="portal-buttons portal-full"
                    style={{
                      justifyContent:
                        'flex-end',
                    }}
                  >
                    <button
                      className="button button-primary"
                      disabled={
                        busy ||
                        !confirmed
                      }
                    >
                      {t(
                        busy
                          ? 'creating'
                          : 'createVehicle',
                      )}
                    </button>
                  </div>
                </fieldset>
              </form>
            </>
          )}

          {error && (
            <p
              className="portal-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </section>
      )}


      {/* ================= MISSION ================= */}

      {isMission && (
        <section
          style={{
            ...accentCardStyle,
            marginBottom:
              '20px',
          }}
        >
          <p
            style={{
              margin: 0,
              color:
                '#ed1c24',
              fontWeight:
                700,
            }}
          >
            {t(
              'MISSIONS',
            )}
          </p>

          <h2>
            {t(
              'missionReview',
            )}
          </h2>

          <Notice
            text={t(
              'missionReviewHint',
            )}
          />

          <div
            style={{
              marginTop:
                '12px',
            }}
          >
            <Notice
              text={t(
                'missionPendingHint',
              )}
            />
          </div>


          {(fleetState ===
            'loading' ||
            crewState ===
              'loading') && (
            <p>
              {t(
                'loadingMissionOptions',
              )}
            </p>
          )}


          {(fleetState ===
            'failed' ||
            crewState ===
              'failed') && (
            <div>
              <p>
                {t(
                  'missionOptionsFailed',
                )}
              </p>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  crewInitialized.current =
                    false;

                  setAttempt(
                    value =>
                      value + 1,
                  );
                }}
              >
                {t('retry')}
              </button>
            </div>
          )}


          {detectedVehicle &&
            fleetState ===
              'ready' &&
            !matchVehicle(
              detectedVehicle,
              vehicles,
            ) && (
              <Notice
                text={`${t(
                  'detected',
                )}: ${detectedVehicle}. ${t(
                  'noMatch',
                )}`}
              />
            )}


          <form
            onSubmit={
              createMission
            }
          >
            <fieldset
              className="portal-form-grid"
              disabled={
                busy ||
                fleetState ===
                  'loading' ||
                crewState ===
                  'loading'
              }
              style={{
                border: 0,
                padding: 0,
                margin:
                  '1.5rem 0 0',
              }}
            >
              <Field
                label={`${t(
                  'date',
                )} *`}
              >
                <input
                  type="date"
                  required
                  value={
                    missionDate
                  }
                  onChange={
                    event => {
                      setMissionDate(
                        event
                          .target
                          .value,
                      );
                      setConfirmed(
                        false,
                      );
                    }
                  }
                />
              </Field>


              <Field
                label={`${t(
                  'location',
                )} *`}
              >
                <input
                  required
                  maxLength={
                    250
                  }
                  value={
                    missionLocation
                  }
                  onChange={
                    event => {
                      setMissionLocation(
                        event
                          .target
                          .value,
                      );
                      setConfirmed(
                        false,
                      );
                    }
                  }
                />
              </Field>


              <Field
                label={`${t(
                  'incidentType',
                )} *`}
              >
                <select
                  required
                  value={
                    incidentType
                  }
                  onChange={
                    event => {
                      setIncidentType(
                        event
                          .target
                          .value,
                      );
                      setConfirmed(
                        false,
                      );
                    }
                  }
                >
                  <option value="">
                    {t(
                      'select',
                    )}
                  </option>

                  {detectedIncident &&
                    !incidentTypes.includes(
                      detectedIncident,
                    ) && (
                      <option
                        value={
                          detectedIncident
                        }
                      >
                        {
                          detectedIncident
                        }
                      </option>
                    )}

                  {incidentTypes.map(
                    value => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </Field>


              <Field
                label={t(
                  'vehicle',
                )}
              >
                <select
                  value={
                    vehicleId
                  }
                  onChange={
                    event => {
                      setVehicleId(
                        event
                          .target
                          .value,
                      );
                      setConfirmed(
                        false,
                      );
                    }
                  }
                >
                  <option value="">
                    {t(
                      'select',
                    )}
                  </option>

                  {vehicles.map(
                    vehicle => (
                      <option
                        key={
                          vehicle.id
                        }
                        value={
                          vehicle.id
                        }
                      >
                        {
                          vehicle.code
                        }
                        {' · '}
                        {vehicle.model ? `${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}` : '—'}
                      </option>
                    ),
                  )}
                </select>
              </Field>


              <Field
                label={t(
                  'destination',
                )}
              >
                <input
                  maxLength={
                    250
                  }
                  value={
                    destination
                  }
                  onChange={
                    event => {
                      setDestination(
                        event
                          .target
                          .value,
                      );
                      setConfirmed(
                        false,
                      );
                    }
                  }
                />
              </Field>


              <Field
                label={t(
                  'missionTitle',
                )}
              >
                <input
                  maxLength={
                    200
                  }
                  value={
                    missionTitle
                  }
                  onChange={
                    event => {
                      setMissionTitle(
                        event
                          .target
                          .value,
                      );
                      setConfirmed(
                        false,
                      );
                    }
                  }
                />
              </Field>


              {(startTime ||
                endTime) && (
                <>
                  <Field
                    label={t(
                      'startTime',
                    )}
                  >
                    <input
                      type="time"
                      readOnly
                      value={
                        startTime
                      }
                    />
                  </Field>

                  <Field
                    label={t(
                      'endTime',
                    )}
                  >
                    <input
                      type="time"
                      readOnly
                      value={
                        endTime
                      }
                    />
                  </Field>

                  <div className="portal-full">
                    <Notice
                      text={t(
                        'timingHint',
                      )}
                    />
                  </div>
                </>
              )}


              <div className="portal-full">
                <Field
                  label={t(
                    'notes',
                  )}
                >
                  <textarea
                    rows={5}
                    maxLength={
                      20000
                    }
                    value={
                      missionNotes
                    }
                    onChange={
                      event => {
                        setMissionNotes(
                          event
                            .target
                            .value,
                        );
                        setConfirmed(
                          false,
                        );
                      }
                    }
                  />
                </Field>
              </div>
            </fieldset>


            <div
              style={{
                marginTop:
                  '1.75rem',
                paddingTop:
                  '1.5rem',
                borderTop:
                  '1px solid #e7ebe9',
              }}
            >
              <h3>
                {t('crew')}
              </h3>

              {unmatchedCrew.length >
                0 && (
                <Notice
                  text={`${t(
                    'unmatchedCrew',
                  )}: ${unmatchedCrew.join(
                    ', ',
                  )}`}
                />
              )}


              {plannedCrew.map(
                (
                  member,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    style={{
                      background:
                        '#fafbfa',
                      border:
                        '1px solid #e5e9e7',
                      borderRadius:
                        '14px',
                      padding:
                        '18px',
                      marginTop:
                        '14px',
                    }}
                  >
                    {member.user_id ===
                      0 &&
                      member.name && (
                        <p
                          style={{
                            margin:
                              '0 0 12px',
                            color:
                              '#ed1c24',
                            fontWeight:
                              700,
                          }}
                        >
                          {t(
                            'aiDetected',
                          )}
                          {': '}
                          {
                            member.name
                          }
                        </p>
                      )}

                    <div className="portal-form-grid">
                      <Field
                        label={t(
                          'crewMember',
                        )}
                      >
                        <select
                          value={
                            member.user_id ||
                            ''
                          }
                          onChange={
                            event => {
                              const id =
                                Number(
                                  event
                                    .target
                                    .value,
                                );

                              const option =
                                crewOptions.find(
                                  item =>
                                    item.id ===
                                    id,
                                );

                              updateCrew(
                                index,
                                {
                                  user_id:
                                    id,

                                  name:
                                    option?.name ||
                                    member.name,
                                },
                              );
                            }
                          }
                        >
                          <option value="">
                            {t(
                              'select',
                            )}
                          </option>

                          {crewOptions.map(
                            option => (
                              <option
                                key={
                                  option.id
                                }
                                value={
                                  option.id
                                }
                              >
                                {
                                  option.name
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </Field>


                      <Field
                        label={t(
                          'crewRole',
                        )}
                      >
                        <select
                          value={
                            member.crew_role
                          }
                          onChange={
                            event =>
                              updateCrew(
                                index,
                                {
                                  crew_role:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                        >
                          <option value="">
                            {t(
                              'select',
                            )}
                          </option>

                          {crewRoles.map(
                            role => (
                              <option
                                key={
                                  role.value
                                }
                                value={
                                  role.value
                                }
                              >
                                {t(
                                  role.label,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>


                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                          setPlannedCrew(
                            current =>
                              current.filter(
                                (
                                  _,
                                  memberIndex,
                                ) =>
                                  memberIndex !==
                                  index,
                              ),
                          );

                          setConfirmed(
                            false,
                          );
                        }}
                      >
                        {t(
                          'remove',
                        )}
                      </button>
                    </div>
                  </div>
                ),
              )}


              <button
                type="button"
                className="button button-secondary"
                style={{
                  marginTop:
                    '14px',
                }}
                disabled={
                  crewState !==
                  'ready'
                }
                onClick={() => {
                  setPlannedCrew(
                    current => [
                      ...current,
                      {
                        user_id: 0,
                        name: '',
                        crew_role:
                          '',
                      },
                    ],
                  );

                  setConfirmed(
                    false,
                  );
                }}
              >
                ＋{' '}
                {t(
                  'addCrew',
                )}
              </button>
            </div>


            <label
              className="portal-checkbox"
              style={{
                display: 'flex',
                marginTop:
                  '1.75rem',
              }}
            >
              <input
                type="checkbox"
                required
                checked={
                  confirmed
                }
                onChange={
                  event =>
                    setConfirmed(
                      event
                        .target
                        .checked,
                    )
                }
              />

              {t(
                'missionConfirm',
              )}
            </label>


            <div
              className="portal-buttons"
              style={{
                marginTop:
                  '1.5rem',
                justifyContent:
                  'flex-end',
              }}
            >
              <button
                className="button button-primary"
                disabled={
                  busy ||
                  !confirmed ||
                  !missionDate ||
                  !missionLocation.trim() ||
                  !incidentType.trim()
                }
              >
                {t(
                  busy
                    ? 'creating'
                    : 'createMission',
                )}
              </button>
            </div>
          </form>


          {error && (
            <p
              className="portal-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </section>
      )}


      {/* ================= LENDING ================= */}

      {isLending && (
        <section
          style={{
            ...accentCardStyle,
            marginBottom:
              '20px',
          }}
        >
          <p
            style={{
              margin: 0,
              color:
                '#ed1c24',
              fontWeight:
                700,
            }}
          >
            {t('LENDING')}
          </p>

          <h2>
            {t(
              lendingAction ===
                'RETURN'
                ? 'returnReview'
                : lendingAction ===
                    'CHECKOUT'
                  ? 'checkoutReview'
                  : 'lendingReview',
            )}
          </h2>


          <Notice
            text={t(
              'lendingHint',
            )}
          />


          {detectedItemCode && (
            <p
              style={{
                marginTop:
                  '1rem',
              }}
            >
              <strong>
                {t(
                  'equipmentReference',
                )}
                :
              </strong>{' '}
              {
                detectedItemCode
              }
            </p>
          )}


          {!canManageLending ? (
            <div
              style={{
                marginTop:
                  '1rem',
              }}
            >
              <Notice
                text={t(
                  'lendingPermission',
                )}
              />
            </div>
          ) : (
            <>
              {lendingState ===
                'loading' && (
                <p role="status">
                  {t(
                    'loadingLending',
                  )}
                </p>
              )}


              {lendingState ===
                'failed' && (
                <div
                  role="alert"
                  style={{
                    marginTop:
                      '1rem',
                  }}
                >
                  <p>
                    {t(
                      'lendingLoadFailed',
                    )}
                  </p>

                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      setAttempt(
                        value =>
                          value + 1,
                      )
                    }
                  >
                    {t('retry')}
                  </button>
                </div>
              )}


              {/* CHECKOUT */}
              {lendingAction ===
                'CHECKOUT' &&
                lendingState ===
                  'ready' && (
                  <form
                    onSubmit={
                      createCheckout
                    }
                    style={{
                      marginTop:
                        '1.5rem',
                    }}
                  >
                    {detectedItemCode &&
                      !matchAvailableEquipment(
                        detectedItemCode,
                        equipmentItems,
                      ) && (
                        <div
                          style={{
                            marginBottom:
                              '1rem',
                          }}
                        >
                          <Notice
                            text={t(
                              'equipmentNoMatch',
                            )}
                          />
                        </div>
                      )}


                    {!completeName(
                      borrowerName,
                    ) &&
                      borrowerName.trim() && (
                        <div
                          style={{
                            marginBottom:
                              '1rem',
                          }}
                        >
                          <Notice
                            text={t(
                              'fullNameNeeded',
                            )}
                          />
                        </div>
                      )}


                    <fieldset
                      className="portal-form-grid"
                      disabled={
                        busy
                      }
                      style={{
                        border: 0,
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <Field
                        label={`${t(
                          'equipment',
                        )} *`}
                      >
                        <select
                          required
                          value={
                            checkoutEquipmentId
                          }
                          onChange={
                            event => {
                              setCheckoutEquipmentId(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        >
                          <option value="">
                            {t(
                              'select',
                            )}
                          </option>

                          {equipmentItems
                            .filter(
                              item =>
                                item.status ===
                                'AVAILABLE',
                            )
                            .map(
                              item => (
                                <option
                                  key={
                                    item.id
                                  }
                                  value={
                                    item.id
                                  }
                                >
                                  {
                                    item.code
                                  }
                                  {' · '}
                                  {
                                    item.name
                                  }
                                </option>
                              ),
                            )}
                        </select>
                      </Field>


                      <Field
                        label={`${t(
                          'borrowerName',
                        )} *`}
                      >
                        <input
                          required
                          maxLength={
                            120
                          }
                          value={
                            borrowerName
                          }
                          onChange={
                            event => {
                              setBorrowerName(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        />

                        {borrowerName.trim() &&
                          !completeName(
                            borrowerName,
                          ) && (
                            <small
                              style={{
                                color:
                                  '#b91c1c',
                                display:
                                  'block',
                                marginTop:
                                  '6px',
                              }}
                            >
                              {t(
                                'fullNameNeeded',
                              )}
                            </small>
                          )}
                      </Field>


                      <Field
                        label={`${t(
                          'borrowerPhone',
                        )} *`}
                      >
                        <input
                          type="tel"
                          dir="ltr"
                          required
                          maxLength={
                            32
                          }
                          value={
                            borrowerPhone
                          }
                          onChange={
                            event => {
                              setBorrowerPhone(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        />
                      </Field>


                      <Field
                        label={t(
                          'borrowerAddress',
                        )}
                      >
                        <input
                          maxLength={
                            250
                          }
                          value={
                            borrowerAddress
                          }
                          onChange={
                            event => {
                              setBorrowerAddress(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        />
                      </Field>


                      <Field
                        label={`${t(
                          'dueDate',
                        )} *`}
                      >
                        <input
                          type="date"
                          required
                          value={
                            lendingDueDate
                          }
                          onChange={
                            event => {
                              setLendingDueDate(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        />
                      </Field>


                      <div className="portal-full">
                        <Field
                          label={t(
                            'lendingNotes',
                          )}
                        >
                          <textarea
                            rows={5}
                            value={
                              lendingNotes
                            }
                            onChange={
                              event => {
                                setLendingNotes(
                                  event
                                    .target
                                    .value,
                                );

                                setConfirmed(
                                  false,
                                );
                              }
                            }
                          />
                        </Field>
                      </div>


                      <label className="portal-checkbox portal-full">
                        <input
                          type="checkbox"
                          required
                          checked={
                            confirmed
                          }
                          onChange={
                            event =>
                              setConfirmed(
                                event
                                  .target
                                  .checked,
                              )
                          }
                        />

                        {t(
                          'lendingConfirmCheckout',
                        )}
                      </label>


                      <div
                        className="portal-buttons portal-full"
                        style={{
                          justifyContent:
                            'flex-end',
                        }}
                      >
                        <button
                          className="button button-primary"
                          disabled={
                            busy ||
                            !confirmed ||
                            !checkoutEquipmentId ||
                            !completeName(
                              borrowerName,
                            ) ||
                            !borrowerPhone.trim() ||
                            !validDate(
                              lendingDueDate,
                            )
                          }
                        >
                          {t(
                            busy
                              ? 'creating'
                              : 'createCheckout',
                          )}
                        </button>
                      </div>
                    </fieldset>
                  </form>
                )}


              {/* RETURN */}
              {lendingAction ===
                'RETURN' &&
                lendingState ===
                  'ready' && (
                  <form
                    onSubmit={
                      createReturn
                    }
                    style={{
                      marginTop:
                        '1.5rem',
                    }}
                  >
                    {detectedItemCode &&
                      !matchActiveLoan(
                        detectedItemCode,
                        loans,
                      ) && (
                        <div
                          style={{
                            marginBottom:
                              '1rem',
                          }}
                        >
                          <Notice
                            text={t(
                              'loanNoMatch',
                            )}
                          />
                        </div>
                      )}


                    <fieldset
                      className="portal-form-grid"
                      disabled={
                        busy
                      }
                      style={{
                        border: 0,
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <Field
                        label={`${t(
                          'activeLoan',
                        )} *`}
                      >
                        <select
                          required
                          value={
                            returnLoanId
                          }
                          onChange={
                            event => {
                              setReturnLoanId(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        >
                          <option value="">
                            {t(
                              'select',
                            )}
                          </option>

                          {loans
                            .filter(
                              loan =>
                                !loan.returned_at,
                            )
                            .map(
                              loan => (
                                <option
                                  key={
                                    loan.id
                                  }
                                  value={
                                    loan.id
                                  }
                                >
                                  {
                                    loan.equipment_code
                                  }
                                  {' · '}
                                  {
                                    loan.borrower_name
                                  }
                                  {' · #'}
                                  {
                                    loan.id
                                  }
                                </option>
                              ),
                            )}
                        </select>
                      </Field>


                      <Field
                        label={`${t(
                          'returnStatus',
                        )} *`}
                      >
                        <select
                          value={
                            returnStatus
                          }
                          onChange={
                            event => {
                              setReturnStatus(
                                event
                                  .target
                                  .value,
                              );

                              setConfirmed(
                                false,
                              );
                            }
                          }
                        >
                          <option value="AVAILABLE">
                            {t(
                              'available',
                            )}
                          </option>

                          <option value="MAINTENANCE">
                            {t(
                              'maintenance',
                            )}
                          </option>
                        </select>
                      </Field>


                      <div className="portal-full">
                        <Field
                          label={t(
                            'returnNotes',
                          )}
                        >
                          <textarea
                            rows={5}
                            value={
                              returnNotes
                            }
                            onChange={
                              event => {
                                setReturnNotes(
                                  event
                                    .target
                                    .value,
                                );

                                setConfirmed(
                                  false,
                                );
                              }
                            }
                          />
                        </Field>
                      </div>


                      <label className="portal-checkbox portal-full">
                        <input
                          type="checkbox"
                          required
                          checked={
                            confirmed
                          }
                          onChange={
                            event =>
                              setConfirmed(
                                event
                                  .target
                                  .checked,
                              )
                          }
                        />

                        {t(
                          'lendingConfirmReturn',
                        )}
                      </label>


                      <div
                        className="portal-buttons portal-full"
                        style={{
                          justifyContent:
                            'flex-end',
                        }}
                      >
                        <button
                          className="button button-primary"
                          disabled={
                            busy ||
                            !confirmed ||
                            !returnLoanId
                          }
                        >
                          {t(
                            busy
                              ? 'creating'
                              : 'createReturn',
                          )}
                        </button>
                      </div>
                    </fieldset>
                  </form>
                )}


              {!lendingAction &&
                lendingState ===
                  'ready' && (
                  <Notice
                    text={t(
                      'draftOnly',
                    )}
                  />
                )}
            </>
          )}


          {error && (
            <p
              className="portal-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </section>
      )}


      {isEquipment && (
        <section style={{ ...accentCardStyle, marginBottom: '20px' }}>
          <h2>{t('equipmentReview')}</h2>
          <p>{t('equipmentHint')}</p>
          {!canManageLending && <Notice text={t('equipmentPermission')} />}
          {canManageLending && equipmentState === 'loading' && <Notice text={t('equipmentLoading')} />}
          {canManageLending && equipmentState === 'failed' && (
            <>
              <Notice text={t('equipmentFailed')} />
              <button type="button" className="button button-secondary" disabled={busy}
                onClick={() => { setConfirmed(false); setAttempt(value => value + 1); }}>
                {t('retry')}
              </button>
            </>
          )}
          {canManageLending && equipmentState === 'ready' && !matchedEquipment && (
            <Notice text={t('equipmentUnmatched')} />
          )}
          {canManageLending && equipmentState === 'ready' && equipmentOnLoan && (
            <Notice text={t('equipmentOnLoan')} />
          )}
          <form onSubmit={updateEquipment} style={{ marginTop: '1.5rem' }}>
            <fieldset className="portal-form-grid" disabled={busy}
              style={{ border: 0, padding: 0, margin: 0 }}>
              <Field label={t('equipmentCode') + ' *'}>
                <input required value={equipmentCode}
                  onChange={event => { setEquipmentCode(event.target.value); setConfirmed(false); setError(''); }} />
              </Field>
              <Field label={t('equipmentStatus') + ' *'}>
                <select required value={equipmentStatus}
                  onChange={event => { setEquipmentStatus(equipmentDraftStatus(event.target.value)); setConfirmed(false); setError(''); }}>
                  <option value="">{t('select')}</option>
                  <option value="AVAILABLE">{t('available')}</option>
                  <option value="MAINTENANCE">{t('maintenance')}</option>
                  <option value="RETIRED">{t('retired')}</option>
                </select>
              </Field>
              {canManageLending && equipmentState === 'ready' && matchedEquipment && (
                <p className="portal-full">{t('equipment')}: {matchedEquipment.code} · {matchedEquipment.name}</p>
              )}
              <div className="portal-full">
                <Field label={t('notes')}>
                  <textarea rows={5} value={equipmentNotes}
                    onChange={event => { setEquipmentNotes(event.target.value); setConfirmed(false); setError(''); }} />
                </Field>
              </div>
              {canManageLending && equipmentState === 'ready' && matchedEquipment && !equipmentOnLoan && (
                <>
                  <label className="portal-checkbox portal-full">
                    <input type="checkbox" required checked={confirmed}
                      onChange={event => setConfirmed(event.target.checked)} />
                    {t('equipmentConfirm')}
                  </label>
                  <div className="portal-buttons portal-full" style={{ justifyContent: 'flex-end' }}>
                    <button className="button button-primary" disabled={busy || !confirmed || !equipmentStatus}>
                      {t(busy ? 'equipmentSaving' : 'equipmentSave')}
                    </button>
                  </div>
                </>
              )}
            </fieldset>
          </form>
          {error && <p className="portal-error" role="alert">{error}</p>}
        </section>
      )}


      {/* Other future AI modules */}
      {!isVehicle &&
        !isMission &&
        !isLending &&
        !isEquipment && (
          <section
            style={{
              ...accentCardStyle,
              marginBottom:
                '20px',
            }}
          >
            <Notice
              text={t(
                'draftOnly',
              )}
            />

            <pre
              style={{
                marginTop:
                  '1rem',
                whiteSpace:
                  'pre-wrap',
                overflowWrap:
                  'anywhere',
              }}
            >
              {JSON.stringify(
                result.draft,
                null,
                2,
              )}
            </pre>
          </section>
        )}
    </>
  );
}


function QuestionInput({
  question,
  index,
  value,
  disabled,
  locale,
  onChange,
}: {
  question:
    MissingQuestion;

  index: number;

  value: string;

  disabled: boolean;

  locale: Locale;

  onChange:
    (value: string) => void;
}) {
  const t =
    translate(locale);

  const common = {
    name:
      `ai-answer-${index}`,
    value,
    disabled,
  };


  if (
    question.type ===
      'choice' ||
    question.type ===
      'boolean'
  ) {
    const options =
      question.type ===
      'boolean'
        ? [
            t('yes'),
            t('no'),
          ]
        : question.options ||
          [];

    return (
      <select
        {...common}
        onChange={
          event =>
            onChange(
              event.target
                .value,
            )
        }
      >
        <option value="">
          {t('select')}
        </option>

        {options.map(
          (
            option,
            optionIndex,
          ) => (
            <option
              key={
                optionIndex
              }
              value={
                option
              }
            >
              {option}
            </option>
          ),
        )}
      </select>
    );
  }


  if (
    question.type ===
    'textarea'
  ) {
    return (
      <textarea
        {...common}
        rows={3}
        maxLength={
          1000
        }
        onChange={
          event =>
            onChange(
              event.target
                .value,
            )
        }
      />
    );
  }


  return (
    <input
      {...common}
      type={
        question.type ===
        'date'
          ? 'date'
          : question.type ===
              'time'
            ? 'time'
            : 'text'
      }
      maxLength={
        1000
      }
      onChange={
        event =>
          onChange(
            event.target
              .value,
          )
      }
    />
  );
}