-- Add RLS policies for admins to manage brands
CREATE POLICY "Admins can insert brands" ON public.brands
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update brands" ON public.brands
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brands" ON public.brands
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all brands" ON public.brands
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add RLS policies for admins to manage shops
CREATE POLICY "Admins can insert shops" ON public.shops
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shops" ON public.shops
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shops" ON public.shops
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));