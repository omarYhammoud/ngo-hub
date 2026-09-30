import type { Vehicle } from './types';


export const aiCategories = [
  'MISSION',
  'VEHICLE',
  'EQUIPMENT',
  'GENERAL',
] as const;


export const aiUrgencies = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;


export const aiModules = [
  'MISSIONS',
  'VEHICLE_ISSUES',
  'EQUIPMENT',
  'LENDING',
  'GENERAL',
] as const;


export const questionTypes = [
  'text',
  'textarea',
  'choice',
  'date',
  'time',
  'boolean',
] as const;


export type MissingQuestion = {
  field: string;
  question: string;
  type: typeof questionTypes[number];
  options?: string[];
};


export type AIResult = {
  summary: string;

  category:
    typeof aiCategories[number];

  urgency:
    typeof aiUrgencies[number];

  key_details: string[];

  missing_information:
    MissingQuestion[];

  recommended_actions:
    string[];

  suggested_module:
    typeof aiModules[number];

  draft:
    Record<string, unknown>;
};


export type CrewOption = {
  id: number;
  name: string;
};


export type MatchedCrew = {
  id: number;
  name: string;
};


export type CrewMatchResult = {
  matched: MatchedCrew[];
  unmatched: string[];
};


const record = (
  value: unknown,
): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value);


const strings = (
  value: unknown,
): value is string[] =>
  Array.isArray(value) &&
  value.every(
    item =>
      typeof item === 'string',
  );


const member = (
  values: readonly string[],
  value: unknown,
) =>
  typeof value === 'string' &&
  values.includes(value);


/*
 * The backend validates this envelope.
 *
 * Validate it again at the UI boundary so a
 * stale/malformed AI response cannot crash
 * rendering or become a saved record.
 */
export function parseAIResult(
  value: unknown,
): AIResult {
  if (
    !record(value) ||
    typeof value.summary !==
      'string' ||
    !member(
      aiCategories,
      value.category,
    ) ||
    !member(
      aiUrgencies,
      value.urgency,
    ) ||
    !member(
      aiModules,
      value.suggested_module,
    ) ||
    !strings(
      value.key_details,
    ) ||
    !strings(
      value.recommended_actions,
    ) ||
    !record(
      value.draft,
    ) ||
    !Array.isArray(
      value.missing_information,
    ) ||
    !value.missing_information.every(
      question =>
        record(question) &&
        typeof question.field ===
          'string' &&
        typeof question.question ===
          'string' &&
        member(
          questionTypes,
          question.type,
        ) &&
        (
          question.options ===
            undefined ||
          strings(
            question.options,
          )
        ),
    )
  ) {
    throw new Error(
      'Invalid AI response',
    );
  }

  return value as AIResult;
}


export function draftText(
  result: AIResult,
  key: string,
): string {
  return typeof result.draft[
    key
  ] === 'string'
    ? result.draft[
        key
      ] as string
    : '';
}


export function draftStrings(
  result: AIResult,
  key: string,
): string[] {
  const value =
    result.draft[key];

  return strings(value)
    ? value
    : [];
}


function normalize(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\s+/g,
      ' ',
    )
    .toLocaleLowerCase();
}


/*
 * Vehicle matching is deliberately strict.
 *
 * We match only an exact code or exact plate.
 *
 * We do NOT:
 * - use substrings
 * - extract numbers
 * - match by model/type
 * - trust IDs returned by AI
 */
export function matchVehicle(
  name: string,
  vehicles: Vehicle[],
): string {
  const query =
    normalize(name);

  if (!query) {
    return '';
  }

  const matches =
    vehicles.filter(
      vehicle =>
        [
          vehicle.code,
          vehicle.plate_number,
        ].some(
          label =>
            label &&
            normalize(
              label,
            ) === query,
        ),
    );

  return matches.length === 1
    ? String(
        matches[0].id,
      )
    : '';
}


/*
 * Match AI crew names against actual
 * mission crew options.
 *
 * Only exact normalized names are accepted.
 *
 * If the same name somehow exists more than
 * once, it is treated as unmatched so staff
 * must select manually.
 */
export function matchCrewNames(
  names: string[],
  options: CrewOption[],
): CrewMatchResult {
  const matched:
    MatchedCrew[] = [];

  const unmatched:
    string[] = [];

  const usedIds =
    new Set<number>();

  for (
    const rawName of names
  ) {
    const name =
      rawName.trim();

    if (!name) {
      continue;
    }

    const query =
      normalize(name);

    const matches =
      options.filter(
        option =>
          normalize(
            option.name,
          ) === query,
      );

    if (
      matches.length !== 1
    ) {
      unmatched.push(
        name,
      );

      continue;
    }

    const option =
      matches[0];

    if (
      usedIds.has(
        option.id,
      )
    ) {
      continue;
    }

    usedIds.add(
      option.id,
    );

    matched.push({
      id:
        option.id,

      name:
        option.name,
    });
  }

  return {
    matched,
    unmatched,
  };
}


export function draftSeverity(
  result: AIResult,
): string {
  const severity =
    draftText(
      result,
      'severity',
    )
      .trim()
      .toUpperCase();

  return aiUrgencies.includes(
    severity as
      typeof aiUrgencies[number],
  )
    ? severity
    : result.urgency;
}


export function issueDescription(
  description: string,
  questions:
    MissingQuestion[],
  answers:
    Record<string, string>,
  heading: string,
): string {
  const answered =
    questions.flatMap(
      (
        question,
        index,
      ) =>
        answers[
          String(index)
        ]?.trim()
          ? [
              `${question.question}: ${
                answers[
                  String(index)
                ].trim()
              }`,
            ]
          : [],
    );

  return [
    description.trim(),

    ...(
      answered.length
        ? [
            `${heading}\n${answered.join(
              '\n',
            )}`,
          ]
        : []
    ),
  ].join(
    '\n\n',
  );
}


/*
 * Mission helpers
 */

export function missionDraftDate(
  result: AIResult,
): string {
  const value =
    draftText(
      result,
      'date',
    ).trim();

  /*
   * Only accept an ISO date.
   *
   * Relative phrases such as "yesterday"
   * must not silently become a date here.
   */
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  )
    ? value
    : '';
}


export function missionDraftTime(
  result: AIResult,
  key:
    | 'start_time'
    | 'end_time',
): string {
  const value =
    draftText(
      result,
      key,
    ).trim();

  /*
   * Accept HH:MM or HH:MM:SS,
   * but normalize the form value to HH:MM.
   */
  const match =
    value.match(
      /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/,
    );

  if (!match) {
    return '';
  }

  return `${match[1]}:${match[2]}`;
}


export function combineMissionDateTime(
  date: string,
  time: string,
): string | null {
  if (
    !date ||
    !time
  ) {
    return null;
  }

  const local =
    new Date(
      `${date}T${time}:00`,
    );

  if (
    Number.isNaN(
      local.getTime(),
    )
  ) {
    return null;
  }

  return local.toISOString();
}