export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      help_requests: {
        Row: {
          created_at: string;
          id: string;
          need: Database["public"]["Enums"]["service_kind"];
          note: string | null;
          organization_id: string;
          participant_id: string;
          participant_name: string;
          status: Database["public"]["Enums"]["request_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          need: Database["public"]["Enums"]["service_kind"];
          note?: string | null;
          organization_id: string;
          participant_id: string;
          participant_name: string;
          status?: Database["public"]["Enums"]["request_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          need?: Database["public"]["Enums"]["service_kind"];
          note?: string | null;
          organization_id?: string;
          participant_id?: string;
          participant_name?: string;
          status?: Database["public"]["Enums"]["request_status"];
        };
        Relationships: [
          {
            foreignKeyName: "help_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "help_requests_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_applications: {
        Row: {
          created_at: string;
          id: string;
          location: string;
          org_id: string | null;
          organization_name: string;
          reviewed_at: string | null;
          services: Database["public"]["Enums"]["service_kind"][];
          status: Database["public"]["Enums"]["application_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location: string;
          org_id?: string | null;
          organization_name: string;
          reviewed_at?: string | null;
          services: Database["public"]["Enums"]["service_kind"][];
          status?: Database["public"]["Enums"]["application_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string;
          org_id?: string | null;
          organization_name?: string;
          reviewed_at?: string | null;
          services?: Database["public"]["Enums"]["service_kind"][];
          status?: Database["public"]["Enums"]["application_status"];
          user_id?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          location: string;
          name: string;
          org_id: string;
          owner_id: string | null;
          services: Database["public"]["Enums"]["service_kind"][];
        };
        Insert: {
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          org_id: string;
          owner_id?: string | null;
          services: Database["public"]["Enums"]["service_kind"][];
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          org_id?: string;
          owner_id?: string | null;
          services?: Database["public"]["Enums"]["service_kind"][];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          org_id: string | null;
          role: Database["public"]["Enums"]["account_role"];
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          org_id?: string | null;
          role: Database["public"]["Enums"]["account_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          org_id?: string | null;
          role?: Database["public"]["Enums"]["account_role"];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      review_decide_application: {
        Args: {
          application_id: string;
          approve: boolean;
          review_password: string;
        };
        Returns: Json;
      };
      review_list_applications: {
        Args: { review_password: string };
        Returns: {
          contact_email: string;
          created_at: string;
          id: string;
          location: string;
          org_id: string;
          organization_name: string;
          services: Database["public"]["Enums"]["service_kind"][];
          status: Database["public"]["Enums"]["application_status"];
        }[];
      };
      submit_organization_application: {
        Args: {
          location: string;
          organization_name: string;
          services: Database["public"]["Enums"]["service_kind"][];
        };
        Returns: string;
      };
    };
    Enums: {
      account_role: "participant" | "pending_organization" | "organization";
      application_status: "pending" | "approved" | "denied";
      request_status: "pending" | "accepted" | "waitlisted" | "declined";
      service_kind:
        | "shelter"
        | "food"
        | "healthcare"
        | "work"
        | "clothing"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type OrganizationApplication =
  Database["public"]["Tables"]["organization_applications"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"];
export type ServiceKind = Database["public"]["Enums"]["service_kind"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
