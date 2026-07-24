
CREATE TABLE public.allowed_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, DELETE ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email')::text, '')) = 'iamjiroyano@gmail.com'
$$;

CREATE POLICY "read own email or admin all"
  ON public.allowed_emails FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
    OR public.is_admin()
  );

CREATE POLICY "admin insert"
  ON public.allowed_emails FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin delete"
  ON public.allowed_emails FOR DELETE
  TO authenticated
  USING (public.is_admin() AND lower(email) <> 'iamjiroyano@gmail.com');

INSERT INTO public.allowed_emails(email) VALUES ('iamjiroyano@gmail.com')
ON CONFLICT DO NOTHING;
