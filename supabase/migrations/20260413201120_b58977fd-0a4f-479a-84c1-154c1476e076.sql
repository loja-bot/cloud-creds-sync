
-- Tabela de verificações de idade
CREATE TABLE public.age_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  birth_date DATE NOT NULL,
  selfie_url TEXT,
  document_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  age_category TEXT NOT NULL DEFAULT 'pending' CHECK (age_category IN ('pending', 'minor_under_10', 'minor_10_plus', 'adult_18_plus')),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver sua própria verificação
CREATE POLICY "Users can view own verification"
  ON public.age_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuário pode criar sua verificação
CREATE POLICY "Users can create own verification"
  ON public.age_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuário pode atualizar sua própria verificação (para reenviar docs)
CREATE POLICY "Users can update own verification"
  ON public.age_verifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role pode gerenciar tudo
CREATE POLICY "Service can manage verifications"
  ON public.age_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Bucket para documentos de verificação
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false);

-- Políticas de storage
CREATE POLICY "Users can upload own verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service can manage verification docs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'verification-docs')
  WITH CHECK (bucket_id = 'verification-docs');

-- Função para auto-verificar baseado na idade
CREATE OR REPLACE FUNCTION public.auto_verify_age()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_age INTEGER;
  category TEXT;
BEGIN
  user_age := EXTRACT(YEAR FROM age(NEW.birth_date));
  
  IF user_age < 10 THEN
    category := 'minor_under_10';
    NEW.is_verified := false;
  ELSIF user_age >= 10 AND user_age < 18 THEN
    category := 'minor_10_plus';
    NEW.is_verified := true;
    NEW.verified_at := now();
  ELSE
    category := 'adult_18_plus';
    NEW.is_verified := true;
    NEW.verified_at := now();
  END IF;
  
  NEW.age_category := category;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_verify_age
  BEFORE INSERT OR UPDATE ON public.age_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_age();
