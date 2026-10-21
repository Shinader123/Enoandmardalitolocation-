-- Inisyalize opsyon peman yo
INSERT INTO payment_methods (nom_methode, est_actif, instructions)
VALUES
  ('MonCash', true, 'Voye peman an sou nimewo MonCash sa a: +509XXXXXX'),
  ('Natcash', true, 'Voye peman an sou nimewo Natcash sa a: +509XXXXXX'),
  ('PayPal', true, 'Voye sou kont PayPal sa a: paypal@locationhaiti.com'),
  ('Kat Kredi / Debikart', true, 'Peye anliy avèk kat debi oswa kredi ou.');
--> statement-breakpoint
-- Inisyalize machin yo ak kontak ak adrès
INSERT INTO items (titre, description, prix_par_jour, disponible, whatsapp, email_contact, adresse)
VALUES
  ('Toyota Land Cruiser', 'Machin zo reken, solid epi pisan pou tout tè ak kondisyon difisil.', 150.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Toyota RAV4 2022', 'Machin tout tè konfòtab ak ekondisyone, otomatik.', 80.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Honda CR-V 2023', 'SUV pratik ak ekonomik pou tout deplasman ou yo.', 80.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Suzuki Vitara', 'Machin solid, pafè pou wout an Ayiti.', 80.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Toyota Hilux Double Cabine 2023', 'Pick-up solid ak pisan, pafè pou tout kalite wout ak gwo chajman.', 120.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Nissan Patrol V8', 'SUV luxueux ak gwo puisans pou chimen difisil ak vwayaj an sekirite.', 140.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Jeep Wrangler Unlimited 2022', 'Machin 4x4 tout tè, stilye epi ideyal pou avanti ak wout mòn.', 130.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique'),
  ('Ford Explorer 2023', 'Gwo SUV Spacious, 7 plas, ideyal pou vwayaj an fanmi ak konfò siperyè.', 110.00, true, '+50930000000', 'contact@locationhaiti.com', 'Cayes, Torbeck, avant courbe Saint Veronique');
