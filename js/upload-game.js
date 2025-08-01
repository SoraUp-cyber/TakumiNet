const SUPABASE_URL = 'https://jnszozwcdbtcgughntbq.supabase.co'; // tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc3pvendjZGJ0Y2d1Z2hudGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NTYxMDgsImV4cCI6MjA2MzMzMjEwOH0.mvE3faF9eWfPDulhcAre5JgZaXVTK2PvJJKPEW2KoLE'; // tu anon key

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
