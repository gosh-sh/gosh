import * as dotenv from 'https://deno.land/x/dotenv@v3.2.0/mod.ts'
import { getDb } from '../db/db.ts'

dotenv.config({ export: true })

const supabase = getDb()
console.log(new Date())

supabase
    .channel('public:countries')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test' },
        (payload) => {
            console.log('Change received!', payload)
        },
    )
    .subscribe()
