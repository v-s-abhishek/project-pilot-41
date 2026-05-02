CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow lookups for users who are an admin/owner of at least one
  -- project, or a global admin. Prevents arbitrary user enumeration.
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN (SELECT id FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1);
END;
$$;