export type Crew = {
  user_id: number;
  name?: string;
  crew_role: string;
  actual?: boolean;
};

export type Vehicle = {
  id: number;
  code: string;
  plate_number: string;
  type: string;
  model: string;
  year: number | null;
  mileage: number;
  status: string;
};

export type Mission = {
  id: number;
  mission_number: string;
  title: string;
  date: string | null;
  actual_start: string | null;
  actual_end: string | null;
  location: string;
  incident_type: string;
  destination: string;
  notes: string;
  status: string;
  cancellation_reason: string;
  vehicle_id: number | null;
  vehicle_code: string;
  created_by_id: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
  crew: Crew[];
  audit?: {
    id: number;
    actor_name: string;
    action: string;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    created_at: string;
  }[];
};

export type Staff = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type SubmissionStatus =
  | 'NEW'
  | 'REVIEWED'
  | 'CLOSED';

export type ContactSubmission = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: SubmissionStatus;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerApplication = {
  id: number;
  name: string;
  phone: string;
  area: string;
  role: string;
  role_display: string;
  status: SubmissionStatus;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentSummary = {
  total: number;
  available: number;
  on_loan: number;
  overdue: number;
};

export type Equipment = {
  id: number; code: string; type: string; name: string; serial_number: string;
  notes: string; status: 'AVAILABLE' | 'ON_LOAN' | 'MAINTENANCE' | 'RETIRED';
};
export type Loan = {
  id: number; equipment: number; equipment_code: string; equipment_name: string;
  borrower_name: string; borrower_phone: string; borrower_address: string; notes: string;
  due_date: string; checked_out_at: string; checked_out_by_name: string;
  returned_at: string | null; returned_by_name: string | null;
  return_status: string; return_notes: string; is_overdue: boolean;
};

export type Api = <T>(
  path: string,
  method?: 'GET' | 'POST' | 'PATCH',
  body?: unknown,
) => Promise<T>;

export type VehicleIssueSummary = { counts: Record<string, number>; unresolved: number };
export type VehicleIssue = {
  id: number; vehicle: number; vehicle_code: string; vehicle_status: string; manual_maintenance: boolean;
  category: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string; status: 'OPEN' | 'IN_MAINTENANCE' | 'RESOLVED'; maintenance_notes: string;
  reported_by: number; reported_by_name: string; reported_at: string;
  resolved_by: number | null; resolved_by_name: string | null; resolved_at: string | null;
  audit?: { id: number; actor: number; actor_name: string; action: string; created_at: string; before: Record<string, unknown>; after: Record<string, unknown> }[];
};
