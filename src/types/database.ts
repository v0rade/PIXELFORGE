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
      profiles: {
        Row: {
          id: string;
          display_name: string;
          username: string;
          role: "owner" | "client";
          avatar_path: string | null;
          bio: string | null;
          website_url: string | null;
          social_links: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          username: string;
          role?: "owner" | "client";
          avatar_path?: string | null;
          bio?: string | null;
          website_url?: string | null;
          social_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          username?: string;
          avatar_path?: string | null;
          bio?: string | null;
          website_url?: string | null;
          social_links?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          email: string | null;
          company: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          email?: string | null;
          company?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          company?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          original_filename: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          width: number | null;
          height: number | null;
          category: string | null;
          visibility: "private" | "public";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          original_filename: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          width?: number | null;
          height?: number | null;
          category?: string | null;
          visibility?: "private" | "public";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: string | null;
          visibility?: "private" | "public";
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          brief: string | null;
          category: string | null;
          cover_asset_id: string | null;
          status: "draft" | "in_progress" | "in_review" | "completed" | "archived";
          priority: "low" | "medium" | "high" | "urgent";
          visibility: "private" | "public";
          featured: boolean;
          start_date: string | null;
          due_date: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          client_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          brief?: string | null;
          category?: string | null;
          cover_asset_id?: string | null;
          status?: "draft" | "in_progress" | "in_review" | "completed" | "archived";
          priority?: "low" | "medium" | "high" | "urgent";
          visibility?: "private" | "public";
          featured?: boolean;
          start_date?: string | null;
          due_date?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          client_id?: string | null;
          title?: string;
          slug?: string;
          description?: string | null;
          brief?: string | null;
          category?: string | null;
          cover_asset_id?: string | null;
          status?: "draft" | "in_progress" | "in_review" | "completed" | "archived";
          priority?: "low" | "medium" | "high" | "urgent";
          visibility?: "private" | "public";
          featured?: boolean;
          start_date?: string | null;
          due_date?: string | null;
          published_at?: string | null;
          archived_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: "client" | "collaborator";
          invited_by: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: "client" | "collaborator";
          invited_by: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          role?: "client" | "collaborator";
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      project_invitations: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          role: "client" | "collaborator";
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          role?: "client" | "collaborator";
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      asset_tags: {
        Row: {
          asset_id: string;
          tag_id: string;
        };
        Insert: {
          asset_id: string;
          tag_id: string;
        };
        Update: {
          asset_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          visibility: "private" | "public";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          visibility?: "private" | "public";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          visibility?: "private" | "public";
          updated_at?: string;
        };
        Relationships: [];
      };
      collection_assets: {
        Row: {
          collection_id: string;
          asset_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          collection_id: string;
          asset_id: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          position?: number;
        };
        Relationships: [];
      };
      project_assets: {
        Row: {
          project_id: string;
          asset_id: string;
          role: "attachment" | "cover" | "deliverable" | "reference";
          position: number;
          created_at: string;
        };
        Insert: {
          project_id: string;
          asset_id: string;
          role?: "attachment" | "cover" | "deliverable" | "reference";
          position?: number;
          created_at?: string;
        };
        Update: {
          role?: "attachment" | "cover" | "deliverable" | "reference";
          position?: number;
        };
        Relationships: [];
      };
      deliverable_versions: {
        Row: {
          id: string;
          project_id: string;
          asset_id: string;
          version_number: number;
          submitted_by: string;
          review_status: "draft" | "submitted" | "approved" | "changes_requested";
          submitted_at: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          asset_id: string;
          version_number: number;
          submitted_by: string;
          review_status?: "draft" | "submitted" | "approved" | "changes_requested";
          submitted_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          review_status?: "draft" | "submitted" | "approved" | "changes_requested";
          submitted_at?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      revision_comments: {
        Row: {
          id: string;
          deliverable_version_id: string;
          author_id: string;
          body: string;
          comment_type: "comment" | "revision_request" | "approval_note";
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          deliverable_version_id: string;
          author_id: string;
          body: string;
          comment_type?: "comment" | "revision_request" | "approval_note";
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          body?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          project_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          project_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          project_id?: string | null;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          project_id: string | null;
          event_type: string;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          project_id?: string | null;
          event_type: string;
          payload?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      contact_inquiries: {
        Row: {
          id: string;
          portfolio_owner_id: string;
          sender_name: string;
          sender_email: string;
          subject: string | null;
          message: string;
          status: "new" | "read" | "archived";
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_owner_id: string;
          sender_name: string;
          sender_email: string;
          subject?: string | null;
          message: string;
          status?: "new" | "read" | "archived";
          created_at?: string;
        };
        Update: {
          status?: "new" | "read" | "archived";
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
