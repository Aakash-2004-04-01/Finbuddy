-- Fix 1: Remove overly permissive policy on shared_reports
DROP POLICY IF EXISTS "Anyone can view shared reports by token" ON public.shared_reports;

-- Fix 2: Create a secure function to fetch shared reports by token
CREATE OR REPLACE FUNCTION public.get_shared_report_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  report_type text,
  share_token text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, report_type, share_token, expires_at, created_at
  FROM public.shared_reports
  WHERE share_token = p_token
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_shared_report_by_token(text) TO anon, authenticated;