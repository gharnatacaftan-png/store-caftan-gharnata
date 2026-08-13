-- Migration: Mise à jour complète des tarifs officiels de livraison (58 wilayas)
-- Ajoute les colonnes multilingues et met à jour tous les tarifs

-- Étape 1 : Ajouter les colonnes pour les noms français et anglais (ignorera l'erreur si elles existent déjà)
ALTER TABLE shipping_rates ADD COLUMN name_fr TEXT;
ALTER TABLE shipping_rates ADD COLUMN name_en TEXT;

-- Étape 2 : Supprimer toutes les données existantes pour repartir de zéro avec les tarifs officiels
DELETE FROM shipping_rates;

-- Étape 3 : Insérer les 58 wilayas avec les tarifs officiels et les noms en 3 langues

-- Code 16 : Alger (Zone 0)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (16, 'الجزائر', 'Alger', 'Algiers', 450, 350);

-- Code 9 : Blida (Zone 1)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (9, 'البليدة', 'Blida', 'Blida', 500, 400);

-- Code 35 : Boumerdès (Zone 1)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (35, 'بومرداس', 'Boumerdès', 'Boumerdes', 500, 400);

-- Code 42 : Tipaza (Zone 1)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (42, 'تيبازة', 'Tipaza', 'Tipaza', 500, 400);

-- Code 2 : Chlef (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (2, 'الشلف', 'Chlef', 'Chlef', 650, 550);

-- Code 4 : Oum El Bouaghi (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (4, 'أم البواقي', 'Oum El Bouaghi', 'Oum El Bouaghi', 650, 550);

-- Code 5 : Batna (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (5, 'باتنة', 'Batna', 'Batna', 650, 550);

-- Code 6 : Béjaïa (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (6, 'بجاية', 'Béjaïa', 'Bejaia', 650, 550);

-- Code 10 : Bouira (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (10, 'البويرة', 'Bouira', 'Bouira', 650, 550);

-- Code 13 : Tlemcen (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (13, 'تلمسان', 'Tlemcen', 'Tlemcen', 650, 550);

-- Code 14 : Tiaret (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (14, 'تيارت', 'Tiaret', 'Tiaret', 650, 550);

-- Code 15 : Tizi Ouzou (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (15, 'تيزي وزو', 'Tizi Ouzou', 'Tizi Ouzou', 650, 550);

-- Code 18 : Jijel (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (18, 'جيجل', 'Jijel', 'Jijel', 650, 550);

-- Code 19 : Sétif (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (19, 'سطيف', 'Sétif', 'Setif', 650, 550);

-- Code 20 : Saïda (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (20, 'سعيدة', 'Saïda', 'Saida', 650, 550);

-- Code 21 : Skikda (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (21, 'سكيكدة', 'Skikda', 'Skikda', 650, 550);

-- Code 22 : Sidi Bel Abbès (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (22, 'سيدي بلعباس', 'Sidi Bel Abbès', 'Sidi Bel Abbes', 650, 550);

-- Code 23 : Annaba (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (23, 'عنابة', 'Annaba', 'Annaba', 650, 550);

-- Code 24 : Guelma (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (24, 'قالمة', 'Guelma', 'Guelma', 650, 550);

-- Code 25 : Constantine (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (25, 'قسنطينة', 'Constantine', 'Constantine', 650, 550);

-- Code 26 : Médéa (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (26, 'المدية', 'Médéa', 'Medea', 650, 550);

-- Code 27 : Mostaganem (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (27, 'مستغانم', 'Mostaganem', 'Mostaganem', 650, 550);

-- Code 28 : M'Sila (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (28, 'المسيلة', 'M''Sila', 'M''Sila', 650, 550);

-- Code 29 : Mascara (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (29, 'معسكر', 'Mascara', 'Mascara', 650, 550);

-- Code 31 : Oran (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (31, 'وهران', 'Oran', 'Oran', 650, 550);

-- Code 34 : Bordj Bou Arréridj (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (34, 'برج بوعريريج', 'Bordj Bou Arréridj', 'Bordj Bou Arreridj', 650, 550);

-- Code 36 : El Tarf (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (36, 'الطارف', 'El Tarf', 'El Tarf', 650, 550);

-- Code 38 : Tissemsilt (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (38, 'تيسمسيلت', 'Tissemsilt', 'Tissemsilt', 650, 550);

-- Code 40 : Khenchela (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (40, 'خنشلة', 'Khenchela', 'Khenchela', 650, 550);

-- Code 41 : Souk Ahras (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (41, 'سوق أهراس', 'Souk Ahras', 'Souk Ahras', 650, 550);

-- Code 43 : Mila (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (43, 'ميلة', 'Mila', 'Mila', 650, 550);

-- Code 44 : Aïn Defla (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (44, 'عين الدفلى', 'Aïn Defla', 'Ain Defla', 650, 550);

-- Code 46 : Aïn Témouchent (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (46, 'عين تموشنت', 'Aïn Témouchent', 'Ain Temouchent', 650, 550);

-- Code 48 : Relizane (Zone 2)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (48, 'غليزان', 'Relizane', 'Relizane', 650, 550);

-- Code 3 : Laghouat (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (3, 'الأغواط', 'Laghouat', 'Laghouat', 800, 650);

-- Code 7 : Biskra (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (7, 'بسكرة', 'Biskra', 'Biskra', 800, 650);

-- Code 12 : Tébessa (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (12, 'تبسة', 'Tébessa', 'Tebessa', 800, 650);

-- Code 17 : Djelfa (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (17, 'الجلفة', 'Djelfa', 'Djelfa', 800, 650);

-- Code 30 : Ouargla (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (30, 'ورقلة', 'Ouargla', 'Ouargla', 800, 650);

-- Code 39 : El Oued (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (39, 'الوادي', 'El Oued', 'El Oued', 800, 650);

-- Code 47 : Ghardaïa (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (47, 'غرداية', 'Ghardaïa', 'Ghardaia', 800, 650);

-- Code 51 : Ouled Djellal (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (51, 'أولاد جلال', 'Ouled Djellal', 'Ouled Djellal', 800, 650);

-- Code 55 : Touggourt (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (55, 'تقرت', 'Touggourt', 'Touggourt', 800, 650);

-- Code 49 : El M'Ghair (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (49, 'المغير', 'El M''Ghair', 'El M''Ghair', 800, 650);

-- Code 50 : El Meniaa (Zone 3)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (50, 'المنيعة', 'El Meniaa', 'El Menia', 800, 650);

-- Code 1 : Adrar (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (1, 'أدرار', 'Adrar', 'Adrar', 1600, 1500);

-- Code 8 : Béchar (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (8, 'بشار', 'Béchar', 'Bechar', 1600, 1500);

-- Code 32 : El Bayadh (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (32, 'البيض', 'El Bayadh', 'El Bayadh', 1600, 1500);

-- Code 45 : Naâma (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (45, 'النعامة', 'Naâma', 'Naama', 1600, 1500);

-- Code 54 : Timimoun (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (54, 'تيميمون', 'Timimoun', 'Timimoun', 1600, 1500);

-- Code 52 : Bordj Badji Mokhtar (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (52, 'برج باجي مختار', 'Bordj Badji Mokhtar', 'Bordj Badji Mokhtar', 1600, 1500);

-- Code 53 : Béni Abbès (Zone 4)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (53, 'بني عباس', 'Béni Abbès', 'Beni Abbes', 1600, 1500);

-- Code 11 : Tamanrasset (Zone 5)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (11, 'تمنراست', 'Tamanrasset', 'Tamanrasset', 1600, 1500);

-- Code 33 : Illizi (Zone 5)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (33, 'إليزي', 'Illizi', 'Illizi', 1600, 1500);

-- Code 37 : Tindouf (Zone 5)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (37, 'تندوف', 'Tindouf', 'Tindouf', 1600, 1500);

-- Code 57 : In Salah (Zone 5)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (57, 'عين صالح', 'In Salah', 'In Salah', 1600, 1500);

-- Code 58 : In Guezzam (Zone 5)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (58, 'عين قزام', 'In Guezzam', 'In Guezzam', 1600, 1500);

-- Code 56 : Djanet (Zone 5)
INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk)
VALUES (56, 'جانت', 'Djanet', 'Djanet', 1600, 1500);
