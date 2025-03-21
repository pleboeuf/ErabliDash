/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var TOKEN = "pk.eyJ1IjoiZ2Fnbm9uYW5kcmUiLCJhIjoiY2p0OHBkcnV0MDd3aTQzcXpwbnFwc2FubyJ9.gGJ8Sk-9g0jIG8BjX2YLbQ";
var DebugON = false;

var MAXDELAI = 60 * 25 * 1000; // 25 min en millisecdelai avant de déclarer un device en panne
//var poly = [];
//var polyautres = [];
//var marker = [];
var map;
var grosseurText = 20 ; //  original 24;
// var lignesCache = [];

// haut droit 45.298438, -72.688772

function test() {
    var ww = $(window).width();
    var wh = $(window).height();
    if (ww < 1400)
        grosseurText = 12;


}
function getIndex(arr){
    var ret=[];
    arr.forEach(function (li){
        ret.push(li[0]);
    });
    return(ret);
}
function mydiff(arr){
    var ret=[];
    var last=[];
    arr.forEach(function (li){
        if (li[0] !== last[0])   ret.push(li);
        last=li;
    });
    return(ret);
    
}
function go() {
    //   testrot();

    var lignes = [];
    var aireaus = [];
    var autres = [];
    var pointsV = [];
    var pointsT = [];
    //   var url1 = "./br_li_nom_ok.gpx";
    var url1 = "./br_lignes.gpx";
    var url2 = "./br_pts.gpx";
    test();
    initMap();
 
            
    if(DebugON) console.log("fin initMap");
    $.when($.ajax(url1), $.ajax(url2)).done(function (a1, a2) {
        // a1 and a2 are arguments resolved for the page1 and page2 ajax requests, respectively.
        // Each argument is an array with the following structure: [ data, statusText, jqXHR ]

        scanligne(a1[2].responseText, lignes, aireaus, autres);
        var l = mydiff(_.sortBy(lignes));
//        var unique = _.uniq(l);
//        var detrop = _.without(l,unique);
        loadLine(l);
        loadLineAutres(aireaus, 'black');
 //       loadLineAutres(autres, 'grey');
        scanpoint(a2[2].responseText, pointsV, pointsT);
        loadMarqueurV(pointsV);
        loadMarqueurT(pointsT);
//
//  DATACER remplace
//         setTimeout(openSocket, 4000); // donne le temps a demarre openSocket();
//        zoombound();

   //  AJOUT DATACER
   if(DebugON) console.log("start readdatacer ");

   //  AJOUT DATACER
    if(DebugON) console.log("start readdatacer ");
    
        const datacerInterval = setInterval(readDatacer, 1000 * 60);  // 60 * 1000 ms = 2 min  original 1000
        readDatacer();

    });

 
    
}
function scanpoint(datagpx, pointsV, pointsT) {

    var gpx = new gpxParser(); //Create gpxParser Object
    gpx.parse(datagpx);
    gpx.waypoints.forEach(function (way) {
        if (way.name[0] === 'V' || way.name[0] === 'P')
            pointsV.push([way.name, [way.lon, way.lat]]);
        if (way.name[0] === 'T')
            pointsT.push([way.name, [way.lon, way.lat]]);
    }
    );

}
function scanligne(datagpx, lignes, aireaus, autres) {

    var typeLigne; // 0 ligne 1 eau 2 air route

    var gpx = new gpxParser(); //Create gpxParser Object
    gpx.parse(datagpx);
    gpx.routes.forEach(function (route) {
        var nom = route.name;
//        var patt1 = /^[A-H]{1}\s[0-9]{3,4}/;
//        var patt2 = /^[A-H]{1}[0-9]{1,3}/;
//        var patt3 = /^[A-H]{1,2}[0-9]{1,2}[A|B]{0,1}/;
        var patt3 = /^[A-V]{1,2}[0-9]{1,2}[A|B]{0,1}/; // ajout de V pour vaccum
        var patair = /air|eau/i;
        var nnom = "";
        typeLigne = 0; //

        if (patt3.test(nom)) {
            nnom = nom.match(patt3).toString();
        }
        if (patair.test(nom)) {
            nnom = nom;
            typeLigne = 1;
        }
        if (nnom === "")
            typeLigne = 2;

        var position = [];
        route.points.forEach(function (p) {
            position.push([p.lon, p.lat]);
        });

        if (typeLigne === 0) {
            lignes.push([nnom, position]);
        } else if (typeLigne === 1) {
            aireaus.push([nnom, position]);
        } else
            autres.push([nom, position]);
//                    if(DebugON) console.log("nom : " + nom + " nnom " + nnom ) ;
    }
    );
}




function openSocket() {
    websocket = new WebSocket(wsUri(""), "dashboard-stream");
    websocket.onopen = function (evt) {
        console.log('Socket opened.');
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
            console.log('Socket onmessage.', msg.data);
        var data = JSON.parse(msg.data);
        parseEvent(data);
//        coulee();
//        gdc();
//        outputPression(STATION_METEO);  // station Mont Soleil a Bromont
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
    
 //   return "ws://boilerhouse.ddns.net:3300/" + l.pathname + path;
    return "ws://pl-net.ddns.net:3300/" + l.pathname + path;
    return ((l.protocol === "https:") ? "wss://" : "ws://") + l.hostname + (((l.port !== 80) && (l.port !== 443)) ? ":" + l.port : "") + l.pathname + path;
}

function parseEvent(data) {
    scanvacuum(data.vacuum);
}
function scanvacuum(arrlocal) {

  
        if(DebugON) console.log("scanvacuum: nb vacuum " + arrlocal.length);
    var facteurCorrection = 1.0;
    arrlocal.forEach(function (no, i) {
        var temp;
        var nom = no.code;
        var val = ((no.rawValue - no.offset) * facteurCorrection);
        if (typeof no.temp !== 'undefined')
            temp = no.temp;
        var datelect = no.lastUpdatedAt;
        //                   console.log("after before ",JSON.stringify(lvac[nom]));
        if (typeof lvac[nom] !== 'undefined') {
            lvac[nom].update(val, datelect, temp);

        }
        //           console.log("after update ",JSON.stringify(lvac[nom]));
    });

}

var lvac = {};  //vacUUmu
function LV(nom) {
    this.nom = nom;
    this.nomVacuum;
    this.nomTemperature;
    this.vacuum = 99;
    this.datelecture = " ";
    this.temperature;
    this.lines = []; //  array of array of points latlon for line
    this.ptVac = []; // pt where to put Vacuum display
    this.ptTemp = []; // pt where to put Temp display IF EXISTS
    this.color;
    this.online = false;

    function isValidDate(date) {
        return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date);
    }
    function isLater(newlec, oldlec) {
        // si s1 est plus vieux que la vielle date ok

        var d1 = new Date(Date.parse(newlec));
        var d2 = new Date(Date.parse(oldlec));
        if (isNaN(d2)) {
            return(true);
        }
        if (d1 > d2) {
            return(true);
        } else {
            return (false);
        }
    }

    function isOffline(newlec, anciennelec) {
        // si newlec est plus vieux que anciennelec ok
        // teste aussi anciennelec invalide
        var nd = new Date(Date.now());
        var n = new Date(Date.parse(newlec));
        var a = new Date(Date.parse(anciennelec));
        if (isNaN(a) && (nd - n) < MAXDELAI) {  //Ier lect si now-lect < delai  online
            return(false);
        } else if (isNaN(a) && (nd - n) >= MAXDELAI) {  //Ier lect si now-lect >= delai  offline
            return(true);
        }
        if ((nd-a) > MAXDELAI) return (true);  // delai dépassé
        if ((n - a) > MAXDELAI) {  // normal deux lectures
            return(true);  // delai depassé  offline
        } else {
            return (false);
        }
    }




    this.update = function (vacuum, datelecture, temperature) {
        if (typeof datelecture !== 'undefined') {  // bail out si pas de date
            if (isLater(datelecture, this.datelecture) &&
                    !(isOffline(datelecture, this.datelecture))) { // une mise à jour
        if(DebugON) console.log ("update "+this.nom+" vac "+vacuum+" lect "+ dateToHour(datelecture) +" "+datelecture);
               this.online = true;
                this.vacuum = vacuum;
                this.color = this.findColor();  //met à jour la couleur
                this.datelecture = datelecture;
                this.changeLine();
                this.changeMarqueur();
                if (typeof this.nomTemperature !== 'undefined') {
                    this.temperature = temperature;
                    this.changeTemp();
                }
            } else if (isOffline(datelecture, this.datelecture) && this.online) {
                this.online = false;
                this.vacuum = 99;
                this.color = 'orange';  //met à jour la couleur
                this.datelecture = " ";
                this.temperature = 99;
                this.changeLine();
                this.changeMarqueur();

                if (typeof this.nomTemperature !== 'undefined') {
                    this.temperature = temperature;

                }

                if(DebugON) console.log("in update OFF " + this.nom);
            }
        }
    };

    this.loadPts = function (nom, type, array) {
        if (type === 'v') {
            this.nomVacuum = nom;
            this.ptVac = array;
        }
        if (type === 't') {
            this.nomTemperature = nom;
            this.ptTemp = array;
        }

    };

    this.loadligne = function (ligne) {
        this.color = 'grey'; // this.findColor();
        this.lines = ligne;
        this.traceligne();
    };
    this.traceligne = function () {
        var geoline = createLigne(this.nom, this.lines, this.color, 0, this.datelecture);
        plotgeoJson(this.nom, geoline, true);

    };
    this.traceVac = function (nomV, pt) {
        this.nomVacuum = nomV;
        this.ptVac = pt;
        var geoline = createMarqueurVacuum(this.nomVacuum, 0, this.ptVac);
        plotgeoJson(this.nomVacuum, geoline, false);
        if(DebugON) console.log("traceVac " + [this.nomVacuum, 0, this.ptVac].join(" "));

    };
    this.traceTemp = function (nomT, pt) {
        this.nomTemperature = nomT;
        this.ptTemp = pt;
        var d = new Date();

        var tdate = dateToHour(d);
        var geoline = createMarqueurTemp(this.nomTemperature, 99, d, this.ptTemp);
        plotgeoJson(this.nomTemperature, geoline, false);
        if(DebugON) console.log("traceTemp " + [this.nomTemperature, this.temperature, Date.now(), this.pTemp].join(" "));
    };



//    if (Date.now() - Date.parse(heure) > 60 * 30)
//        return('white');  // si delai de plus de 30 min lect

    this.findColor = function () {
        //       if (this.vacuum !== "ND") {
        var range = [[18, 'green'], [15, 'yellow'], [14, 'red']];
        if (this.vacuum === 99)
            return('blue');   // offline
        var test = myFixed(this.vacuum, 0);
        var color;
        if (test >= -14) {
            color = 'red';
        } else if (test >= -17 && test <= -15) {
            color = 'yellow';
        } else {
            color = '#0FFF40';
        }
        return(color);
//        } else
//            return('blue'); // pas de valeur
    };


    this.changeLine = function () {
////        var geoline = createLigne(this.nom, this.lines, this.color, this.vacuum, this.datelecture);
////        plotgeoJson(this.nom, geoline, true);
        updateline(this.nom, this.vacuum, this.datelecture, this.lines, this.color);
    };
    this.changeMarqueur = function () {
        updateMarqeurVacuum(this.nomVacuum, this.vacuum, this.ptVac);
//        createMarqueurVacuum(this.nom, this.ptVac, this.vacuum);
//        plotgeoJson('V'+this.nom, geoline, false);
    };
    this.changeTemp = function () {
        // m.a.j seulement si il y a un marqueur
        if (typeof this.ptTemp !== 'undefined') {
            updateMarqeurTemp(this.nomTemperature, this.temperature, this.datelecture, this.ptTemp);
        }
//        createMarqueurVacuum(this.nom, this.ptVac, this.vacuum);
//        plotgeoJson('V'+this.nom, geoline, false);
    };
}
;

// utilities
function loadLineAutres(lignes, color) {
    // pas besoin   var myLayer = [];
    lignes.forEach(function (line) {
        var nom = line[0];
        var geoline = createLigne(nom, line[1], color, 0, 0);
        plotgeoJson(nom, geoline, false);
    });
}
function loadLine(lignes) {
    // pas besoin   var myLayer = [];
    lignes.forEach(function (ligne) {
        var nom = ligne[0];
        lvac[nom] = new LV(nom);
        lvac[nom].loadligne(ligne[1]);
    });
}

function loadMarqueurV(pts) {
    // pas besoin   var myLayer = [];
    pts.forEach(function (pt) {
        var nom = pt[0];
        var nomLV = nom.slice(1);
        if (lvac[nomLV])
            lvac[nomLV].traceVac(nom, pt[1]);
    });
}
function loadMarqueurT(pts) {
    // pas besoin   var myLayer = [];
    pts.forEach(function (pt) {
        var nom = pt[0];    // TH6-8 -> H6-8  nom device  nom[2] +
        var nomLV = nomT(nom);   // un seul marqueur pour 3 ou 4 lignes
        if (lvac[nomLV])
            lvac[nomLV].traceTemp(nom, pt[1]);
    });
}
function nomT(str) {
    var l = str[1];
    str = str.slice(2);
    var n = str.indexOf("-");
    var h = Number(str.substr(n + 1));
    var b = Number(str.substr(0, n));
    var no = myFixed((b + (h - b) / 2), 0);
    return(l + no);
}

///// DATACER

const dtcurl = "http://pl-net.ddns.net:3300"
const datacerVac = dtcurl + "/api/vacuum";
// Fonction pour mettre à jour les données des vacuum sensors
function normalizeLabel(label) {
    return label.replace(/(\D)\S*\s?0?(\d)/, "$1$2");  // works for    V01';'V1' 'Vaccum-3 1';
 //return label.replace(/([A-Z])0*/, "$1"); // original
}

// Fonction générique pour mettre à jour les données
function updateData(source, destination, keySource) {
    // Clear existing vacuum data
    let vacData = [];

    source.forEach((item) => {
        vacData.push({
            code: normalizeLabel(item.label),
            label: item.label,
            device: item.device,
            rawValue: parseFloat(item.rawValue) || 0, // Conversion en nombre
            temp: parseFloat(item.temp) || 0,
            ref: parseFloat(item.referencialValue) || 0,
            percentCharge: parseFloat(item.percentCharge) || 0,
            offset: item.offset,
            lightIntensity: 0,
            rssi: 0,
            signalQual: 0,
            lastUpdatedAt: item.lastUpdatedAt,
        });
    });
    return vacData;
}

function updateVacuumData(source, destination) {
    return(updateData(source, destination, "label")); // On passe 'label' comme clé pour la source

}

async function readDatacer() {
    var vacuums=[];
    try {

        const dtcVacuumData = await getDatacerData(datacerVac);
        if (dtcVacuumData !== null) {
            scanvacuum( updateVacuumData(dtcVacuumData.vacuum, vacuums));
            console.log("Update from Datacer");
 //           displayVacuumErabliere();
 //           displayVacuumLignes();
        } else {
            console.log("Failed to fetch data from Datacer :(");
        }
    } catch (error) {
        console.error("Update from Datacer FAILED:", error);
    }
}

async function getDatacerData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const datacerData = await response.json();
        return datacerData;
    } catch (error) {
        console.warn(error.message);
        return null;
    }
}



    // fin DATACER


//
//mapbox related function
//
//
function createLigne(nom, lines, color, vacuum, datelecture) {
	var myopacity = 0.8 ;
	if (color == 'black') myopacity = 0.3 ;
    var myobj =
            {
                "id": nom,
                "type": "line",
                "source": {
                    "type": "geojson",
                    "data": {
                        "type": "Feature",
                        "properties": {
                            "valeur": '--',
                            "HeureLecture": dateToHour(datelecture)
                        },
                        "geometry": {
                            "type": "LineString",
                            "coordinates": lines
                        }
                    }
                },
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": color, //"#888",
                    "line-width": 5,
                    "line-opacity": myopacity  // 0.8  // de 0 a 1  0.3
                }
            };
    return (myobj);
}

function updateline(nom, vacuum, heure, lines, color) {
    var myobj = {

        "type": "Feature",
        "properties": {
            "valeur": myFixed(vacuum, 1),
            "HeureLecture": dateToHour(heure)
        },
        "geometry": {
            "type": "LineString",
            "coordinates": lines
        }

    };

//    map.on('load', function ()
//    {
    map.getSource(nom).setData(myobj);
//    });

    changeLineColor(nom, color);

}

function dateToHour(lect) {
/// todo  valide date

    var d = new Date(Date.parse(lect));
    if (isNaN(d))
        return(lect);   // retour le texte si c'est pas une date
    return(d.toLocaleTimeString());

}

function createMarqueurVacuum(nom, vacuum, pts) {
    var myobj = {
        "id": nom,
        "type": "symbol",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {
                    "nom": nom.slice(1),
                    "valeur": "--"
                },
                geometry: {
                    type: "Point",
                    coordinates: pts
                }}},
        "layout": {
            ///                 "text-field": "{nom} {valeur}", //
            "text-field": ['format',
                ['get', 'nom'], {}, // Use default formatting
                '\r\n', {},
                ['get', 'valeur'],
                {}
            ],

            "text-size": grosseurText, // default 16
            "text-max-width": 0,
            "text-allow-overlap": true, //  default false   plus propre
            "text-justify": "center",
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"], // Semibold Bold
            "text-offset": [1.1, 0],
            "text-anchor": "top"
        }};
    return(myobj);
}
// layer.setProperties("{title}".equals(layer.getTextField().getValue()) ? textField("āA") : textField("{title}"));

function updateMarqeurVacuum(nom, vacuum, coord) {
    var text;
    if (typeof vacuum === 'number') {
        text = myFixed(vacuum, 1);
    }



    var myobj = {
        "type": "Feature",
        "properties": {
            "nom": nom.slice(1),
            "valeur": text
        },
        geometry: {
            type: "Point",
            coordinates: coord
        }
    };
//    map.on('load', function ()
//    {
    map.getSource(nom).setData(myobj);
//    });
}
function myFixed(val, prec) {
    if (typeof val !== 'undefined') {
        try {
            return(val.toFixed(prec));
        } catch (err) {
            if(DebugON) console.log(arguments.callee.caller.toString(), " a passé une mauvaise val de temp ou vac ", val);
            return(val);
        }
    } else
        return (" ");
}
function createMarqueurTemp(nom, temp, datelect, pts) {
    var text = ' ';
    if (temp !== 99)
        text = myFixed(temp, 1);
    var d =  nom;              //dateToHour(datelect);
    var myobj = {
        "id": nom,
        "type": "symbol",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {
                    "nom": nom,
                    "valeur": text,
                    "heure": d
                },
                geometry: {
                    type: "Point",
                    coordinates: pts
                }}},
        "layout": {// ok "{valeur} {heure}", //
            "text-field": ['format',
                ['get', 'valeur'], {}, // Use default formatting
                '\r\n', {},
                ['get', 'heure'], {}
            ],
            "text-size": grosseurText, // default 16
            "text-max-width": 0,

            "text-allow-overlap": true, //  default false   plus propre
            "text-justify": "center",
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Regular"], // Semibold Bold
            "text-offset": [1.5, 0],
            "text-anchor": "top"
        },
        "paint": {
            "text-color": 'blue'

        }
    };
    return(myobj);
//                    {
//                    'text-font': ['literal', ['DIN Offc Pro Italic']],
//                    'font-scale': 0.8
//                }

}
// layer.setProperties("{title}".equals(layer.getTextField().getValue()) ? textField("āA") : textField("{title}"));
//['format',
//['get', 'name_en'], { 'font-scale': 1.2 },
//'\n', {},
//['get', 'name'], {
//'font-scale': 0.8,
//'text-font': ['literal', [ 'DIN Offc Pro Italic', 'Arial Unicode MS Regular' ]]
function updateMarqeurTemp(nom, temp, datelect, coord) {

    var text = "Panne";
    if (datelect !== " ") {
        text = myFixed(temp, 1);
        var d = dateToHour(datelect);
    }

    if(DebugON) console.log("updateMarqTemp", [nom, temp, datelect, coord].join(" "));
    var myobj = {
        "type": "Feature",
        "properties": {
            "nom": nom,
            "valeur": text,
            "heure": dateToHour(datelect)
        },
        geometry: {
            type: "Point",
            coordinates: coord
        }
    };
//    map.on('load', function ()
//    {
    map.getSource(nom).setData(myobj);
//    });
}

function plotgeoJson(nom, geoline, click) {
//    try {
//        var mapLayer = map.getLayer(nom);
//
//        if (typeof mapLayer !== 'undefined') {
//            // Remove map layer & source.
//            map.removeLayer(nom).removeSource(nom);
//        }
//        if(DebugON) console.log("creation " + nom);
//    } catch (err) {
//        if(DebugON) console.log(nom + " " + err.message);
//    }
    map.on('load', function () {
        map.addLayer(geoline);
        if(DebugON) console.log("plotgeo " + nom + " " + map.getSource(nom)._data.properties.nom);
        if (click)
            addClick(nom);
    });
}

function zoomMax() {
    var maxgeo = [45.29958, -72.68863];  //lat  lon
    var mingeo = [45.28295, -72.70473];
    var bounds = [[mingeo][maxgeo]];
    map.fitBounds(bounds, {padding: 0});
}
function isMobile() {
  try{ document.createEvent("TouchEvent"); return true; }
  catch(e){ return false; }
}

function initMap() {
    // set up the map
    var myterrain = 'mapbox://styles/gagnonandre/cjtd3uzfq3n0l1fqmd08kw5ic';
    // myterrain = 'mapbox://styles/gagnonandre/cjtd3uzfq3n0l1fqmd08kw5ic' ; //cali
    myterrain = 'mapbox://styles/gagnonandre/ck7ja7cur3ss61inthnqbzi7m';  // cabane
    // 'mapbox://styles/gagnonandre/ck76k1k14109p1irveptkljra'; // cabane2 
    // myterrain = 'mapbox://styles/gagnonandre/ck7jayekf3tpp1iqkxjehbq2l'; // cabaneNew style outdoor
     
    
    
    var terrainoriginal = 'mapbox://styles/mapbox/streets-v9';
// start the map centre de la zone
    var maxgeo = [45.29958, -72.68863];  //lat  lon
    var mingeo = [45.28295, -72.70473];

    var latitude = mingeo[0] + (maxgeo[0] - mingeo[0]) / 2.0;
    var longitude = mingeo[1] + (maxgeo[1] - mingeo[1]) / 2.0;
    //   map.setView(new L.LatLng(51.3, 0.7),9);
    var TOKEN = "pk.eyJ1IjoiZ2Fnbm9uYW5kcmUiLCJhIjoiY2p0OHBkcnV0MDd3aTQzcXpwbnFwc2FubyJ9.gGJ8Sk-9g0jIG8BjX2YLbQ";

    var clon = -72.69542;
    var clat = 45.28986;
    mapboxgl.accessToken = TOKEN;
    // hack pour avoir Rich Text ???
    mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.0/mapbox-gl-rtl-text.js');


    map = new mapboxgl.Map({
        container: 'map',
        style: myterrain , //'mapbox://styles/gagnonandre/cjtd3uzfq3n0l1fqmd08kw5ic',

        center: [clon, clat], //[-122.486052, 37.830348],
        zoom: 15,
        bearing: 135
    });
// options.bearing
// Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.FullscreenControl());
    
if (isMobile()){
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: false
        },
        trackUserLocation: true
    }));
}
// disable map rotation using right click + drag
    map.dragRotate.disable();

// disable map rotation using touch rotation gesture
    map.touchZoomRotate.disableRotation();
//
//    Once you load the geojson-extent.js file (e.g., by using a <script> tag in your HTML code),
//    you should be able to do this to fit your map to the bounds of your GeoJSON markers object:
//
//map.fitBounds(geojsonExtent(markers));
addCabane();
}

function addClick(nom) {
    map.on('click', nom, function (e) {
        var coordinates = e.lngLat; // features[0].geometry.coordinates.slice();
        var description = "<h2>"+nom + " " + e.features[0].properties.valeur + " " + e.features[0].properties.HeureLecture.toLocaleString()+"</h2>";

// Ensure that if the map is zoomed out such that multiple
// copies of the feature are visible, the popup appears
// over the copy being pointed to.
//while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
//coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
//}

        new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
    });

// Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', nom, function () {
        map.getCanvas().style.cursor = 'pointer';
    });

// Change it back to a pointer when it leaves.
    map.on('mouseleave', nom, function () {
        map.getCanvas().style.cursor = '';
    });
}

function changeLineColor(nom, color) {
//    map.on('load', function () {
//        map.setPaintProperty(nom, 'line-color', 'white');  // layer id , name of prop , value

    map.setPaintProperty(nom, 'line-color', color);  // layer id , name of prop , value
//
//    });
}




