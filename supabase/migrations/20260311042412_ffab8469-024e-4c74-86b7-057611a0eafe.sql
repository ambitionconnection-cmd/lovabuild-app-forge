ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
-- Delete duplicate entries (the old -london suffixed slugs and the old Carnaby Street entry)
DELETE FROM shops WHERE id IN (
  '7bda9a3d-8294-4cdc-a200-875dd84233a5',  -- size-brixton-london (dup of size-brixton)
  '560ea0c5-89d2-48e9-93c7-395517ba028a',  -- size-camden-london (dup of size-camden)
  '16fd0ffd-d078-47fa-a198-b1b0b6b5020e',  -- size-harrods-london (dup of size-harrods)
  '0e59a775-bcc9-45bc-8be4-aa450a0390cb',  -- size-soho-london (dup of size-soho)
  '654d464e-3592-4ab8-8454-c7b16fb8999f'   -- Size? Carnaby Street (dup of size-soho)
);
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;