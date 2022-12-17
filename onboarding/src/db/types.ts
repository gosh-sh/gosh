export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
    public: {
        Tables: {
            dao_bot: {
                Row: {
                    id: string
                    created_at: string | null
                    dao_name: string
                    seed: string
                    pubkey: string
                    secret: string
                    profile_gosh_address: string | null
                    initialized_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    dao_name: string
                    seed: string
                    pubkey: string
                    secret: string
                    profile_gosh_address?: string | null
                    initialized_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    dao_name?: string
                    seed?: string
                    pubkey?: string
                    secret?: string
                    profile_gosh_address?: string | null
                    initialized_at?: string | null
                }
            }
            emails: {
                Row: {
                    id: string
                    created_at: string
                    sent_at: string | null
                    subject: string
                    is_welcome: boolean
                    content: string
                    html: string
                    mail_to: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    sent_at?: string | null
                    subject: string
                    is_welcome?: boolean
                    content: string
                    html: string
                    mail_to?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    sent_at?: string | null
                    subject?: string
                    is_welcome?: boolean
                    content?: string
                    html?: string
                    mail_to?: string | null
                }
            }
            github: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string | null
                    user_id: string
                    github_url: string
                    gosh_url: string
                    dao_bot: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string | null
                    user_id: string
                    github_url: string
                    gosh_url: string
                    dao_bot?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string | null
                    user_id?: string
                    github_url?: string
                    gosh_url?: string
                    dao_bot?: string | null
                }
            }
            github_users: {
                Row: {
                    id: string
                    user_id: string
                    github_user_id: string | null
                    full_name: string | null
                    email: Json
                }
                Insert: {
                    id?: string
                    user_id: string
                    github_user_id?: string | null
                    full_name?: string | null
                    email: Json
                }
                Update: {
                    id?: string
                    user_id?: string
                    github_user_id?: string | null
                    full_name?: string | null
                    email?: Json
                }
            }
            test: {
                Row: {
                    id: number
                    created_at: string | null
                    text: string | null
                    t: number | null
                }
                Insert: {
                    id?: number
                    created_at?: string | null
                    text?: string | null
                    t?: number | null
                }
                Update: {
                    id?: number
                    created_at?: string | null
                    text?: string | null
                    t?: number | null
                }
            }
            users: {
                Row: {
                    id: string
                    created_at: string | null
                    gosh_username: string
                    gosh_pubkey: string
                    auth_user: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    gosh_username: string
                    gosh_pubkey: string
                    auth_user?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    gosh_username?: string
                    gosh_pubkey?: string
                    auth_user?: string | null
                    updated_at?: string | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
