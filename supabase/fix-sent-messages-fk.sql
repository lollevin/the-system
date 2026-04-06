-- Ensure relational select works for:
-- .select(`*, customer:customer_id(full_name, phone)`)
-- in admin messages pages.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'sent_messages_customer_id_fkey'
      AND table_name = 'sent_messages'
  ) THEN
    ALTER TABLE sent_messages
      ADD CONSTRAINT sent_messages_customer_id_fkey
      FOREIGN KEY (customer_id)
      REFERENCES profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;
