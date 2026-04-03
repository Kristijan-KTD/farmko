ALTER TABLE public.profiles ADD COLUMN is_test_account boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN created_by_admin boolean NOT NULL DEFAULT false;