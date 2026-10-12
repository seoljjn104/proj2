-- Fix messages update policy - allow recipients to mark messages as read
DROP POLICY IF EXISTS messages_update_participant ON public.messages;
DROP POLICY IF EXISTS messages_update_own ON public.messages;

-- Recipients can update read_at/delivered_at on messages they received
CREATE POLICY messages_update_recipient
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE requester_id = auth.uid() OR provider_id = auth.uid()
    )
    AND sender_id <> auth.uid()
  )
  WITH CHECK (true);

-- Senders can update their own messages (though they shouldn't need to much)
CREATE POLICY messages_update_sender
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
