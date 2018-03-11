/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//var DebugON = true ;


var couleeEnCour = false ;
var old_pressure = 0;
var UPWARDS_ARROW =  "&uarr;";
var DOWNWARDS_ARROW =  "&darr;";
var LIGNE = "&#9473;";
var EGALE = "&asymp;";

var tendance = LIGNE;
var STATION_METEO = "IQUBECBR2";  // station Mont Soleil a Bromont
// var STATION_METEO = "IQCBROMO5" ;
var mytime = 0;
var MyDelayMeteo = 30*60*1000; // au 30 min

function chargelecture() {
// pour l instant shoot dans un <span id="results"></span>
    var myurl;
    var timestamp ;
    if ( location.port == 3001){
        myurl = "http://boilerhouse.ddns.net:3001/data.json";  //adapte le json pour la prod
    }else
    {
        myurl= "test/data_local.json";                                   // pour le dev
    }

    //start ajax request
    if (DebugON) console.log("output dans chargelecture url = \n"+ myurl);
    try {
    $.ajax({
        url: myurl,
        //force to handle it as text
       dataType: "text",
//        dataType: "jsonp",
        success: function (data) {
//            success: function (jsonp) {

            //data downloaded so we call parseJSON function
            //and pass downloaded data
            var jsonp = $.parseJSON(data);
            timestamp = scantanks(jsonp.tanks);
            scanvalve(jsonp.valves);
            scanpumps(jsonp.pumps);
            scanvacuum(jsonp.vacuum);
            var coulee = ( couleeEnCour ? "Coulée en cours" : "Pas de Coulée") ;
            var d = new Date();
            var n = d.toLocaleTimeString();
            $('#Heure_coulee').html("hr "+n+ " lect "+ timestamp+"<br>" +coulee);   // met a jour le boutton Pression_temperature dans html

        }
    });
    } catch (err) {
        console.log( "erreur de connection" + err);
    }

    outputPression(STATION_METEO);  // station Mont Soleil a Bromont


}// fin chargelecture
function scanvacuum(arr) {
    var facteurCorrection = 0.01 ;
    arr.forEach(function (no, i) {
        var nom = no['code'];
        var val = ((no['rawValue'] - no['offset']) * facteurCorrection).toFixed(1);
        if (DebugON) console.log("vaccum " + nom + " " + val)
        if (u[nom])
            u[nom].changeValeur(val);

    });
}

function scanpumps(arr) {

    arr.forEach(function (no, i) {
        var nom = no['code'];
//        if (nom === 'P1' && no['couleeEnCour'] === 'true' )  p = true ;
        if (DebugON) console.log("pompe " + nom + " " + no['state'] + " "+no['couleeEnCour'])
        if (p[nom]) {
  //          if (p[nom] && (no['capacity_gph'] !== 0)) {
                p[nom].changeState(no['state'],no['capacity_gph'],no['duty'],no['volume']);
            if (no['couleeEnCour'] === true ) p[nom].coulee = true;
        }
   //     if (p[nom].search("Vide")) p[nom].changeState(no['state'])

    });
    if (p['P1'].coulee || p['P2'].coulee || p['P3'].coulee ) {
        couleeEnCour = true ;
    } else {
        couleeEnCour = false ;
    }
}

function scanvalve(arr) {
    arr.forEach(function (no, i) {
        var nom = no['code'];
        if (DebugON) console.log("valve " + nom + " " + no['position'])
        if (v[nom])
            v[nom].changeEtat(no['position']);

    });
}

function scantanks(arr) {
    var heure_lecture = "";
    litreToGalImp = 0.219969 ;  // litre -> gallon imperial
    arr.forEach(function (no, i) {
        if (!heure_lecture){
            var d = Date.parse(no['lastUpdatedAt']);
            var n = new Date(d);
            heure_lecture = n.toLocaleTimeString();
        }
        var nom = no['code'];
        if (DebugON) console.log("reservoir  " + nom + " " + no['fill'])
        if (r[nom])
            r[nom].changepourcent((no['fill'] / no['capacity'] * 100).toFixed(0), (parseFloat(no['fill'])*litreToGalImp).toFixed(0));


    });
    return(heure_lecture);
}



//

function outputPression(station) {
    var reponse = " ";

    if ((Date.now() - mytime) > MyDelayMeteo) {
        mytime = Date.now();
        reponse = calcule(station);
    }
    if (DebugON) console.log("fin outputpression" + station + "  resultat " + reponse);

}
//
function calcule(station) {
    if (DebugON) console.log("debut " + station);
    var resultat2 = "";
    $.ajax({
        url: "http://api.wunderground.com/api/880c2ea0b000d306/conditions/q/pws:" + station + ".json",
        dataType: "jsonp",
        success: function (parsed_json) {
            try {
                //   var t = typeof parsed_json['response']['error']['type'] !== 'undefined' ;

                var pressure_trend = parsed_json['current_observation']['pressure_trend'];
                var pressure_mb = Number(parsed_json['current_observation']['pressure_mb']);
                if (pressure_trend === "+") tendance = UPWARDS_ARROW;
                if (pressure_trend === "-") tendance = DOWNWARDS_ARROW;
                if (pressure_trend === "=") tendance = EGALE;
                old_pressure = pressure_mb;
                var temp_c = parsed_json['current_observation']['temp_c'];
                var observation = parsed_json['current_observation']['observation_time'];
                observation = observation.replace("Last Updated on ","");
                //var pressure_mb = 1012;
                //var temp_c = 5 ;
                var TempStd = [0, 104, 100, 112, 123.9, 120, 117.7, 114.4, 113.8];  // temp vs pression std
                var LabelStd = ["<u>Pression</u><br>mba<br>inHg", "<u>Sirop d’érable</u><br>Celsius<br> Fahrenheit", "Reference<br>eau", "Beurre<br> d’érable", "Sucre<br> granulé", "Sucre<br> très dur", "Sucre<br> dur", "Tire d’érable<br>ou sucre mou", "Tire d’érable<br> sur neige"];
                TempStd[0] = pressure_mb;
                var ebulition = TempEbulition(pressure_mb / 10.0);
                var ebuF = CtoF(ebulition);
                var ebuSirop = ebulition + 4;  // ajoute 4 pour sirop
                var ebuSiropF = CtoF(ebuSirop);
                var coulee = ( couleeEnCour ? "Coulée en cours" : "Pas de Coulée") ;  // ecrit si ca coule en fonction de la pompe P1
                var resultat = "Pression " + pressure_mb.toFixed(0) + " mb </br>" +
                    " T ebul sirop " + ebuSirop.toFixed(1) + " oC </br>" + CtoF(ebuSirop).toFixed(1) + " oF</br>" +
                    "Temp ext " + temp_c.toFixed(1) + " oC";
//                resultat2 = observation + " </br>" + pressure_mb.toFixed(0) + " mb " + pressure_trend + " ext " + temp_c.toFixed(1) + " oC</br>" +
//                    ebuSirop.toFixed(1) + " oC " + LIGNE + CtoF(ebuSirop).toFixed(1) + " oF";
                var d = new Date();
                var n2 = d.toLocaleTimeString();
                var n1 = d.toLocaleDateString();
                resultat2 = n1 +" "+ n2 + "</br> " + pressure_mb.toFixed(0) + " mb " + tendance + " ext " + temp_c.toFixed(1) + " oC </br>" +
                    ebuSirop.toFixed(1) + " oC " + tendance +" "+ ebuSiropF.toFixed(1) + " oF" ;

   //             if (DebugON) console.log("dans le try " +url+" "+ station + " ebulition  " + resultat2);

                $('#Pression_temperature').html(resultat2);   // met a jour le boutton Pression_temperature dans html

            } catch (err) {
                writeError( station);
                outputPression('IQCBROMO5');
            }
        }
    });
    return(resultat2) ;
}

function writeError(station) {

    console.log(station + ' EN PANNE ');
    $('#Pression_temperature').html(station + ' EN PANNE ');

}

function CtoF(t) {
    return ((9.0 / 5.0) * t + 32.0);
}

function mbatoInHg(mba) {
    return (mba * 0.02953);
}


function TempEbulition(kPa) {
    // recoit la pression atms en kilopascal

    // correction en fonction de l altitude
    // At low altitudes above the sea level, the pressure decreases by about 1.2 kPa for every 100 meters
    // https://en.wikipedia.org/wiki/Atmospheric_pressure
    //
    var K = 273.15;  // 0 C en deg kelvin
    var mmHg_kPa = 7.500615613;   // 1 kPa en mmHg
    var P = kPa * mmHg_kPa;
    var temp = ((-5132) / (Math.log(P) - 20.386)) - K;
    // source https://en.wikipedia.org/wiki/Vapour_pressure_of_water
    // P(mmHg) = exp(20.386 - 5132/T)
    // inverse pour f(T)
    // T temperature en kelvin  P en millimetre de mercure  pas en pouces
    //alert (mba + " mba = temp de " + temp) ;
    return (temp);
}



