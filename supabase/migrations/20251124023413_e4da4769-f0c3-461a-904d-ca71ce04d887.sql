-- Fix security definer view warning by explicitly setting security_invoker
-- This makes the view execute with the permissions of the querying user
-- rather than the view creator (which is the secure default we want)
ALTER VIEW public.shops_public SET (security_invoker = true);