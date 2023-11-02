/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */




var ROUGE = '#ff0000';
var VERT = '#00ff55';
var BLEU = '#709ed2';
var SEVE = BLEU;
var FILTRAT = '#00caca';
var CONCENTRE = '#679966';
var ROUGEPOMPE = '#cd0000';
var ORANGE = '#efa300';
var GRIS = '#c5c5c5';
var OPEN = 1;
var CLOSE = 0;
var PARTIEL = 2;
var FLIP = -1;
var ERREUR = 3;
var MaxSecPompeOn = 3 * 60 * 1000; // 3 min en millisec
var MarioLaPolice = { family: 'Arial Black', size: 16 }; //Arial Black family: 'Arial Black',
var MarioLaPoliceValve = { family: 'Arial Black', size: 15 }; //Arial Black family: 'Arial Black',
//Menlo, sans-serif
//  DEBUG
var AnimON = true;
var DebugON = false;

var dateMessage = new Date;

var BRIXSEVE;
var BRIXCONC;



function go(prod) {
/// prod=false;  // test avec fichiers data.json
    if (prod) {
        setTimeout(chargelecture, 2000); // donne le temps a demarre
        //// met le toggle
        toggle_rf2();
        //        spin();
        //      spin2();
        //      popup();
        setTimeout(total_reservoir, 3000);
        setInterval(total_reservoir, 30 * 1000); //   30 sec  X 1000 
        setInterval(updateHr, 1000); //   30 sec  X 1000 

    } else {
        chargelecturetest();
        setInterval(chargelecturetest, 15000);  //refresh en millisec 10 min 600000
    }

}
function spin() {
    $(window).load(function () {
        $(".trigger_popup_fricc").click(function () {
            $('.hover_bkgr_fricc').show();
        });
        $('.hover_bkgr_fricc').click(function () {
            $('.hover_bkgr_fricc').hide();
        });
        $('.popupCloseButton').click(function () {
            $('.hover_bkgr_fricc').hide();
        });
    });


    $("#spinner").spinner({
        step: 0.2,
        numberFormat: "n",
        max: 20,
        min: 10,
        option: "mouseWheel",
        stop: function (e, ui) {
            change_brix();
            if (DebugON)
                console.log('Triggered after a spin.' + $(this).spinner('value'));
        }
    });
    $("#spinner").width(60);
    $("#spinner").spinner("value", 14);
}

function spin2() {
    $("#spinnerSeve").spinner({
        step: 0.1,
        numberFormat: "n",
        max: 4,
        min: 1,
        option: "mouseWheel",
        stop: function (e, ui) {
            total_reservoir($(this).spinner('value'));
            if (DebugON)
                console.log('Triggered after a spin.' + $(this).spinner('value'));
        }
    });
    $("#spinnerSeve").width(60);
    $("#spinnerSeve").spinner("value", 2);
}

function total_reservoir(brix) {
    var volume_total = r['RS1'].gallons + r['RS2'].gallons + r['RS3'].gallons + r['RS4'].gallons
        + r['RS5'].gallons + r['RS6'].gallons;
    if (r['RF2'].couleur === SEVE) {
        volume_total += r['RF2'].gallons;
    }
    volume_total = volume_total.toFixed(0);
    sirop_total = calcule_brix(BRIXSEVE, volume_total).toFixed(0);
    //    var txt = volume_total + " g. seve => <br>" + sirop_total + " g. sirop";
    var txt = creerTitreDiv(volume_total + "g seve", sirop_total + "g sirop", false);
    $("#texteSeve").html(txt);

}

function toggle_rf2() {
    $('.toggle').toggles({
        drag: true,
        text: {
            on: "S", //S&Egrave;VE
            off: "F"
        },

        width: 50,
        height: 20

    });

    $('.toggle').on('toggle', function (e, active) {
        if (active) {
            r['RF2'].changeCouleur(SEVE);
            total_reservoir();
            if (DebugON)
                console.log('SEVE !');
        } else {
            r['RF2'].changeCouleur(FILTRAT);
            total_reservoir();
            if (DebugON)
                console.log('FILTRAT !');
        }
    });
}

function Composante(type, x, y, dimx, dimy, couleur, etat, anim) {
    this.type = type || undefined;
    this.x = x || 100;
    this.y = y || 100;
    this.dimx = dimx || 100;
    this.dimy = dimy || 0;
    this.couleur = couleur || VERT;
    this.etat = etat || CLOSE;
    this.anim = anim || "";

}


function demarre(draw) {
    var myComposantes = {}; // tableau non definie pour charger x composantes ... grossit en temp reel
    /*    
    Pour donner les positions des differentes composantes (reservoir valves pompes vacuum couleurs ... c'est dans untableau sur google sheet)
            droits de lect/ecr andre gagnon , mario tanguay.  utilisé le url directement chez google pour les tests.  
            puis downloader avec la commande curl dans le repertoire css pour la prod
        	
            */

    ////    var url = 'https://spreadsheets.google.com/feeds/list/1WgLJMCOjQ_m01eUty0JUDH9OKJUVHZZswqJsyJ2ddyo/1/public/values?alt=json';
    //// composante
    ////  curl 'https://spreadsheets.google.com/feeds/list/1WgLJMCOjQ_m01eUty0JUDH9OKJUVHZZswqJsyJ2ddyo/1/public/values?alt=json' > composantes.json    


    var url = 'css/composantes.json';


    //   $.getJSON(url, cellEntries);
    ///   try{
    $.getJSON(url, function (data) {

        $.each(data.feed.entry, function (index, value) {

            myComposantes[value.gsx$composante.$t] = new Composante(value.gsx$type.$t, myNumber(value.gsx$x.$t), myNumber(value.gsx$y.$t),
                myNumber(value.gsx$dimx.$t), myNumber(value.gsx$dimy.$t), value.gsx$couleur.$t,
                value.gsx$etat.$t, value.gsx$animation.$t);
        });
        dessine(draw, myComposantes);
        if (DebugON)
            console.log("output dans demarre après dessine " + url);
    }
    );

    if (DebugON)
        console.log("output fin demarre " + url);
}
function myNumber(n) {  // enleve les espaces et change les , en .  les chiffres dans les spreadsheet google
    var rep = n.replace(/ /g, "");
    rep = rep.replace(/,/g, ".");
    return Number(rep);
}
///// fin chargecomposanteDebugON

///// opensocket

function openSocket() {
    //    var myDevicesOld = [];
    //    var myDevices = [];
    websocket = new WebSocket(wsUri(""), "dashboard-stream");
    websocket.onopen = function (evt) {
        console.log('Socket opened. ' + wsUri(""));
    };
    websocket.onclose = function (evt) {
        console.log('Socket closed.');
        //        alert('Socket closed.');
        setTimeout(function () {
            openSocket();
        }, 5000);
    };
    websocket.onmessage = function (msg) {
        if (DebugON)
            console.log('Socket onmessage.');
        var data = JSON.parse(msg.data);
        ///////////// test
        ///////////      var data2 = updateD(data);
        dateMessage = new Date();
        parseEvent(data);
        ///////////       parseEvent(data2);
        //        coulee();
        gdc();
        outputPression(STATION_METEO);  // station Mont Soleil a Bromont
    };
    websocket.onerror = function (evt) {
        console.error('Socket Error:' + evt);
        //             alert('Socket Error.');
        openSocket.compteur = openSocket.compteur ? openSocket.compteur++ : 1;
        if (openSocket.compteur > 4) {
            alert("Erreur Connection stop");
        }

    };
}
function wsUri(path) {
    var l = window.location;
    if (l.port == 8080) return  ("ws://boilerhouse.ddns.net:3300/" + l.pathname + path); // test sur la prod
    //  return'ws://127.0.0.1:8088/';
 //   if (l.port == 8080) return ('ws://127.0.0.1:8088/'); /// test sur serveur test
    return (l.protocol === "https:") ? "wss://" : "ws://" + l.hostname + (((l.port !== 80) && (l.port !== 443)) ? ":" + l.port : "") + l.pathname + path;


    //    return ((l.protocol === "https:") ? "wss://" : "ws://") + l.hostname + (((l.port !== 80) && (l.port !== 443)) ? ":" + l.port : "") + l.pathname + path;
}


var myDevicesOld = [];
var i = 0;
var firstrun = true;

function parseEvent(data) {

    if (firstrun) {
        ////       creevac(data.vacuum);
        firstrun = false;
        oldparseEvent(data);
    } else {
        ////        updatevac(data.vacuum);
        updatedash(data);
    }
}
function updatedash(data) {
    if (data.devices.length > 0)
        scandevices(data.devices);
    if (data.pumps.length > 0)
        scanpumps(data.pumps);
    if (data.tanks.length > 0)
        scantanks(data.tanks);
    if (data.vacuum.length > 0)
        scanvacuum(data.vacuum);
    if (data.valves.length > 0)
        scanvalve(data.valves);
    if (data.osmose.length > 0)
        scanosmose(data.osmose);
    updateOsmoseDernMAJ(data.osmose);  /// patch pour mettre a jour dern  maj

}

function oldparseEvent(data) {

    var res = [];
    var myDevices = _.map(data.devices, 'lastEventSerial');
    if (i++ > 0) {
        res = _.difference(myDevices, myDevicesOld);
    } else {
        res = myDevices;
    }

    myDevicesOld = myDevices;
    var m_devices = [];
    var m_tanks = [];
    var m_valves = [];
    var m_vaccuum = [];
    var m_pumps = [];
    var m_osmoses = [];
    if (DebugON)
        console.log("myd " + myDevices);
    if (DebugON)
        console.log("Old " + myDevicesOld + "  res " + res);
    if (res !== undefined && res.length != 0) {
        res.forEach(function (myres) {
            var tata = _.clone({ lastEventSerial: myres });
            var particule = _.find(data.devices, tata);  // ancien findWhere
            //                $("a").append( JSON.stringify(particule) + "<br>");
            if (particule) {
                var nom_device = _.clone({ device: particule.name });
                //_.pluck(data.tank,'lastEventSerial');
                var d = _.find(data.devices, _.clone({ name: particule.name }));
                if (d)
                    m_devices.push(d);
                var t = _.find(data.tanks, nom_device);
                if (t)
                    m_tanks.push(t);
                var v = _.filter(data.valves, nom_device);  // ancien where 
                if (v.length > 0) {
                    m_valves.push(v);
                    m_valves = _.flatten(m_valves);
                }
                var vu = _.find(data.vacuum, nom_device);
                if (vu)
                    m_vaccuum.push(vu);
                var p = _.find(data.pumps, nom_device);
                if (p)
                    m_pumps.push(p);
                var o = _.find(data.osmose, nom_device);
                if (o)
                    m_osmoses.push(o);

            }
        });
        if (m_devices.length > 0)
            scandevices(m_devices);

        if (m_pumps.length > 0)
            scanpumps(m_pumps);
        if (m_tanks.length > 0)
            scantanks(m_tanks);
        if (m_vaccuum.length > 0)
            scanvacuum(m_vaccuum);
        if (m_valves.length > 0)
            scanvalve(m_valves);
        if (m_osmoses.length > 0)
            scanosmose(m_osmoses);
        updateOsmoseDernMAJ(data.osmose);  /// patch pour mettre a jour dern  maj
    }
}



var couleeEnCour = false;
var old_pressure = 0;
var UPWARDS_ARROW = "&uarr;";
var DOWNWARDS_ARROW = "&darr;";
var PLATE = "&#9473;";
var EGALE = "&asymp;";

var tendance = EGALE;
var STATION_METEO = "IQUBECBR2";  // station Mont Soleil a Bromont
// var STATION_METEO = "IQCBROMO5" ;
var mytime = 0;
var MyDelayMeteo = 30 * 60 * 1000; // au 30 min

var last_lect = 0;

function chargelecture() {
    // pour l instant shoot dans un <span id="results"></span>


    if (DebugON)
        console.log("output dans chargelecture AVANT socket");

    openSocket();
    if (DebugON)
        console.log("output dans chargelecture APRÈS opensocket");

    return;

}
function chargelecturetest() {
    var myurl;
    // if (location.port === 3001) {
    //     myurl = "http://boilerhouse.ddns.net:3001/data.json";  //adapte le json pour la prod
    // } else {
    //     myurl = "test/data.json";                                   // pour le dev
    // }
    myurl = "test/data.json";
    //start ajax request
    if (DebugON)
        console.log("output dans chargelecture non prod url = \n" + myurl);
    try {
        $.ajax({
            url: myurl,
            //force to handle it as text
            dataType: "text",
            //        dataType: "jsonp",
            success: function (data) {

               var data2 = JSON.parse(data);
                ///////////// test
                ///////////      var data2 = updateD(data);
                dateMessage = new Date();
                parseEvent(data2);
                ///////////       parseEvent(data2);
                //        coulee();
                gdc();
                outputPression(STATION_METEO);  // station Mont Soleil a Bromont
            }
        });
    } catch (err) {
        console.error("erreur de connection" + err);
    }
}// fin chargelecture
function coulee() {
    var coulee = (couleeEnCour ? "Coulée en cours" : "Pas de Coulée");
    var d = new Date();
    var n = d.toLocaleTimeString('fr');
    var n2 = new Date(last_lect);
    var heure_lecture = n2.toLocaleTimeString('fr');
    //   $('#Heure_coulee').html("hr  " + n + "</a>  lect " + heure_lecture + "<br>" + coulee);   // met a jour le boutton Pression_temperature dans html
    $('#Heure_coulee').html("hr  <a id='horloge' >" + n + "</a>  lect " + heure_lecture + "<br>" + coulee);   // met a jour le boutton Pression_temperature dans html
    if (DebugON)
        console.log("hr " + n + " lect " + heure_lecture);
}// fin coulee
function updateHr() {
    var d = new Date();
    var n = d.toLocaleTimeString('fr');
//    console.log(n)
    $('#horloge').html(n);
}
function scanvacuum(arr) {
    var facteurCorrection = 0.01;
    arr.forEach(function (no, i) {
        var nom = no['code'];
        var val = ((no['rawValue'] - no['offset']) * facteurCorrection).toFixed(1);
        if (DebugON)
            console.log("vacuum " + nom + " " + val);
        if (u[nom])
            u[nom].changeValeur(val);
    });
}

function scandevices(arr) {
    arr.forEach(function (no, i) {
        if (no['lastUpdatedAt'])
            last_lecture(no['lastUpdatedAt']);

        if (DebugON)
            console.log("devices " + no['name'] + " lastupdatedat " + Date.parse(no['lastUpdatedAt']));

    });
}

function simple_moving_averager(period) {  // moyenne qui bouge pour le debit
    var nums = [];
    return function (num) {
        if (num) {              // hack  si appel sans nombre  retour le resultat
            nums.push(num);
            if (nums.length > period)
                nums.splice(0, 1);  // remove the first element of the array
        }
        var sum = 0;
        for (var i in nums)
            sum += nums[i];
        var n = period;
        if (nums.length < period)
            n = nums.length;
        return (sum / n);
    };
}


function last_lecture(lect) {
    var d = Date.parse(lect);

    if (d > last_lect) {
        last_lect = d;
    }

}
function scanpumps(arr) {

    arr.forEach(function (no, i) {

        //       if (toto > last_lect) last_lect = toto ;

        var nom = no['code'];
        //        if (nom === 'P1' && no['couleeEnCour'] === 'true' )  p = true ;
        if (DebugON)
            console.log("pompe " + nom + " state " + no['state']);
        if (p[nom] && no['volume']) {
            //          if (p[nom] && (no['capacity_gph'] !== 0)) {
            p[nom].changeState(no['state'], no['capacity_gph'], no['duty'], no['volume']);
            if (no['couleeEnCour'] === true)
                p[nom].coulee = true;
            p[nom].gph = no['capacity_gph'] * no['duty'];
            p[nom].gallons = no['volume'];
        } else {
            if (p[nom])
                p[nom].changeState(no['state']); /// hack pour pompe a vide
        }


    });

}
function gdc() {  // verfie gallonstotal debit et coulee
    var gallonstotal = p['P1'].gallons + p['P2'].gallons + p['P3'].gallons;
    var debittotal = p['P1'].gph + p['P2'].gph + p['P3'].gph;

    $('#Total_gallons').html(gallonstotal.toFixed(0) + " g<br>" + debittotal.toFixed(0) + " gph");   // met a jour le boutton Pression_temperature dans html

    if (p['P1'].coulee || p['P2'].coulee || p['P3'].coulee) {
        couleeEnCour = true;
    } else {
        couleeEnCour = false;
    }
    var coulee = (couleeEnCour ? "Coulée en cours" : "Pas de Coulée");
    var d = new Date();
    var n = d.toLocaleTimeString('fr');
    var n2 = new Date(last_lect);
    var heure_lecture = n2.toLocaleTimeString('fr');

    $('#Heure_coulee').html("hr  <a id='horloge' >" + n + "</a>  lect " + heure_lecture + "<br>" + coulee);   // met a jour le boutton Pression_temperature dans html
    //    $('#Heure_coulee').html("hr " + n + " lect " + heure_lecture + "<br>" + coulee);   // met a jour le boutton Pression_temperature dans html
    if (DebugON)
        console.log("hr " + n + " lect " + heure_lecture);
}
function scanvalve(arr) {
    arr.forEach(function (no, i) {


        var nom = no['code'];
        if (DebugON)
            console.log("valve " + nom + " " + no['position']);
        if (v[nom])
            v[nom].changeEtat(no['position']);

    });
}

function secToLocalTimeString(sec) {
    const gmt = 19 * 60 * 60 * 1000; // 19:00:00 en milli
    return ((new Date(sec * 1000 - gmt)).toLocaleTimeString('fr'));
}

function deltaSec(last) {
    const gmt = 19 * 60 * 60 * 1000 - 1000; // 19:00:00 en milli
    const maintenant = Date.now();
    //var last = new Date;
    var last = Date.parse(osmose.lastUpdatedAt);
    return (maintenant - last - gmt);
    //	return (new Date(now-last-gmt));

}
function updateOsmoseDernMAJ(arr) {
    osmose = arr[0];
    var last = Date.parse(osmose.lastUpdatedAt);
    /// const delta = new Date(now-last-gmt);
    const delta = deltaSec(last);
    const ddelta = new Date(delta);
    $('#majValue').html(ddelta.toLocaleTimeString('fr'));
    // if (osmose.state == 1) {
    //     const newRunTime = new Date(osmose.runTimeSec * 1000 + delta);
    //     //	console.log(newRunTime.toLocaleTimeString('fr'));
    //     $('#runTimeSecValue').html(newRunTime.toLocaleTimeString('fr'));
    // } else {
    //     $('#runTimeSecValue').html("----");
    // }
    //conv date en locale timezone
    /// osmose.lastUpdatedAt = d.toLocaleTimeString('fr');
    //
    //const d = new Date(45000-gmt);

    //console.log(delta.toLocaleTimeString('fr'))

}



var tableauLect = [];
var osmoseDemarre = false;
var osmoseFirst = true;
var LitCookie = false;
// for (i =0; i < 5; i++) {
//     tableauLect[i]=[i,i,i,i,i,i,i];
//     }

function scanosmose(arr) {
    osmose = arr[0];

    osmose.maj = 0;
 

    osLectureCol =
    {
        "lastUpdatedAt": "0",
        "PC_Conc": "1",
        "Total_GPH": "2",
        "BrixSeve": "3",
        "BrixConc": "4",
        "Temp": "5",
        "TempsOperEnCourHHMM": "6"
    };
/*     osLabel  =                  
     {
    	"maj": "dern m.a.j.",     
       "code": "Osm1",
       "device": " ",            
       "state": " ",             
       "fonction": "Op\u00E9ration",          
       "sequence": "sequence",          
       "alarmNo": "No Alarme ",           
       "alarmMsg": "Alarme",          
       "lastUpdatedAt": "dern m.a.j.",     
       "TempsOperEnCour": "Dur\u00E9e op\u00E9r ",   
       "TempsSeq1234": "Temps Seq 1234 ",      
       "TempsSeq4321": "Temps Seq 4321 ",      
       "TempsDepuisLavage": "Dern. Lavage ", 
       "startStopTime": "Temps depart/fin ",     
       "runTimeSec": "Dur\u00E9e ",        
       "PC_Conc": "PC Conc",           
       "Conc_GPH": "Conc",          
       "Filtrat_GPH": "Filtrat",       
       "Total_GPH": "ToTal",         
       "Col1": "C1",              
       "Col2": "C2",              
       "Col3": "C3",              
       "Col4": "C4",              
       "Conc": "D\u00E9bit Conc.",              
       "Temp": "Temp\u00E9rature",              
       "Pres": "Pres",              
       "BrixSeve": "Brix S\u00E8ve",          
       "BrixConc": "Brix Conc"
       }
       ; */
    osUnit =
    {
        "maj": "",
        "code": "",
        "device": "",
        "state": "",
        "fonction": "",
        "sequence": "",
        "alarmNo": "",
        "alarmMsg": "",
        "lastUpdatedAt": "",
        "TempsOperEnCour": "",
        "TempsSeq1234": "",
        "TempsSeq4321": "",
        "TempsDepuisLavageHHMM": " ",
        "startStopTime": "",
        "runTimeSec": " mm:ss",
        "PC_Conc": " %",
        "Conc_GPH": " g/h",
        "Filtrat_GPH": " g/h",
        "Total_GPH": " g/h",
        "Col1": " g/h",
        "Col2": " g/h",
        "Col3": " g/h",
        "Col4": " g/h",
        "Conc": " g/h",
        "Temp": " \u2103 ",
        "Pres": " psi",
        "BrixSeve": " Brix ",
        "BrixConc": " Brix"
    }
        ;


    // // diff entre heure et dern lect va dans nouveau .maj
    updateOsmoseDernMAJ(arr);
    // conv date en mm:ss
    osmose.TempsOperEnCourHHMM = secToLocalTimeString(osmose.TempsOperEnCour);
    osmose.TempsSeq1234 = secToLocalTimeString(osmose.TempsSeq1234);
    osmose.TempsSeq4321 = secToLocalTimeString(osmose.TempsSeq4321);
    osmose.TempsDepuisLavageHHMM = secToLocalTimeString(osmose.TempsDepuisLavage);
  //  osmose.startStopTime = secToLocalTimeString(osmose.startStopTime);
    //osmose.runTimeSec=  secToLocalTimeString( osmose.runTimeSec);    

    // sequence
    if (osmose.sequence == "1-2-3-4") {
        osmose.sequenceValue = osmose.TempsSeq1234;
    } else if (osmose.sequence == "4-3-2-1") {
        osmose.sequenceValue = osmose.TempsSeq4321;
    } else {
        osmose.sequenceValue = "s.o.";  // nouvelle valeur
    }
    $('#TempsSeqValue').html(osmose.sequenceValue);

    // for (const [key, value] of Object.entries(osmose)) {
    // if(key !== 'runTimeSec'){
    // 	$('#'+key+'Label').html(osLabel[key]);
    // 	$('#'+key+'Value').html(value +osUnit[key]);
    // }
    // }		   
    osLabel =
    {
        "state": " ",
        "fonction": "Op\u00E9ration",
        "sequence": "sequence",
        "alarmMsg": "Alarme",
        "maj": "dern m.a.j.",
        "TempsDepuisLavageHHMM": "Dern. Lavage ",
        "startStopTime": "Temps depart/fin ",
        "Temp": "Temp\u00E9rature"  
    };
    /// "TempsOperEnCourHHMM": "Dur\u00E9e ",
  
    for (const [key, value] of Object.entries(osLabel)) {       
            $('#' + key + 'Label').html(value);
            $('#' + key + 'Value').html(osmose[key] + osUnit[key]);      
    }

    if (!LitCookie){
        if(getCookie("tableau")!==""){
        tableauLect=JSON.parse(getCookie("tableau"));
            // test si la ligne[0] != la lecture == arret du browser a on et reparti avant la fin du cycle de concentration
            if( tableauLect[0][1] == osmose.PC_Conc && tableauLect[0][2] == osmose.Total_GPH ){
                 tableauLect.shift(); // efface
                 setCookie("tableau",JSON.stringify(tableauLect),5);
            }
        ecritTableau();
        }
        LitCookie=true;
    }
    var ligne = [];
    for (const [key, value] of Object.entries(osLectureCol)) {
        const v = osmose[key] ;  //  valeur de key
        ligne[value]= v;          // valeur la coll no key
   }
 //  var d = new Date(osmose.lastUpdatedAt);
   ligne[0]=new Date(osmose.startStopTime*1000).toLocaleTimeString('fr').slice(0,5);


   if (osmose.state == 1) {
    if(osmose.fonction == 'concentration'){

        if(osmoseDemarre){
            tableauLect.shift(); // efface premiere ligne pour la remplace
            tableauLect.unshift(ligne); // inserer la ligne no 1
        }else{
            osmoseDemarre=true;
            tableauLect.unshift(ligne); // inserer la ligne no 1
            if (tableauLect.length > 5) tableauLect.pop(); // garde max 5 ligne  efface la derniere   
        }

        ecritTableau();
        setCookie("tableau",JSON.stringify(tableauLect),5);
     //   checkCookie("tableau")

    }
   }else{ // pas osmose  peut-etre fin
    if(osmoseDemarre){
        tableauLect.shift(); // efface premiere ligne pour la remplace
        tableauLect.unshift(ligne); // inserer la ligne no 1
        osmoseDemarre=false;  
        ecritTableau();
    }
  }

  function ecritTableau(){
    for (i = 1; i <= tableauLect.length; i++) {  //reecrit le tableau
        for (j = 1; j <= 7; j++) {
            $('#cell' + j + '_' + i).html(tableauLect[i - 1][j - 1]);
        }
    }
  }


 

    if (osmose.state == 1) {
        osmose.stateValue =
            $('#stateValue').html("ON");
        $(".titre").css("background", "green");
    } else {
        $('#stateValue').html("OFF");
        $(".titre").css("background", "white");
    }
    if (osmose.alarmNo > 1) {
        $("#alarmMsgLabel").css("background", "red");
        $("#alarmMsgValue").css("background", "red");

    } else {

        $("#alarmMsgLabel").css("background", "#c2d6c2");
        $("#alarmMsgValue").css("background", "#c2d6c2");
    }
    if (osmose.alarmNo == 3) {
        $("#TempsDepuisLavageHHMMLabel").css("background", "red");
        $("#TempsDepuisLavageHHMMValue").css("background", "red");

    } else {

        $("#TempsDepuisLavageHHMMLabel").css("background", "#c2d6c2");
        $("#TempsDepuisLavageHHMMValue").css("background", "#c2d6c2");
    }
    if (osmose.TempsDepuisLavage >= 41400) {  // 11:30:00 en sec    
        $("#TempsDepuisLavageHHMMValue").css("color", "yellow");

    } else {    
        $("#TempsDepuisLavageHHMMValue").css("color", "black");
    }
    if (osmose.TempsOperEnCour >=  12600 ) {  // 03:30:00 en sec
        $("#cell7_1").css("background", "yellow"); // derniere colonne premiere ligne

    } else {
        $("#cell7_1").css("background", "#c2d6c2");
    }

    /*
     * arr.forEach(function (no) { // last_lecture(no['lastUpdatedAt']);
     * 
     * for (const [key, value] of Object.entries(no)) {
     *  // console.log("key "+key + " value " + value); ak= '<a
     * id="'+key+'Label">'+key+'</a> '; av= '<a id="'+key+'Value">'+value+'</a> ';
     * deb=" <tr><td>"; m1= "</td><td>"; fin="</td></tr>";
     * console.log(deb+ak+m1+av+fin); } var date_lecture =
     * Date.parse(no['lastUpdatedAt']);
     * 
     * var nom = no['code']; // if (DebugON) // console.log("osmose " + nom + " brix
     * conc "+ no['BrixConc'] +" brix seve " + no['BrixSeve'] + " fonction "+
     * no['fonction']);
     * 
     * }); $("#spinner").spinner("value", BRIXCONC);
     * $("#spinnerSeve").spinner("value", BRIXSEVE);
     */


    BRIXSEVE = osmose.BrixSeve;
    BRIXCONC = osmose.BrixConc;
    total_reservoir(BRIXSEVE);

    change_brix();


}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }
  
  function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }
  
  function checkCookie(cname) {
    var user = getCookie(cname);
    if (user != "") {
      alert(cname+ " " + user);
    } 
  }




function scantanks(arr) {

    litreToGalImp = 0.219969;  // litre -> gallon imperial
    arr.forEach(function (no) {
        //      last_lecture(no['lastUpdatedAt']);
        var date_lecture = Date.parse(no['lastUpdatedAt']);

        /* if (!heure_lecture){
         var d = Date.parse(no['lastUpdatedAt']);
         var n = new Date(d);
         heure_lecture = n.toLocaleTimeString('fr');
         }*/
        var nom = no['code'];
        if (DebugON)
            console.log("reservoir  " + nom + " " + no['fill']);
        if (r[nom] && no['fill'])
            r[nom].changepourcent(no['fill'] / no['capacity'] * 100, no['fill'] * litreToGalImp, date_lecture);


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
    if (DebugON)
        console.log("fin outputpression " + station + " " + (Date.now() - mytime) + " > " + MyDelayMeteo + " " + ((Date.now() - mytime) > MyDelayMeteo));

}
//
function calcule(station) {
    if (DebugON)
        console.log("debut aller chercher " + station);
    var resultat2 = "";

    var stationid = "5909403";
    var APIKEY = "4a3e4adc983d218bf0c6346641cc5509";
    var url1 = "./bromontMeteo.json";
    var url2 = "http://api.openweathermap.org/data/2.5/weather?id=" + stationid + "&APPID=" + APIKEY;
    var today = new Date().toLocaleDateString();

    try {
        $.when($.ajax(url2).done(function (meteo) {
            var temp_c = meteo.main.temp - 273.15;
            var pressure_mb = meteo.main.pressure;
            var ebulition = TempEbulition(pressure_mb / 10.0);  // on recoit en hPa div pour kPa
            var ebuSirop = ebulition + 4;  // ajoute 4 pour sirop
            var ebuSiropF = CtoF(ebuSirop);
            resultat2 = today + "</br> " + pressure_mb.toFixed(0) + " mb " + " ext " +
                temp_c.toFixed(1) + " oC </br>" +
                +ebuSiropF.toFixed(1) + " oF ";
            $('#Pression_temperature').html(resultat2);   // met a jour le boutton Pression_temperature dans html

        }));
    } catch (err) {
        console.log(" erreur meteostation");
    }
    if (DebugON)
        console.log("fini");


    return (resultat2);

}

function oldcalcule(station) {
    if (DebugON)
        console.log("debut aller chercher " + station);
    var resultat2 = "";
    $.ajax({
        url: "http://api.wunderground.com/api/880c2ea0b000d306/conditions/q/pws:" + station + ".json",
        dataType: "jsonp",
        success: function (parsed_json) {
            try {
                //   var t = typeof parsed_json['response']['error']['type'] !== 'undefined' ;

                var pressure_trend = parsed_json['current_observation']['pressure_trend'];
                var pressure_mb = Number(parsed_json['current_observation']['pressure_mb']);
                if (pressure_trend === "+")
                    tendance = UPWARDS_ARROW;
                if (pressure_trend === "-")
                    tendance = DOWNWARDS_ARROW;
                if (pressure_trend === "=")
                    tendance = EGALE;
                old_pressure = pressure_mb;
                var temp_c = parsed_json['current_observation']['temp_c'];
                var observation = parsed_json['current_observation']['observation_time'];
                observation = observation.replace("Last Updated on ", "");
                var ebulition = TempEbulition(pressure_mb / 10.0);
                var ebuSirop = ebulition + 4;  // ajoute 4 pour sirop
                var ebuSiropF = CtoF(ebuSirop);
                resultat2 = observation + "</br> " + pressure_mb.toFixed(0) + " mb " + tendance + " ext " + temp_c.toFixed(1) + " oC </br>" +
                    +ebuSiropF.toFixed(1) + " oF " + tendance;
                $('#Pression_temperature').html(resultat2);   // met a jour le boutton Pression_temperature dans html

            } catch (err) {
                writeError(station);
            }
        }
    });
    return (resultat2);

}

function writeError(station) {

    console.error(station + ' EN PANNE ');
    $('#Pression_temperature').html(' EN PANNE ');

}

function gros_calcule(station) {
    if (DebugON)
        console.log("debut aller chercher " + station);
    var resultat2 = "";
    $.ajax({
        url: "http://api.wunderground.com/api/880c2ea0b000d306/conditions/q/pws:" + station + ".json",
        dataType: "jsonp",
        success: function (parsed_json) {
            try {
                //   var t = typeof parsed_json['response']['error']['type'] !== 'undefined' ;

                var pressure_trend = parsed_json['current_observation']['pressure_trend'];
                var pressure_mb = Number(parsed_json['current_observation']['pressure_mb']);
                if (pressure_trend === "+")
                    tendance = UPWARDS_ARROW;
                if (pressure_trend === "-")
                    tendance = DOWNWARDS_ARROW;
                if (pressure_trend === "=")
                    tendance = EGALE;
                old_pressure = pressure_mb;
                var temp_c = parsed_json['current_observation']['temp_c'];
                var observation = parsed_json['current_observation']['observation_time'];
                observation = observation.replace("Last Updated on ", "");
                //var pressure_mb = 1012;
                //var temp_c = 5 ;
                var TempStd = [0, 104, 100, 112, 123.9, 120, 117.7, 114.4, 113.8];  // temp vs pression std
                var LabelStd = ["<u>Pression</u><br>mba<br>inHg", "<u>Sirop d’érable</u><br>Celsius<br> Fahrenheit", "Reference<br>eau", "Beurre<br> d’érable", "Sucre<br> granulé", "Sucre<br> très dur", "Sucre<br> dur", "Tire d’érable<br>ou sucre mou", "Tire d’érable<br> sur neige"];
                TempStd[0] = pressure_mb;
                var ebulition = TempEbulition(pressure_mb / 10.0);
                var ebuF = CtoF(ebulition);
                var ebuSirop = ebulition + 4;  // ajoute 4 pour sirop
                var ebuSiropF = CtoF(ebuSirop);
                var resultat = "Pression " + pressure_mb.toFixed(0) + " mb </br>" +
                    " T ebul sirop " + ebuSirop.toFixed(1) + " oC </br>" + CtoF(ebuSirop).toFixed(1) + " oF</br>" +
                    "Temp ext " + temp_c.toFixed(1) + " oC";
                var d = new Date();
                var n2 = d.toLocaleTimeString('fr');
                var n1 = d.toLocaleDateString();
                //                resultat2 = n1 +" "+ n2 + "</br> " + pressure_mb.toFixed(0) + " mb " + tendance + " ext " + temp_c.toFixed(1) + " oC </br>" +
                ebuSirop.toFixed(1) + " oC " + tendance + " " + ebuSiropF.toFixed(1) + " oF";
                resultat2 = n1 + " " + n2 + "</br> " + pressure_mb.toFixed(0) + " mb " + tendance + " ext " + temp_c.toFixed(1) + " oC </br>" +
                    +ebuSiropF.toFixed(1) + " oF " + tendance;

                //                if (DebugON) console.log("dans le try " +url+" "+ station + " ebulition  " + resultat2);

                $('#Pression_temperature').html(resultat2);   // met a jour le boutton Pression_temperature dans html

            } catch (err) {
                writeError(station);
                //                outputPression('IQCBROMO5');
            }
        }
    });
    return (resultat2);
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

/// fin chargelecture

///  valve

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global circ */

//  andre gagnon 1 mars 2018



function Background(draw, x, y) {
    this.x = x || 0;
    this.y = y || 0;
    var image = draw.image('css/images/schema.jpg');
}

var r = {};  //reservoir
var v = {};  //valve
var p = {};  //pompe
var u = {};  //vacuum
var a = {};  //animation

function dessine(draw, myComposantes) {
    for (var key in myComposantes) {
        // for-in loop goes over all properties including inherited properties
        // let's use only our own properties
        //      if (myComposantes.hasOwnProperty(key)) {
        if (DebugON)
            console.log("key = " + key);
        //            for ( var k in myComposantes[key]){
        //                if (DebugOn) console.log( "attrib "+ k + " value = " + myComposantes[key][k]);
        //            }
        //        r[key]= draw.circle(myComposantes[key].dimx).fill(myComposantes[key].couleur).cx( myComposantes[key].x ).cy(myComposantes[key].y);

        switch (myComposantes[key].type) {
            case "R":
                r[key] = new Reservoir(draw, key, myComposantes[key].dimx, myComposantes[key].x,
                    myComposantes[key].y, myComposantes[key].couleur);
                break;
            case "V":
                v[key] = new Valve(draw, key, myComposantes[key].x, myComposantes[key].y,
                    myComposantes[key].couleur, myComposantes[key].etat, myComposantes[key].dimx,
                    myComposantes[key].dimy, myComposantes[key].anim);
                break;

            case "P":
                p[key] = new Pompe(draw, key, myComposantes[key].dimx, myComposantes[key].x,
                    myComposantes[key].y, myComposantes[key].couleur);
                break;
            case "U":
                u[key] = new Vacuum(draw, key, myComposantes[key].x,
                    myComposantes[key].y);
                break;
        }

    }

}


function testpourcent(ob) {
    r[ob].changepourcent(rndValue());

}


function rndValue() {
    if (Math.random() > .5) {
        return Math.round(Math.random() * 100);
    } else {
        return (Math.random() * 100).toFixed(1);
    }
}


// Valve properties and method encapsulation
function Valve(draw, nom, x, y, couleur, etat, dimx, dimy, anim) {
    //    this.nom = nom;
    this.x = x || 100;
    this.y = y || 100;
    this.couleur = couleur || VERT;
    this.etat = etat + 0 || OPEN;
    this.dimx = dimx || 10;
    this.dimy = dimy || 0;
    this.recx = 15;
    this.recy = 60;
    this.circ = this.recy / 2;
    this.anim = anim || "";
    if (dimx > dimy) {
        // horizontale on flip le rectangle
        var temp = this.recx;
        this.recx = this.recy;
        this.recy = temp;
    }
    this.b = draw.rect(63, 70).cx(this.x).cy(this.y).fill('#fff');  // rectangle blanc pour effacer

    this.r = draw.rect(this.recx, this.recy).fill(this.couleur).cx(this.x).cy(this.y);


    this.c = draw.circle(this.circ).fill(this.couleur).cx(this.x).cy(this.y);
    if (this.anim !== "" && AnimON) {
        a[nom] = new Ligne(draw, anim);
        a[nom].d();  // cree puis dessine
    }
    this.textNomValve = draw.plain(nom).cx(this.x).cy(this.y) - this.circ - 20;



    this.d = function () {
        r = draw.rect(this.recx, this.recy).fill(this.couleur).cx(this.x).cy(this.y);
        c = draw.circle(this.circ).fill(this.couleur).cx(this.x).cy(this.y);

    };

    this.changeCouleur = function (newc) {
        this.couleur = newc;
        //this.d();
        this.r.fill(this.couleur);
        this.c.fill(this.couleur);

    };
    this.changeEtat = function (textetat) {
        if (textetat === "Ouvert")
            etat = OPEN;
        if (textetat === "Fermé")
            etat = CLOSE;
        if (textetat === "Partiel")
            etat = PARTIEL;

        if (textetat === "Erreur" || textetat === "Partiel") {
            this.changeCouleur(ROUGE);
            etat = PARTIEL;
        }


        if (etat === PARTIEL) {
            this.partiel();
            if (this.anim !== "" && AnimON) {
                a[nom].changeAnim(false);

            }
        }

        if (etat === OPEN) {
            this.changeCouleur(couleur);
            this.ouvre();
            if (this.anim !== "" && AnimON) {
                a[nom].changeAnim(true);
            }
        }
        if (etat === CLOSE) {
            this.changeCouleur(couleur); // on ne change pas la couleur
            this.ferme();
            if (this.anim !== "" && AnimON) {
                a[nom].changeAnim(false);
            }
        }
        this.etat = etat;
        //    }
    };
    this.ouvre = function () {
        this.r.animate().transform({ rotation: 0 }).cy(this.y).cx(this.x);
    };
    this.ferme = function () {
        this.r.animate().transform({ rotation: -90 }).cy(this.y).cx(this.x);
    };
    this.partiel = function () {
        this.r.animate().transform({ rotation: -45 }).cy(this.y).cx(this.x);
    };

    //   this.changeEtat("Fermé"); // par default on change l'etat pour close au depart


}

// Pompe properties and method encapsulation
function Pompe(draw, nom, diam, x, y, couleur) {

    this.diam = diam || 100;
    this.x = x || 100;

    this.y = y || 100;
    this.couleur = GRIS; // couleur || VERT;

    this.coulee = false;
    this.dateDepartPompe = 0; //new Date();
    this.gallons = 0;
    this.gph = 0;



    this.textP = draw.text("test").cx(this.x).cy(this.y).font(MarioLaPolice);
    /*   this.textP.build(false);
     this.textP2 = draw.plain("test").cx(this.x).cy(this.y + toffset + 20).font(MarioLaPolice);
     this.textP2.build(false);
     this.textP3 = draw.plain("test").cx(this.x).cy(this.y + toffset + 40).font(MarioLaPolice);
     this.textP3.build(false);
     */
    this.cblanc = draw.circle(this.diam).cx(this.x).cy(this.y).fill('#fff');
    this.c = draw.circle(this.diam).fill(this.couleur).opacity(0.3).cx(this.x).cy(this.y).stroke({
        color: this.couleur,
        width: 5,
        opacity: 0.8
    });
    this.textnomPompe = draw.plain(nom).font(MarioLaPolice) //  {family: 'Helvetica', size: 20})
        .cx(this.x - this.diam * 0.6)
        .cy(this.y - this.diam * 0.6);
    /*    this.textnomValve.click(function () {
     testpourcent(nom);
     });
     */

    this.des = function (couleur) {
        this.c.remove();
        this.c = draw.circle(this.diam).fill(couleur).cx(this.x).cy(this.y).opacity(.5);
    };


    this.changeState = function (state, capacity, duty, volume) {

        //      var textP =
        if (state === false) {
            op = 1;
            //            this.c.fill(BLANC).opacity(1);
            ///   this.c.remove();
            this.des(GRIS);
            ///   this.c.fill(GRIS).opacity(1);
            ;
            this.dateDepartPompe = 0;      //reset le compteur
        }
        if (state === true) {
            if (!this.dateDepartPompe) {
                this.dateDepartPompe = Date.now();
                //                this.c.fill(BLANC).opacity(1);
                ///    this.c.fill(VERT).opacity(1);      // pompe on vert ok
                this.des(VERT);
                if (DebugON)
                    console.log("pompe " + nom + " démarré");
            } else {
                if ((Date.now() - this.dateDepartPompe) > MaxSecPompeOn && volume) {  // hack pour ne pas toucher au vacuum
                    this.des(ORANGE);
                    ////this.c.fill(ORANGE).opacity(1);
                    ;

                    if (DebugON)
                        console.log("pompe " + nom + " dépasse la durée");
                }
            }

        }
        var toffset = 0;  //-20
        if (volume) {  // hack pas elegant pour pompe a vide  ... pas de texte  pas de volume  ...
            //            this.textP.opacity(0);
            ////            if (this.textP)
            /////            this.textP.clear();
            this.textP.remove();
            //            this.textP = draw.plain((duty * 100).toFixed(0) + "%").cx(this.x).cy(this.y + toffset);
            this.textP = draw.text((duty * 100).toFixed(0) + "%\n" +
                (capacity * duty).toFixed(0) + " g/h\n" + volume.toFixed(0) + " g").font(MarioLaPolice).cx(this.x).cy(this.y + toffset);
            /*            this.textP2.opacity(0);
             //            this.textP2= undefined ;
             this.textP2 = draw.plain((capacity * duty).toFixed(0) + " g/h").cx(this.x).cy(this.y + toffset + 20);
             //        if (contient > 0)
             this.textP3.opacity(0);
             //            this.textP3 = undefined;
             this.textP3 = draw.plain(volume.toFixed(0) + " g").cx(this.x).cy(this.y + toffset + 40);
             */
            //        this.textP.text(parseInt(this.pourcent, 10) + "%").move(this.x,(this.y + toffset));
        }
        //        this.c.opacity(op);

    };


}

function Vacuum(draw, nom, x, y, valeur) {


    this.x = x || 100;

    this.y = y || 100;
    //    this.valeur = valeur || 0;


    //    this.textV = draw.text(this.valeur+" in").cx(this.x).cy(this.y);
    this.textV = draw.text(0 + " in").move(this.x - 30, this.y).font(MarioLaPolice);
    //    this.textV.build(false);


    this.changeValeur = function (valeur) {
        /////        if (this.textV)
        /////            this.textV.clear(); //opacity(0);
        this.textV.remove();

        this.textV = draw.text(valeur + " in").font(MarioLaPolice).move(this.x - 30, this.y - 10);
        //        this.textV.opacity(1);

    };


}


function Ligne(draw, anim) {
    var re = /\s*,\s*/;
    var s = anim.split(re);
    var vh = s[0];
    var sens = s[1];
    var x = s[2];
    var y = s[3];
    var rx = s[4];
    var longeur = s[5];
    var couleur = s[6];
    this.circ = {};
    this.d = function () {

        if (vh === 'H') {
            //       var line = draw.line(0, longeur, longeur, longeur).move(x, y);
            //       line.stroke({color: BLEU, width: rx, linecap: 'round', opacity: '0.4'});
            if (sens === '>') {
                this.circ = draw.circle(rx).move(x - rx / 2, y - rx / 2).fill(couleur);
                this.circ.animate({ ease: sens, delay: '3.5s' }).attr({ fill: couleur }).animate().dmove(longeur, 0).loop();
                this.circ.pause();
            } else {
                this.circ = draw.circle(rx).move(longeur + x - rx / 2, y - rx / 2).fill(couleur);
                this.circ.animate({
                    ease: sens,
                    delay: '3.5s'
                }).attr({ fill: 'couleur' }).animate().dmove(-longeur, 0).loop();
                this.circ.pause();
            }
        } else {
            //        var line = draw.line(0, 0, 0, longeur).move(x, y);
            //        line.stroke({color: BLEU, width: rx, linecap: 'round', opacity: '0.4'});
            if (sens === '>') {
                this.circ = draw.circle(rx).move(x - rx / 2, y - rx / 2).fill(couleur);
                this.circ.animate({ ease: sens, delay: '3.5s' }).attr({ fill: couleur }).animate().dmove(0, longeur).loop();
                this.circ.pause();
            } else {
                this.circ = draw.circle(rx).move(x - rx / 2, longeur + y - rx / 2).fill(couleur);
                this.circ.animate({
                    ease: sens,
                    delay: '3.5s'
                }).attr({ fill: couleur }).animate().dmove(0, -longeur).loop();
                this.circ.pause();
            }
        }
    };

    this.mypause = function () {
        this.circ.pause();
    };
    this.myplay = function () {
        this.circ.play();
    };
    this.changeAnim = function (state) {
        var op = 0;
        if (state === false) {
            this.mypause();
        }
        if (state === true) {
            this.myplay();
        }

    };
}


function Reservoir(draw, nom, diam, x, y, couleur) {

    this.diam = diam || 100;
    this.x = x || 100;
    this.y = y || 100;
    this.couleur = couleur || GRIS;
    this.liquide = nom.charAt(1);  // C concentre  S  seve  F filtrat
    // pour debit
    this.lecture = { d: 0, gallons: 0 };
    this.oldlecture = this.lecture;
    this.periode = 60;
    //    this.debitMoyen = 0.0;
    //    this.lsma = simple_moving_averager(1);  ///3
    //    this.dsma = simple_moving_averager(1);
    //    this.sma1 = simple_moving_averager(this.periode);
    //    this.smadebit = simple_moving_averager(1);
    //    this.debitInstantane = 0.0;
    this.gallons = 0.0;
    this.pct = 0.0;

    this.nom = nom;
    var dvide = [
        "M", x, y,
        "h", 10,
        "v", 10
    ].join(" ");
    var strokeWidth = 7.5; // cercle exterieur
    this.p = draw.path(dvide).fill({ color: this.couleur, opacity: 0.8 });
    // stroke({color: couleur, width: 5, opacity: 0.8});
    this.textP = draw.text("test").move(this.x, this.y).font(MarioLaPolice);
    /*     this.textP.build(false);
     this.textP2 = draw.text("test").move(this.x, this.y + 15).font(MarioLaPolice);
     this.textP2.build(false);
     */
    this.cblanc = draw.circle(this.diam).cx(this.x).cy(this.y).fill('#fff');
    this.c = draw.circle(this.diam).fill(this.couleur).opacity(0.3).cx(this.x).cy(this.y).stroke({
        color: this.couleur, //this.couleur,
        width: strokeWidth,
        opacity: 1
    });

    this.textnom = draw.plain(nom).font(MarioLaPolice)
        .cx(this.x - this.diam * 0.6)
        .cy(this.y - this.diam * 0.6);

    this.changeCouleur = function (newc) {

        this.couleur = newc;
        this.changepourcent(this.pct, this.gallons, this.lecture.d)//this.d();
    };
    this.changePourtour = function (pourcent) {
        mynewcolor = this.couleur; // reservoir par default
        if (pourcent >= 75 && pourcent < 90) {
            mynewcolor = VERT;
        }
        if (pourcent >= 90) {
            mynewcolor = ROUGE;
        }
        ////  this.c.opacity(0);
        this.c.remove();
        //      this.c = undefined ;
        this.c = draw.circle(this.diam).fill({ color: this.couleur, opacity: 0.4 }).cx(this.x).cy(this.y).stroke({
            color: mynewcolor, //this.couleur,
            width: strokeWidth,
            opacity: 1
        });
        //    return(mynewcolor);
    };
    ////    var sma3 = simple_moving_averager(20);
    /*        if (this.nom === 'RS2' || this.nom === 'RS1') {
     //            if (this.olddatelecture === 0) {
     //                this.olddatelecture = datelecture;
     //            }
     //            if (this.oldcontient === 0) {
     //                this.oldcontient = contient;
     //              }
     //          if (this.oldcontient < contient) {
     if (this.olddatelecture !== 0 && (datelecture - this.olddatelecture) > 2000) { // skip premiere lecture deux lecture en bas de 2 sec 2000 mil
     var mdebit = debit(contient - this.oldcontient, datelecture - this.olddatelecture);
     this.debitInstantane = mdebit;
     this.debitMoyen = sma3(mdebit);
     console.log(this.nom, pourcent, contient, datelecture + " debit inst " + this.debitInstantane.toFixed(0) + " debit moy " + this.debitMoyen.toFixed(0));
     }
     this.olddatelecture = datelecture;
     this.oldcontient = contient;
     
     //          }
     }
     */
    this.compteur = 0;

    this.cd = function () {
        this.compteur++;
        if (!(this.compteur++ % 3)) {
            this.calcule_debit(1);
        }

    };
    /*
     //   this.calcule_debit = function () {
     //       if (this.oldlecture['d'] !== 0) {  //skip lecture
     var d = debit(this.lecture['gallons'] - this.oldlecture['gallons'], this.lecture['d'] - this.oldlecture['d']);
     if (d) {  // saute premiere lect
     this.debitInstantane = d;
     this.debitMoyen = this.smadebit(this.debitInstantane);
     if (debugdebit)
     console.log(this.nom + " " + this.lecture['gallons'] + " " + this.oldlecture['gallons'] + " = " + (this.lecture['gallons'] - this.oldlecture['gallons']) +
     " " + this.lecture['d'] + " " + this.oldlecture['d'] + " = " + (this.lecture['d'] - this.oldlecture['d']) + " debit inst " + this.debitInstantane.toFixed(0) + " debit moy " + this.debitMoyen.toFixed(0));
     this.oldlecture = this.lecture;
     } else {
     if (debugdebit)
     console.log(this.nom + "skip premiere lecture");
     }
     } else
     /           this.oldlecture = this.lecture;
     };
     */
    this.changepourcent = function (pourcent, contient, datelecture) {
        this.gallons = contient;
        this.pct = pourcent;
        // on affiche quand meme  ...because possible appel par la fonction de mise a jour du brix
        var contient_gal_sirop = 0;
        this.changePourtour(pourcent);

        var arc = pourcentToArc(pourcent);
        var desc = describeArc(this.x, this.y, (this.diam - strokeWidth) / 2, 180 - arc / 2.0, 180 + arc / 2.0);
        //  var offset = parseFloat(desc.split(' ')[10])/2;
        //   if (DebugON) console.log( offset + " " +pourcent+ " pourcent " + describeArc(this.diam/2, this.diam/2, this.diam/2, 180-arc/2.0, 180+arc/2.0));

        this.p.remove();
        this.p = draw.path(desc).fill({ color: this.couleur, opacity: 0.8 });

        this.textP.remove();
        var toffset = pourcent > 50 ? -10 : -10;    // 10 -25
        var txtpourcent_gal = parseInt(pourcent, 10) + "%\n";
        if ((contient >= 0) && (this.liquide === 'C')) {
            contient_gal_sirop = calcule_brix(BRIXCONC, contient);
            txtpourcent_gal = txtpourcent_gal + contient.toFixed(0) + "\n" + contient_gal_sirop.toFixed(0) + " S";

        } else {
            if (contient >= 0)
                txtpourcent_gal = txtpourcent_gal + contient.toFixed(0);
        }
        this.textP = draw.text(txtpourcent_gal).font(MarioLaPolice).cx(this.x).cy(this.y + toffset);
        /*        this.textP = draw.plain(parseInt(this.pourcent, 10) + "%").cx(this.x).cy(this.y + toffset);
         if (contient > 0) this.textP2 = draw.plain( contient).cx(this.x).cy(this.y + toffset + 15 );
         */
        //        this.textP.text(parseInt(this.pourcent, 10) + "%").move(this.x,(this.y + toffset));


    };
} // fin reservoir
/*
 function debit(gal, sec) {
 
 if (sec > 0) { //  division par zero no good
 if (debugdebit)
 console.log("debit " + gal + " " + sec + " " + (gal / (sec / (60.0 * 60.0 * 1000.0))).toFixed(0));
 return(gal / (sec / (60.0 * 60.0 * 1000.0)));  // gal a l'heure de millisec a heure  
 } else {
 return (false);  // ne retourne pas une lecture avec 0 sec entre les deux   fausse la moyenne
 }
 }
 */
var premiere_run = 0;
var premiere_run_debug = 0;


function newDateString(min) {
    return moment().add(min * 10, 'm').toDate(); //.format(timeFormat);
}



function init_niv(no) {
    var index = 0;
    while (index < no) {
        niv[index++] = [];
    }
}

function res_gallons(reservoirs, arr, niv, total) {
    var result = 0;

    arr.forEach(function (key, index) {
        if (!isNaN(reservoirs[key].gallons.toFixed(0))) {
            niv[index].push({ x: newDateString(0), y: reservoirs[key].gallons.toFixed(0) });
        } else {
            niv[index].push({ x: newDateString(0), y: 0 });
        }
    });
    if (total)
        niv[arr.length].push({ x: newDateString(0), y: total.toFixed(0) });
}

/*
 function add_res_debit(reservoirs, arr) {
 var result = 0;
 arr.forEach(function (key, index) {
 if (!isNaN(reservoirs[key].smadebit().toFixed(3))) {
 result += reservoirs[key].smadebit();
 }
 });
 return(result);
 }
 */
function find_int(num) {
    var res = Math.floor(num / 1000);
    return (num - res * 1000);
}

function change_brix() {
    var liste = ['RC1', 'RC2'];
    liste.forEach(function (res, index) {
        r[res].changepourcent(r[res].pct, r[res].gallons, r[res].lecture.d);

    });
}
/*
function calcule_brix_uni(brix, gal_seve) {
    if (undefined === brix)
        brix = $("#spinnerSeve").spinner('value');  // vachercher le brix dans le spinner
    var ratio = 66;
  
    return(gal_seve * BRIXSEVE / ratio);
}
*/

function calcule_brix(brix, gal_seve) {
    var ratio = 66;
    return (gal_seve * brix / ratio);
}


function pourcentToArc(p) {

    var adepart = 180;
    var pdepart = 50; // 50%Math.PI/2.0; // 180.0;
    var a100 = Math.PI;
    var dmin, dmax, d, oldd, np;
    var c = 1;
    var precision = 1.0;
    if (p < 50) {
        dmin = 0.0;
        dmax = 180.0;
        d = 135.0;
    } else {
        dmin = 180.0;
        dmax = 360.0;
        d = 225.0;
    }
    oldd = d;
    do {

        np = calculAirePC(d);
        //           if (DebugOn) console.log("count "+ c + " np " + np + " p " + p + " d " +  d);
        c++;
        if (np > p) {
            dmax = d;
        } else {
            dmin = d;
        }
        oldd = d;
        d = dmin + (dmax - dmin) / 2.0;
    } while (Math.abs(np - p) > precision);
    return (oldd);
}

function calculAirePC(a) {
    var ar = degToRad(a);
    var rep = ((0.5 * (ar - Math.sin(ar))) / Math.PI) * 100.0;
    return (rep);
}

function degToRad(d) {
    return (d * Math.PI / 180.0);
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, radius, startAngle, endAngle) {
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}

function rndColor() {
    return '#' + ('00000' + (Math.random() * 16777216 << 0).toString(16)).substr(-6);
}

/// fin valve



