// Hand-written types for the SkillGRID database.
// Regenerate from a linked project with:
//   npx supabase gen types typescript --local > src/types/database.generated.ts

export type SkillType = "OFFERED" | "WANTED";
export type SessionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "COMPLETED"
  | "CANCELLED";
export type SessionFormat = "ONLINE" | "IN_PERSON" | "EITHER";
export type NotificationKind =
  | "SESSION_PROPOSED"
  | "SESSION_ACCEPTED"
  | "SESSION_DECLINED"
  | "SESSION_CANCELLED"
  | "SESSION_COMPLETED"
  | "REVIEW_RECEIVED";
export type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  headline: string | null;
  avatar_url: string | null;
  timezone: string | null;
  session_format: SessionFormat;
  availability: string | null;
  is_admin: boolean;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
}

/** Safe projection returned by the get_profile_directory() RPC (no email). */
export interface ProfileDirectory {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface SkillTag {
  id: number;
  name: string;
  category: string | null;
}

export interface UserSkill {
  id: number;
  user_id: string;
  tag_id: number;
  type: SkillType;
}

export interface Session {
  id: string;
  requester_id: string;
  provider_id: string;
  status: SessionStatus;
  scheduled_at: string | null;
  duration_minutes: number;
  meeting_link: string | null;
  teach_tag_id: number | null;
  learn_tag_id: number | null;
  proposal_message: string | null;
  decline_reason: string | null;
  responded_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  session_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Report {
  id: number;
  reporter_id: string;
  reported_id: string;
  reason: string;
  session_id: string | null;
  status: ReportStatus;
  created_at: string;
}

/** Row shape of public.get_reports() (admin only). */
export interface ReportRow {
  id: number;
  reporter_id: string;
  reporter_name: string | null;
  reported_id: string;
  reported_name: string | null;
  reason: string;
  session_id: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface Message {
  id: number;
  session_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Review {
  id: number;
  session_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** One shared to-do on a session's call agenda. */
export interface SessionTodo {
  id: string;
  session_id: string;
  created_by: string;
  body: string;
  done: boolean;
  created_at: string;
}

/** Row shape of public.get_marketplace_feed(). */
export interface MarketplaceProfile {
  profile_id: string;
  name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  offered: string[];
  wanted: string[];
  session_format: SessionFormat;
  is_direct_match: boolean;
}

/** Params accepted by the get_marketplace_feed() RPC. */
export interface MarketplaceFeedParams {
  p_search?: string | null;
  p_offered?: string | null;
  p_wanted?: string | null;
  p_only_direct?: boolean;
  p_format?: SessionFormat | null;
  p_limit?: number;
  p_offset?: number;
}

/** Row shape of public.get_reciprocal_matches(). */
export interface ReciprocalMatch {
  partner_id: string;
  partner_name: string | null;
  partner_bio: string | null;
  partner_avatar_url: string | null;
  skills_you_teach: string[] | null;
  skills_you_gain: string[] | null;
}

/** Row shape of the get_admin_flags() RPC. */
export interface AdminFlagRow {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  avg_rating: number;
  review_count: number;
}
