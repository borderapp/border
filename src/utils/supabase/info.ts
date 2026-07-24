/**
 * Supabase configuration information
 * Extracted from environment variables or hardcoded values
 */

const supabaseUrl = 'https://ulolufsmjdlramdtstrr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb2x1ZnNtamRscmFtZHRzdHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDYyNTgsImV4cCI6MjA4MzAyMjI1OH0.GJaUnmGH6EhkKjDsmBts7ezUBgX13Wu9NKZx6PzUwBA';

// Extract project ID from URL
export const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
export const publicAnonKey = supabaseAnonKey;
