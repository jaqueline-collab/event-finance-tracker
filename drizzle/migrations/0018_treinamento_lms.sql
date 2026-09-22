CREATE TABLE public.elora_trilhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  audiencia text NOT NULL CHECK (audiencia IN ('parceiro','cliente')),
  ativa boolean NOT NULL DEFAULT true,
  pontos_bonus_conclusao integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.elora_trilhas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.elora_trilhas TO authenticated;
GRANT ALL ON public.elora_trilhas TO service_role;
ALTER TABLE public.elora_trilhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trilhas leitura" ON public.elora_trilhas FOR SELECT TO authenticated
  USING (ativa OR public.is_equipe_interna());
CREATE POLICY "trilhas escrita interna" ON public.elora_trilhas FOR ALL TO authenticated
  USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE TABLE public.elora_trilha_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trilha_id uuid NOT NULL REFERENCES public.elora_trilhas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  pontos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trilha_videos_trilha ON public.elora_trilha_videos (trilha_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_trilha_videos TO authenticated;
GRANT ALL ON public.elora_trilha_videos TO service_role;
ALTER TABLE public.elora_trilha_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos leitura" ON public.elora_trilha_videos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elora_trilhas t WHERE t.id = trilha_id AND (t.ativa OR public.is_equipe_interna())));
CREATE POLICY "videos escrita interna" ON public.elora_trilha_videos FOR ALL TO authenticated
  USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE TABLE public.elora_progresso_video (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  usuario_tipo text NOT NULL CHECK (usuario_tipo IN ('parceiro','cliente','interno')),
  video_id uuid NOT NULL REFERENCES public.elora_trilha_videos(id) ON DELETE CASCADE,
  concluido boolean NOT NULL DEFAULT true,
  concluido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
CREATE INDEX idx_progresso_user ON public.elora_progresso_video (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_progresso_video TO authenticated;
GRANT ALL ON public.elora_progresso_video TO service_role;
ALTER TABLE public.elora_progresso_video ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progresso proprio leitura" ON public.elora_progresso_video FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_equipe_interna());
CREATE POLICY "progresso proprio insere" ON public.elora_progresso_video FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "progresso proprio atualiza" ON public.elora_progresso_video FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.elora_niveis_gamificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel integer NOT NULL UNIQUE,
  pontos_minimos integer NOT NULL DEFAULT 0,
  nome text NOT NULL,
  icone text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_niveis_gamificacao TO authenticated;
GRANT ALL ON public.elora_niveis_gamificacao TO service_role;
ALTER TABLE public.elora_niveis_gamificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "niveis leitura" ON public.elora_niveis_gamificacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "niveis escrita interna" ON public.elora_niveis_gamificacao FOR ALL TO authenticated
  USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE TABLE public.elora_medalhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  icone text,
  criterio_tipo text NOT NULL CHECK (criterio_tipo IN ('trilha','pontos','videos')),
  criterio_valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_medalhas TO authenticated;
GRANT ALL ON public.elora_medalhas TO service_role;
ALTER TABLE public.elora_medalhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medalhas leitura" ON public.elora_medalhas FOR SELECT TO authenticated USING (true);
CREATE POLICY "medalhas escrita interna" ON public.elora_medalhas FOR ALL TO authenticated
  USING (public.is_equipe_interna()) WITH CHECK (public.is_equipe_interna());

CREATE TABLE public.elora_medalhas_conquistadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  usuario_tipo text NOT NULL CHECK (usuario_tipo IN ('parceiro','cliente','interno')),
  medalha_id uuid NOT NULL REFERENCES public.elora_medalhas(id) ON DELETE CASCADE,
  conquistada_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, medalha_id)
);
GRANT SELECT, INSERT, DELETE ON public.elora_medalhas_conquistadas TO authenticated;
GRANT ALL ON public.elora_medalhas_conquistadas TO service_role;
ALTER TABLE public.elora_medalhas_conquistadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conquistas proprias leitura" ON public.elora_medalhas_conquistadas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_equipe_interna());
CREATE POLICY "conquistas proprias insere" ON public.elora_medalhas_conquistadas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_touch_elora_trilhas BEFORE UPDATE ON public.elora_trilhas
  FOR EACH ROW EXECUTE FUNCTION public.touch_elora_clientes();

INSERT INTO public.elora_niveis_gamificacao (nivel, pontos_minimos, nome, icone) VALUES
  (1, 0, 'Iniciante', 'Sprout'),
  (2, 100, 'Intermediário', 'Rocket'),
  (3, 300, 'Avançado', 'Flame'),
  (4, 600, 'Especialista', 'Crown');