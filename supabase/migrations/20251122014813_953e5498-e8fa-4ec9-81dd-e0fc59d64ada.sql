-- Create enum for shop/brand categories
CREATE TYPE public.category_type AS ENUM ('streetwear', 'sneakers', 'accessories', 'luxury', 'vintage', 'sportswear');

-- Create enum for drop status
CREATE TYPE public.drop_status AS ENUM ('upcoming', 'live', 'ended');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brands table (multi-location brands)
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  history TEXT,
  official_website TEXT,
  instagram_url TEXT,
  category category_type,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shops table (physical locations)
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  email TEXT,
  official_site TEXT,
  image_url TEXT,
  description TEXT,
  is_unique_shop BOOLEAN DEFAULT FALSE,
  category category_type,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drops table (release calendar)
CREATE TABLE public.drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  product_images TEXT[], -- Array of image URLs
  video_url TEXT,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status drop_status DEFAULT 'upcoming',
  affiliate_link TEXT,
  discount_code TEXT,
  is_pro_exclusive BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user favorites for brands
CREATE TABLE public.user_favorite_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- Create user favorites for shops
CREATE TABLE public.user_favorite_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

-- Create user drop reminders
CREATE TABLE public.user_drop_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  drop_id UUID REFERENCES public.drops(id) ON DELETE CASCADE NOT NULL,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, drop_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorite_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorite_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drop_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for brands (public read)
CREATE POLICY "Anyone can view active brands"
  ON public.brands FOR SELECT
  USING (is_active = true);

-- RLS Policies for shops (public read)
CREATE POLICY "Anyone can view active shops"
  ON public.shops FOR SELECT
  USING (is_active = true);

-- RLS Policies for drops
CREATE POLICY "Anyone can view non-pro drops"
  ON public.drops FOR SELECT
  USING (is_pro_exclusive = false);

CREATE POLICY "Pro users can view all drops"
  ON public.drops FOR SELECT
  TO authenticated
  USING (
    is_pro_exclusive = false 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_pro = true 
      AND (profiles.pro_expires_at IS NULL OR profiles.pro_expires_at > NOW())
    )
  );

-- RLS Policies for user favorites - brands
CREATE POLICY "Users can view own favorite brands"
  ON public.user_favorite_brands FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorite brands"
  ON public.user_favorite_brands FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorite brands"
  ON public.user_favorite_brands FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user favorites - shops
CREATE POLICY "Users can view own favorite shops"
  ON public.user_favorite_shops FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorite shops"
  ON public.user_favorite_shops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorite shops"
  ON public.user_favorite_shops FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for drop reminders
CREATE POLICY "Users can view own reminders"
  ON public.user_drop_reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add reminders"
  ON public.user_drop_reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove reminders"
  ON public.user_drop_reminders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update reminders"
  ON public.user_drop_reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drops_updated_at
  BEFORE UPDATE ON public.drops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_shops_brand_id ON public.shops(brand_id);
CREATE INDEX idx_shops_location ON public.shops(latitude, longitude);
CREATE INDEX idx_shops_city ON public.shops(city);
CREATE INDEX idx_drops_brand_id ON public.drops(brand_id);
CREATE INDEX idx_drops_release_date ON public.drops(release_date);
CREATE INDEX idx_drops_status ON public.drops(status);
CREATE INDEX idx_user_favorite_brands_user_id ON public.user_favorite_brands(user_id);
CREATE INDEX idx_user_favorite_shops_user_id ON public.user_favorite_shops(user_id);
CREATE INDEX idx_user_drop_reminders_user_id ON public.user_drop_reminders(user_id);