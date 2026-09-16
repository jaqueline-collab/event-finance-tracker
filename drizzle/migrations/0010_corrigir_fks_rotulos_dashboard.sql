-- FKs compostas com SET NULL também anulavam cliente_id (NOT NULL) ao excluir um rótulo.
-- Passam a NO ACTION: a exclusão de rótulo limpa as referências antes, no servidor.
ALTER TABLE public.elora_integracao_contas DROP CONSTRAINT fk_int_bloco2_rotulo;
ALTER TABLE public.elora_integracao_contas DROP CONSTRAINT fk_int_bloco3_rotulo;
ALTER TABLE public.elora_integracao_contas DROP CONSTRAINT fk_int_g1s1_rotulo;
ALTER TABLE public.elora_integracao_contas DROP CONSTRAINT fk_int_g1s2_rotulo;
ALTER TABLE public.elora_integracao_contas DROP CONSTRAINT fk_int_g2s1_rotulo;
ALTER TABLE public.elora_integracao_contas DROP CONSTRAINT fk_int_g2s2_rotulo;
ALTER TABLE public.elora_integracao_contas
  ADD CONSTRAINT fk_int_bloco2_rotulo FOREIGN KEY (cliente_id, bloco2_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id),
  ADD CONSTRAINT fk_int_bloco3_rotulo FOREIGN KEY (cliente_id, bloco3_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id),
  ADD CONSTRAINT fk_int_g1s1_rotulo FOREIGN KEY (cliente_id, grafico1_serie1_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id),
  ADD CONSTRAINT fk_int_g1s2_rotulo FOREIGN KEY (cliente_id, grafico1_serie2_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id),
  ADD CONSTRAINT fk_int_g2s1_rotulo FOREIGN KEY (cliente_id, grafico2_serie1_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id),
  ADD CONSTRAINT fk_int_g2s2_rotulo FOREIGN KEY (cliente_id, grafico2_serie2_rotulo_id) REFERENCES public.elora_classificacoes_rotulos (cliente_id, id);