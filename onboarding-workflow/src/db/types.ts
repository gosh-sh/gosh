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
                    user_id: string
                    github_url: string
                    gosh_url: string
                    dao_bot: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    github_url: string
                    gosh_url: string
                    dao_bot?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    github_url?: string
                    gosh_url?: string
                    dao_bot?: string | null
                    updated_at?: string | null
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
                    onboarded_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    gosh_username: string
                    gosh_pubkey: string
                    auth_user?: string | null
                    onboarded_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    gosh_username?: string
                    gosh_pubkey?: string
                    auth_user?: string | null
                    onboarded_at?: string | null
                }
            }
        }
        Views: {
            auth_users: {
                Row: {
                    instance_id: string | null
                    id: string | null
                    aud: string | null
                    role: string | null
                    email: string | null
                    encrypted_password: string | null
                    email_confirmed_at: string | null
                    invited_at: string | null
                    confirmation_token: string | null
                    confirmation_sent_at: string | null
                    recovery_token: string | null
                    recovery_sent_at: string | null
                    email_change_token_new: string | null
                    email_change: string | null
                    email_change_sent_at: string | null
                    last_sign_in_at: string | null
                    raw_app_meta_data: Json | null
                    raw_user_meta_data: Json | null
                    is_super_admin: boolean | null
                    created_at: string | null
                    updated_at: string | null
                    phone: string | null
                    phone_confirmed_at: string | null
                    phone_change: string | null
                    phone_change_token: string | null
                    phone_change_sent_at: string | null
                    confirmed_at: string | null
                    email_change_token_current: string | null
                    email_change_confirm_status: number | null
                    banned_until: string | null
                    reauthentication_token: string | null
                    reauthentication_sent_at: string | null
                }
                Insert: {
                    instance_id?: string | null
                    id?: string | null
                    aud?: string | null
                    role?: string | null
                    email?: string | null
                    encrypted_password?: string | null
                    email_confirmed_at?: string | null
                    invited_at?: string | null
                    confirmation_token?: string | null
                    confirmation_sent_at?: string | null
                    recovery_token?: string | null
                    recovery_sent_at?: string | null
                    email_change_token_new?: string | null
                    email_change?: string | null
                    email_change_sent_at?: string | null
                    last_sign_in_at?: string | null
                    raw_app_meta_data?: Json | null
                    raw_user_meta_data?: Json | null
                    is_super_admin?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                    phone?: string | null
                    phone_confirmed_at?: string | null
                    phone_change?: string | null
                    phone_change_token?: string | null
                    phone_change_sent_at?: string | null
                    confirmed_at?: string | null
                    email_change_token_current?: string | null
                    email_change_confirm_status?: number | null
                    banned_until?: string | null
                    reauthentication_token?: string | null
                    reauthentication_sent_at?: string | null
                }
                Update: {
                    instance_id?: string | null
                    id?: string | null
                    aud?: string | null
                    role?: string | null
                    email?: string | null
                    encrypted_password?: string | null
                    email_confirmed_at?: string | null
                    invited_at?: string | null
                    confirmation_token?: string | null
                    confirmation_sent_at?: string | null
                    recovery_token?: string | null
                    recovery_sent_at?: string | null
                    email_change_token_new?: string | null
                    email_change?: string | null
                    email_change_sent_at?: string | null
                    last_sign_in_at?: string | null
                    raw_app_meta_data?: Json | null
                    raw_user_meta_data?: Json | null
                    is_super_admin?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                    phone?: string | null
                    phone_confirmed_at?: string | null
                    phone_change?: string | null
                    phone_change_token?: string | null
                    phone_change_sent_at?: string | null
                    confirmed_at?: string | null
                    email_change_token_current?: string | null
                    email_change_confirm_status?: number | null
                    banned_until?: string | null
                    reauthentication_token?: string | null
                    reauthentication_sent_at?: string | null
                }
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
