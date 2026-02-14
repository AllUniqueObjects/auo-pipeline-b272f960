
-- =============================================
-- RLS POLICIES FOR ALL UNPROTECTED TABLES
-- =============================================

-- 1. GLOBAL READ-ONLY TABLES (shared intelligence data)
-- Authenticated users can read, only service role can write

-- insights
CREATE POLICY "authenticated_read_insights" ON public.insights
FOR SELECT TO authenticated USING (true);

-- signals
CREATE POLICY "authenticated_read_signals" ON public.signals
FOR SELECT TO authenticated USING (true);

-- clusters
CREATE POLICY "authenticated_read_clusters" ON public.clusters
FOR SELECT TO authenticated USING (true);

-- signal_edges
CREATE POLICY "authenticated_read_signal_edges" ON public.signal_edges
FOR SELECT TO authenticated USING (true);

-- source_registry
CREATE POLICY "authenticated_read_source_registry" ON public.source_registry
FOR SELECT TO authenticated USING (true);

-- brand_context
CREATE POLICY "authenticated_read_brand_context" ON public.brand_context
FOR SELECT TO authenticated USING (true);

-- role_context (global config, read-only)
CREATE POLICY "authenticated_read_role_context" ON public.role_context
FOR SELECT TO authenticated USING (true);

-- tactical_layer (global config, read-only)
CREATE POLICY "authenticated_read_tactical_layer" ON public.tactical_layer
FOR SELECT TO authenticated USING (true);

-- 2. USER-SCOPED TABLES

-- conversations: user_id scoped
CREATE POLICY "conversations_select_own" ON public.conversations
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "conversations_insert_own" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- users: id = auth.uid()
CREATE POLICY "users_select_own" ON public.users
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
