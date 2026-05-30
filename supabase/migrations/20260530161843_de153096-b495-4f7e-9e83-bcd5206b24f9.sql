
CREATE TABLE public.elora_kanban_cards (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  cliente text,
  valor numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'contato',
  data_criacao date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elora_kanban_cards TO authenticated;
GRANT ALL ON public.elora_kanban_cards TO service_role;

ALTER TABLE public.elora_kanban_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select_kanban" ON public.elora_kanban_cards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_insert_kanban" ON public.elora_kanban_cards FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update_kanban" ON public.elora_kanban_cards FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete_kanban" ON public.elora_kanban_cards FOR DELETE TO authenticated USING (user_id = auth.uid());
