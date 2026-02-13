#!/bin/bash
# Analyse de saison - Script adapté à la structure de base de données 2026+
# Génère un fichier TSV compatible MS Excel avec virgules décimales et UTF-8

# Vérifie la présence d'un paramètre
if [ $# -eq 0 ] ; then
	echo "Ajouter l'année à analyser à la ligne de commande"
	echo "Usage: $0 <année>"
	exit 1
fi

# Vérifie la validité de l'année
if [ $1 -lt 2021 -o $1 -gt $(date +%Y) ]; then
	echo "Données non disponible pour l'année $1"
	exit 1
fi

year=$1
dbname="Saison_$year"

# Vérifie l'existence de la base de données
dbexist=$(influx -database $dbname -format 'csv' -execute "SHOW MEASUREMENTS" 2>/dev/null | grep -v "^name$" | grep -v "^$")
if [ -z "$dbexist" ]; then
	echo "Erreur: La base de données '$dbname' n'existe pas ou est vide"
	exit 1
fi

# Récupère les dates de début et fin de saison depuis SaisonInfo
# On prend la première date de début parmi toutes les pompes
startTime=$(influx -database $dbname -format 'csv' -execute "SELECT startTime FROM SaisonInfo WHERE pompe = 'P1' ORDER BY time DESC LIMIT 1" 2>/dev/null | awk -F ',' 'NR==2 {print $3}' | tr -d '"')

# Si pas de startTime pour P1, essayer les autres pompes
if [ -z "$startTime" ] || [ "$startTime" == "" ]; then
	startTime=$(influx -database $dbname -format 'csv' -execute "SELECT startTime FROM SaisonInfo ORDER BY time ASC LIMIT 1" 2>/dev/null | awk -F ',' 'NR==2 {print $3}' | tr -d '"')
fi

endTime=$(influx -database $dbname -format 'csv' -execute "SELECT endTime FROM SaisonInfo WHERE pompe = 'P1' ORDER BY time DESC LIMIT 1" 2>/dev/null | awk -F ',' 'NR==2 {print $3}' | tr -d '"')

# Si pas de endTime, utiliser maintenant
if [ -z "$endTime" ] || [ "$endTime" == "" ]; then
	# Compatible macOS et Linux
	if [[ "$OSTYPE" == "darwin"* ]]; then
		endTime=$(date -u +"%Y-%m-%dT%H:%M:%S-05:00")
	else
		endTime=$(date --rfc-3339=seconds | sed 's/ /T/')
	fi
fi

# Si pas de startTime, utiliser le début de l'année
if [ -z "$startTime" ] || [ "$startTime" == "" ]; then
	startTime="${year}-01-01T00:00:00-05:00"
fi

# Fonction pour remplacer les points par des virgules (format décimal français)
convert_decimals() {
	sed 's/\./,/g'
}

# Fonction pour convertir les dates ISO (2024-02-22T10:00:00-05:00) en format Excel (2024-02-22 10:00:00)
convert_date_excel() {
	local input="$1"
	if [ -z "$input" ] || [ "$input" == "" ]; then
		echo ""
		return
	fi
	# Remplace le T par un espace et supprime le fuseau horaire
	echo "$input" | sed 's/T/ /; s/[-+][0-9][0-9]:[0-9][0-9]$//'
}

# Fonction pour convertir les dates dans un flux (pour les requêtes InfluxDB)
convert_dates_in_stream() {
	sed -E 's/([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}:[0-9]{2}:[0-9]{2})[-+][0-9]{2}:[0-9]{2}/\1 \2/g'
}

# Fonction pour formater la sortie CSV en TSV
# - Supprime la colonne time (3e colonne)
# - Place l'en-tête en première ligne
format_output() {
	awk -F',' 'BEGIN { OFS="\t" }
	{
		# Reconstruire la ligne sans la 3e colonne (time)
		line = ""
		for (i=1; i<=NF; i++) {
			if (i != 3) {
				if (line != "") line = line OFS
				line = line $i
			}
		}
		gsub(/deviceName=/, "", line)
		gsub(/meter_name=/, "", line)
		gsub(/line_name=/, "", line)
		gsub(/tank_name=/, "", line)
		gsub(/valve_name=/, "", line)
		gsub(/tags/, "device", line)
		if (/^name/) print "0" line
		else if (line != "") print "1" line
	}' | sort | uniq | cut -c2-
}

# En-tête du fichier
echo -e "********************************************************************************************************************************************************"
echo -e " Sommaire de la saison $year - Base de données: $dbname"
echo -e " Importer dans Excel: Données > À partir d'un fichier texte/CSV"
echo -e " Choisir: Délimiteur TAB, Origine: UNICODE UTF-8"
echo -e "********************************************************************************************************************************************************"
echo

echo -e "Sommaire de la saison\t\t$year"
echo
echo -e "Début\t\t$(convert_date_excel "$startTime")"
echo -e "Fin\t\t$(convert_date_excel "$endTime")"
echo -e "Base de données\t\t$dbname"
echo

# ========== SECTION COULÉE ==========
echo
echo -e "=== COULÉES ==="
echo

echo -e "Nombre de coulées (volume_total > 15g)"
influx -database $dbname -format 'csv' -execute "SELECT COUNT(volume_total) FROM Coulee WHERE etat = 'stop' AND volume_total > 15 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

# ========== SECTION CYCLES (POMPES) ==========
echo
echo -e "=== CYCLES DES POMPES ==="
echo

echo -e "Nombre de cycles (volume > 15g)"
influx -database $dbname -format 'csv' -execute "SELECT COUNT(volume) FROM Cycles WHERE volume > 15 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Statistiques volume des cycles (gal) - Sum, Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT SUM(volume), MEAN(volume), MAX(volume), MIN(volume) FROM Cycles WHERE volume > 0 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Débit (g/h) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(debit_out), MAX(debit_out), MIN(debit_out) FROM Cycles WHERE debit_out > 0 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Temps de marche des pompes (sec) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(ON_time), MAX(ON_time), MIN(ON_time) FROM Cycles WHERE volume > 0 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Temps d'arrêt des pompes en coulée (sec) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(OFF_time), MAX(OFF_time), MIN(OFF_time) FROM Cycles WHERE OFF_time < 10800 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

# ========== SECTION VACUUM ==========
echo
echo -e "=== VACUUM ==="
echo

echo -e "Vacuum aux relâcheurs (inHg) - Mean, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(vacuum), MIN(vacuum) FROM Vacuum WHERE vacuum < -5 AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Vacuum sur les lignes (inHg) - Mean, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(vacuum), MIN(vacuum) FROM Vacuum_ligne WHERE vacuum < -5 AND time > '$startTime' AND time < '$endTime' GROUP BY line_name" 2>/dev/null \
	| sed 's/line_name=//g' | format_output | convert_decimals
echo

echo -e "Température extérieure sur les lignes (°C) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(ext_temp), MAX(ext_temp), MIN(ext_temp) FROM Vacuum_ligne WHERE time > '$startTime' AND time < '$endTime' GROUP BY line_name" 2>/dev/null \
	| sed 's/line_name=//g' | format_output | convert_decimals
echo

echo -e "Niveau de charge batteries lignes (%) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(percentCharge), MAX(percentCharge), MIN(percentCharge) FROM Vacuum_ligne WHERE time > '$startTime' AND time < '$endTime' GROUP BY line_name" 2>/dev/null \
	| sed 's/line_name=//g' | format_output | convert_decimals
echo

echo -e "Référence vacuum lignes (inHg) - Mean"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(ref) FROM Vacuum_ligne WHERE time > '$startTime' AND time < '$endTime' GROUP BY line_name" 2>/dev/null \
	| sed 's/line_name=//g' | format_output | convert_decimals
echo

# ========== SECTION OSMOSE ==========
echo
echo -e "=== SOMMAIRE OSMOSE ==="
echo

# Fonction pour extraire les valeurs d'une requête Osmose et ajouter le tag
osmose_query() {
	local tag="$1"
	local query="$2"
	influx -database $dbname -format 'csv' -execute "$query" 2>/dev/null \
		| awk -F',' -v tag="$tag" 'NR>1 && NF>0 {
			gsub(/deviceName=/, "", $2)
			printf "%s\t%s", $1, tag
			for (i=4; i<=NF; i++) printf "\t%s", $i
			printf "\n"
		}' | convert_decimals
}

# En-tête du tableau
echo -e "name\ttags\tmean\tmax\tmin"

osmose_query "Brix Conc." "SELECT MEAN(brix_conc), MAX(brix_conc), MIN(brix_conc) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Brix Sève" "SELECT MEAN(brix_seve), MAX(brix_seve), MIN(brix_seve) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Col1 (gpm)" "SELECT MEAN(Col1_gpm), MAX(Col1_gpm), MIN(Col1_gpm) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Col2 (gpm)" "SELECT MEAN(Col2_gpm), MAX(Col2_gpm), MIN(Col2_gpm) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Col3 (gpm)" "SELECT MEAN(Col3_gpm), MAX(Col3_gpm), MIN(Col3_gpm) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Col4 (gpm)" "SELECT MEAN(Col4_gpm), MAX(Col4_gpm), MIN(Col4_gpm) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Conc (gpm)" "SELECT MEAN(Conc_gpm), MAX(Conc_gpm), MIN(Conc_gpm) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Température (°C)" "SELECT MEAN(temp_f), MAX(temp_f), MIN(temp_f) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Pression (PSI)" "SELECT MEAN(pression), MAX(pression), MIN(pression) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "PC Conc. (%)" "SELECT MEAN(pc_conc), MAX(pc_conc), MIN(pc_conc) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Concentré (gph)" "SELECT MEAN(gph_conc), MAX(gph_conc), MIN(gph_conc) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Filtrat (gph)" "SELECT MEAN(gph_filt), MAX(gph_filt), MIN(gph_filt) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Débit total (gph)" "SELECT MEAN(gph_tot), MAX(gph_tot), MIN(gph_tot) FROM Osmose WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
osmose_query "Durée (min)" "SELECT MEAN(duree)/60.0, MAX(duree)/60.0, MIN(duree)/60.0 FROM Osmose WHERE fonction = 'concentration' AND time > '$startTime' AND time < '$endTime' GROUP BY deviceName"
echo

# Fonction pour extraire les compteurs Osmose
osmose_count() {
	local label="$1"
	local query="$2"
	local result=$(influx -database $dbname -format 'csv' -execute "$query" 2>/dev/null | awk -F',' 'NR>1 && NF>0 {print $3}')
	if [ -n "$result" ]; then
		echo -e "\t${label}\tcount\t${result}" | convert_decimals
	else
		echo -e "\t${label}"
	fi
}

osmose_count "Nombre d'utilisation de la séquence 1-2-3-4" "SELECT COUNT(state) FROM Osmose WHERE sequence = '1-2-3-4' AND alarmNo = 0 AND state = 'stop' AND time > '$startTime' AND time < '$endTime'"
osmose_count "Nombre d'utilisation de la séquence 4-3-2-1" "SELECT COUNT(state) FROM Osmose WHERE sequence = '4-3-2-1' AND alarmNo = 0 AND state = 'stop' AND time > '$startTime' AND time < '$endTime'"
osmose_count "Nombre de lavages normaux" "SELECT COUNT(state) FROM Osmose WHERE fonction = 'lavage_normal' AND state = 'stop' AND time > '$startTime' AND time < '$endTime'"
osmose_count "Nombre de lavages recirc" "SELECT COUNT(state) FROM Osmose WHERE fonction = 'lavage_recirc' AND state = 'stop' AND time > '$startTime' AND time < '$endTime'"
osmose_count "Nombre de rinçages" "SELECT COUNT(state) FROM Osmose WHERE fonction = '   rinsage   ' AND state = 'stop' AND time > '$startTime' AND time < '$endTime'"
echo

# ========== SECTION RÉSERVOIRS ==========
echo
echo -e "=== RÉSERVOIRS ==="
echo

echo -e "Niveau des réservoirs (gallons) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(fill_gallons), MAX(fill_gallons), MIN(fill_gallons) FROM Reservoirs WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Niveau des réservoirs (%) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(fill_percent), MAX(fill_percent), MIN(fill_percent) FROM Reservoirs WHERE time > '$startTime' AND time < '$endTime' GROUP BY deviceName" 2>/dev/null \
	| format_output | convert_decimals
echo

echo -e "Niveau des tanks (Tank_level) - Mean, Max, Min"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(fill), MAX(fill), MIN(fill) FROM Tank_level WHERE time > '$startTime' AND time < '$endTime' GROUP BY tank_name" 2>/dev/null \
	| sed 's/tank_name=//g' | format_output | convert_decimals
echo

echo -e "Capacité des tanks - Valeur actuelle"
influx -database $dbname -format 'csv' -execute "SELECT LAST(capacity) FROM Tank_level WHERE time > '$startTime' AND time < '$endTime' GROUP BY tank_name" 2>/dev/null \
	| sed 's/tank_name=//g' | format_output | convert_decimals
echo

# ========== SECTION VOLUME D'EAU ==========
echo
echo -e "=== VOLUME D'EAU (COMPTEURS) ==="
echo

echo -e "Volume total par compteur (gallons)"
influx -database $dbname -format 'csv' -execute "SELECT MAX(volume_total) FROM Water_volume WHERE time > '$startTime' AND time < '$endTime' GROUP BY meter_name" 2>/dev/null \
	| sed 's/meter_name=//g' | format_output | convert_decimals
echo

echo -e "Volume par entaille - Mean, Max"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(volume_entaille), MAX(volume_entaille) FROM Water_volume WHERE time > '$startTime' AND time < '$endTime' GROUP BY meter_name" 2>/dev/null \
	| sed 's/meter_name=//g' | format_output | convert_decimals
echo

echo -e "Débit horaire - Mean, Max (gallons/heure)"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(volume_heure), MAX(volume_heure) FROM Water_volume WHERE volume_heure > 0 AND time > '$startTime' AND time < '$endTime' GROUP BY meter_name" 2>/dev/null \
	| sed 's/meter_name=//g' | format_output | convert_decimals
echo

# ========== SECTION VALVES ==========
echo
echo -e "=== VALVES ==="
echo

echo -e "État des valves - Dernière position"
influx -database $dbname -format 'csv' -execute "SELECT LAST(position) FROM Valves WHERE time > '$startTime' AND time < '$endTime' GROUP BY valve_name" 2>/dev/null \
	| sed 's/valve_name=//g' | format_output
echo

echo -e "Code de position des valves - Mean"
influx -database $dbname -format 'csv' -execute "SELECT MEAN(pos_code) FROM Valves WHERE time > '$startTime' AND time < '$endTime' GROUP BY valve_name" 2>/dev/null \
	| sed 's/valve_name=//g' | format_output | convert_decimals
echo

# ========== SECTION SAISON INFO ==========
echo
echo -e "=== INFORMATIONS SAISON ==="
echo

echo -e "Dates de début par pompe"
influx -database $dbname -format 'csv' -execute "SELECT LAST(startTime) FROM SaisonInfo GROUP BY pompe" 2>/dev/null \
	| sed 's/pompe=//g' | format_output | convert_dates_in_stream
echo

echo -e "Dates de fin par pompe"
influx -database $dbname -format 'csv' -execute "SELECT LAST(endTime) FROM SaisonInfo GROUP BY pompe" 2>/dev/null \
	| sed 's/pompe=//g' | format_output | convert_dates_in_stream
echo

echo -e "********************************************************************************************************************************************************"
echo -e " Fin du sommaire"
echo -e "********************************************************************************************************************************************************"
