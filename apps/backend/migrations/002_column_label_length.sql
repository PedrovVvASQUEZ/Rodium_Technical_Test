ALTER TABLE columns
  ADD CONSTRAINT columns_label_length CHECK (char_length(trim(label)) BETWEEN 1 AND 120);