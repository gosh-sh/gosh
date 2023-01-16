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
                    content: string
                    html: string
                    mail_to: string | null
                    intent: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    sent_at?: string | null
                    subject: string
                    content: string
                    html: string
                    mail_to?: string | null
                    intent?: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    sent_at?: string | null
                    subject?: string
                    content?: string
                    html?: string
                    mail_to?: string | null
                    intent?: string
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
                    ignore: boolean
                    objects: number | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    github_url: string
                    gosh_url: string
                    dao_bot?: string | null
                    updated_at?: string | null
                    ignore?: boolean
                    objects?: number | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    github_url?: string
                    gosh_url?: string
                    dao_bot?: string | null
                    updated_at?: string | null
                    ignore?: boolean
                    objects?: number | null
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
            telemetry: {
                Row: {
                    repositories_uploaded: number | null
                    repositories_total: number | null
                    users_total: number | null
                    daos_total: number | null
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
