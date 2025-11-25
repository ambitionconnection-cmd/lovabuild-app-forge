-- Add admin RLS policies for drops table
CREATE POLICY "Admins can insert drops" ON public.drops
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update drops" ON public.drops
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete drops" ON public.drops
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all drops" ON public.drops
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));