// Hand-written types for the SkillGRID database.
// Regenerate from a linked project with:
//   npx supabase gen types typescript --local > src/types/database.generated.ts

export type SkillType = "OFFERED" | "WANTED";
export type SessionStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
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

/** Row shape of public.get_marketplace_feed(). */
export interface MarketplaceProfile {
  profile_id: string;
  name: string | null;
  bio: string | null;
  offered: string[];
  wanted: string[];
  is_direct_match: boolean;
}

/** Row shape of public.get_reciprocal_matches(). */
export interface ReciprocalMatch {
  partner_id: string;
  partner_name: string | null;
  partner_bio: string | null;
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
