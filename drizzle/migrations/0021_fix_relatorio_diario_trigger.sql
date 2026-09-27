CREATE OR REPLACE FUNCTION public.touch_elora_relatorio_diario()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_elora_relatorio_diario ON public.elora_relatorio_diario;
CREATE TRIGGER trg_touch_elora_relatorio_diario BEFORE UPDATE ON public.elora_relatorio_diario
FOR EACH ROW EXECUTE FUNCTION public.touch_elora_relatorio_diario();