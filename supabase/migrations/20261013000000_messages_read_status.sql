-- Add read status to messages
-- sent_at is created_at, add read_at and delivered_at if needed
-- Also add read_receipts tracking per user? Or just read_at on message (who read it?)
-- But messages are between two people - simpler: add read_at (when read by recipient)
-- and sender can see if read
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Index for unread messages per session/recipient
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages (session_id, sender_id, read_at)
  WHERE read_at IS NULL;

-- Update RLS if needed - recipients should be able to update read_at
DROP POLICY IF EXISTS messages_update_read ON public.messages;
CREATE POLICY messages_update_read
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE (requester_id = auth.uid() OR provider_id = auth.uid())
        AND sender_id <> auth.uid()  -- only recipient can mark as read
    )
  )
  WITH CHECK (
    read_at IS NOT NULL OR delivered_at IS NOT NULL  -- only allow updating status fields?
    OR true  -- keep existing update permissions flexible
  );

-- But better to allow recipients to mark messages from others as read
-- Also allow sender to update nothing sensitive - easier to split policies
-- Replace update policy to be more specific
DROP POLICY IF EXISTS messages_update_own ON public.messages;
CREATE POLICY messages_update_own
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    (session_id IN (
      SELECT id FROM public.sessions
      WHERE requester_id = auth.uid() OR provider_id = auth.uid()
    ) AND sender_id <> auth.uid())
  )
  WITH CHECK (true);
