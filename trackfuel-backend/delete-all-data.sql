SET FOREIGN_KEY_CHECKS = 0;

SELECT GROUP_CONCAT(CONCAT('TRUNCATE TABLE `', table_name, '`;') SEPARATOR ' ')
FROM information_schema.tables
WHERE table_schema = 'trackfuel360';

TRUNCATE TABLE `affectations`; 
TRUNCATE TABLE `bons_carburant_scannes`; 
TRUNCATE TABLE `corrections`; 
TRUNCATE TABLE `geofences`; 
TRUNCATE TABLE `niveaux_carburant`; 
TRUNCATE TABLE `parametres`; 
TRUNCATE TABLE `plein_exif_metadata`; 
TRUNCATE TABLE `pleins`; 
TRUNCATE TABLE `sites`; 
TRUNCATE TABLE `tracegps`; 
TRUNCATE TABLE `trips`; 
TRUNCATE TABLE `users`; 
TRUNCATE TABLE `vehicules`;

SET FOREIGN_KEY_CHECKS = 1;

