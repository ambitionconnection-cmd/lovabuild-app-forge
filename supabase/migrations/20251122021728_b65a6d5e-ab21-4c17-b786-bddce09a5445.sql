-- Add INSERT policy for profiles so users can be created via the trigger
CREATE POLICY "Users can insert their own profile during signup" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);