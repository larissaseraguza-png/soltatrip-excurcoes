REVOKE ALL ON FUNCTION public.complete_signup_profile(text, text, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_signup_profile(text, text, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_signup_profile(text, text, public.app_role) TO authenticated;