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

var last_lect =0;

function chargelecture() {
// pour l instant shoot dans un <span id="results"></span>
    var myurl;
    var timestamp ;
    if ( location.port == 3300){
        myurl = "http://boilerhouse.ddns.net:3300/data.json";  //adapte le json pour la prod
    }else
    {
        myurl= "test/data.json";                                   // pour le dev
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
            var jsonp = JSON.parse(data);
            // noinspection Annotator
            scantanks(jsonp.tanks);
            // noinspection Annotator
            scanvalve(jsonp.valves);
            // noinspection Annotator
            scanpumps(jsonp.pumps);
            // noinspection Annotator
            scanvacuum(jsonp.vacuum);
            var coulee = ( couleeEnCour ? "Coulée en cours" : "Pas de Coulée") ;
            var d = new Date();
            var n = d.toLocaleTimeString();
            var n2 = new Date(last_lect);
            var heure_lecture = n2.toLocaleTimeString();


            $('#Heure_coulee').html("hr "+n+ " lect "+ heure_lecture +"<br>" +coulee);   // met a jour le boutton Pression_temperature dans html
            console.log("hr "+n+ " lect "+ heure_lecture );
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

function last_lecture(lect){
    var d = Date.parse(lect);

    if (d > last_lect) {
        last_lect = d ;
    }

}
function scanpumps(arr) {

    arr.forEach(function (no, i) {
        last_lecture(no['lastUpdatedAt']);
 //       if (toto > last_lect) last_lect = toto ;

        var nom = no['code'];
//        if (nom === 'P1' && no['couleeEnCour'] === 'true' )  p = true ;
        if (DebugON) console.log("pompe " + nom + " state " + no['state'] + " coulee en cour "+no['couleeEnCour'])
        if (p[nom] && no['volume']) {
  //          if (p[nom] && (no['capacity_gph'] !== 0)) {
                p[nom].changeState(no['state'],no['capacity_gph'],no['duty'],no['volume']);
            if (no['couleeEnCour'] === true ) p[nom].coulee = true;
            p[nom].gph = no['capacity_gph']*no['duty'];
            p[nom].gallons = no['volume'];
        }
   //     if (p[nom].search("Vide")) p[nom].changeState(no['state'])

    });
    var gallonstotal = p['P1'].gallons + p['P2'].gallons + p['P3'].gallons;
    var debittotal = p['P1'].gph + p['P2'].gph + p['P3'].gph;

    $('#Total_gallons').html(gallonstotal.toFixed(0) + " g<br>"+debittotal.toFixed(0)+" gph");   // met a jour le boutton Pression_temperature dans html

    if (p['P1'].coulee || p['P2'].coulee || p['P3'].coulee ) {
        couleeEnCour = true ;
    } else {
        couleeEnCour = false ;
    }
}

function scanvalve(arr) {
    arr.forEach(function (no, i) {
        last_lecture(no['lastUpdatedAt']);

        var nom = no['code'];
        if (DebugON) console.log("valve " + nom + " " + no['position'])
        if (v[nom])
            v[nom].changeEtat(no['position']);

    });
}

function scantanks(arr) {

    litreToGalImp = 0.219969 ;  // litre -> gallon imperial
    arr.forEach(function (no, i) {
        last_lecture(no['lastUpdatedAt']);
       /* if (!heure_lecture){
            var d = Date.parse(no['lastUpdatedAt']);
            var n = new Date(d);
            heure_lecture = n.toLocaleTimeString();
        }*/
        var nom = no['code'];
        if (DebugON) console.log("reservoir  " + nom + " " + no['fill'])
        if (r[nom])
            r[nom].changepourcent((no['fill'] / no['capacity'] * 100).toFixed(0), (parseFloat(no['fill'])*litreToGalImp).toFixed(0));


    });
//    return(heure_lecture);
}



//

function outputPression(station) {
    var reponse = " ";

    if ((Date.now() - mytime) > MyDelayMeteo) {
        mytime = Date.now();
        calcule(station);
    }
    if (DebugON) console.log("fin outputpression " + station +" "+ (Date.now() - mytime) +" > " + MyDelayMeteo+ " " + ((Date.now() - mytime) > MyDelayMeteo) );

}
//
function calcule(station) {
    if (DebugON)
        console.log("debut aller chercher " + station);
    var resultat2 = "";
    
       var stationid = "5909403";
    var APIKEY = "4a3e4adc983d218bf0c6346641cc5509";
    var url1 = "./bromontMeteo.json";
    var url2 = "http://api.openweathermap.org/data/2.5/weather?id="+stationid+"&APPID="+APIKEY;
 var today = new Date().toLocaleDateString();

    try{
    $.when($.ajax(url2).done(function (meteo) {
         var temp_c = meteo.main.temp - 273.15 ;
         var pressure_mb = meteo.main.pressure ;
//         console.log(temp.toFixed(1) + " " + pressure);
         
       
//                var observation = parsed_json['current_observation']['observation_time'];
//                observation = observation.replace("Last Updated on ", "");
                var ebulition = TempEbulition(pressure_mb / 10.0);
                var ebuSirop = ebulition + 4;  // ajoute 4 pour sirop
                var ebuSiropF = CtoF(ebuSirop);
                resultat2 = today + "</br> " + pressure_mb.toFixed(0) + " mb " + " ext " +
                        temp_c.toFixed(1) + " oC </br>" +
                        +ebuSiropF.toFixed(1) + " oF " ;
                $('#Pression_temperature').html(resultat2);   // met a jour le boutton Pression_temperature dans html

   })); 
    }catch (err) {
                console.log(" erreur meteostation");
            }
        console.log("fini"); 


    return(resultat2);

}

function oldcalcule(station) {
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
//                resultat2 = n1 +" "+ n2 + "</br> " + pressure_mb.toFixed(0) + " mb " + tendance + " ext " + temp_c.toFixed(1) + " oC </br>" +
                    ebuSirop.toFixed(1) + " oC " + tendance +" "+ ebuSiropF.toFixed(1) + " oF" ;
                resultat2 = n1 +" "+ n2 + "</br> " + pressure_mb.toFixed(0) + " mb " + tendance + " ext " + temp_c.toFixed(1) + " oC </br>" +
                     + ebuSiropF.toFixed(1) + " oF "+tendance ;

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
    var P = kPa ;// ;* mmHg_kPa;
    var temp = ((-5132) / (Math.log(P) - 20.386)) - K;
    // source https://en.wikipedia.org/wiki/Vapour_pressure_of_water
    // P(mmHg) = exp(20.386 - 5132/T)
    // inverse pour f(T)
    // T temperature en kelvin  P en millimetre de mercure  pas en pouces
    //alert (mba + " mba = temp de " + temp) ;
    return (temp);
}



