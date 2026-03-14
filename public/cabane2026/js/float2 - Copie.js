/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*
 * Natural Sort algorithm for Javascript - Version 0.7 - Released under MIT license
 * Author: Jim Palmer (based on chunking idea from Dave Koelle)
 */
/*jshint unused:false */
var TEST = false;

var MAXDELAI = 60 * 20 * 1000;
var MAXOFFLINE = 60 * 60 * 1000 ;
if(TEST){
    MAXDELAI = 2 * 20 * 1000;
    MAXOFFLINE = 3 * 60 * 1000 ;
 
}

function naturalSort(a, b) {
    "use strict";
    var re = /(^([+\-]?(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)?$|^0x[0-9a-f]+$|\d+)/gi,
            sre = /(^[ ]*|[ ]*$)/g,
            dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
            hre = /^0x[0-9a-f]+$/i,
            ore = /^0/,
            i = function (s) {
                return naturalSort.insensitive && ('' + s).toLowerCase() || '' + s;
            },
            // convert all to strings strip whitespace
            x = i(a).replace(sre, '') || '',
            y = i(b).replace(sre, '') || '',
            // chunk/tokenize
            xN = x.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
            yN = y.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
            // numeric, hex or date detection
            xD = parseInt(x.match(hre), 16) || (xN.length !== 1 && x.match(dre) && Date.parse(x)),
            yD = parseInt(y.match(hre), 16) || xD && y.match(dre) && Date.parse(y) || null,
            oFxNcL, oFyNcL;
    // first try and sort Hex codes or Dates
    if (yD) {
        if (xD < yD) {
            return -1;
        } else if (xD > yD) {
            return 1;
        }
    }
    // natural sorting through split numeric strings and default strings
    for (var cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
        // find floats not starting with '0', string or 0 if not defined (Clint Priest)
        oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
        oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
        // handle numeric vs string comparison - number < string - (Kyle Adams)
        if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
            return (isNaN(oFxNcL)) ? 1 : -1;
        }
        // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
        else if (typeof oFxNcL !== typeof oFyNcL) {
            oFxNcL += '';
            oFyNcL += '';
        }
        if (oFxNcL < oFyNcL) {
            return -1;
        }
        if (oFxNcL > oFyNcL) {
            return 1;
        }
    }
    return 0;
}
;
//function go() {
//    var arr = ['A10', 'A1'];
//    arr=arr.sort(naturalSort);
// //   console.log(arr);
//    arr.forEach(function(id){
//        creerdiv(id,"#dest");
//    });
//    
//}
var tabvac = [];
var tvac = [];
var vacOff = []; //[newid]=true;
function tvacUpdate(arr) {
    arr.forEach(function (vac) {

        tvac[vac.code] = (undefined !== vac.rawValue ? vac.rawValue / 100 : 0.0);
    });
}
function creevac(arr) {
    tvacUpdate(arr);
    arr.forEach(function (vac) {        
        vacOff[vac.code]=false;
        tabvac[vac.code] = (undefined !== vac.lastUpdatedAt ? vac.lastUpdatedAt : 0.0);
        creerdiv(vac.code, "#tabvac", vac);
        add_warning(vac.code,deltamsecnow(vac.lastUpdatedAt));
    });
}
function hack(vac) {
    if (vac.device === 'VD1ABVD2AB')
        return('D1-2AB');
    if (vac.device === 'VG1-2VH14')
        return('G1-2H14');
    else
        return(vac.device.slice(1));
}
function updatevac(arr) {
    tvacUpdate(arr);
    arr.forEach(function (vac) {
        var msec= updatediv(vac.code, vac);
        update_warning(vac.code,msec);
    });
}
function myFixed(val, prec) {
    if (typeof val !== 'undefined') {
        try {
            return(val.toFixed(prec));
        } catch (err) {
            if (DebugON)
                console.log(arguments.callee.caller.toString(), " a passé une mauvaise val de temp ou vac ", val);
            return(val);
        }
    } else
        return (" ");
}/*
 function creerdivComplet(newid, dest, vac) {
 
 var res = resultat2(vac);
 var deb = "<div id=b" + newid + " class=mytext-container>";
 var fin = "</div>";
 var sec = deltamsecnow(vac.lastUpdatedAt);
 
 var datadiv = "<div id=" + newid + ">" + newid + res + fin;
 var prgBardiv;
 if (nomT(newid, vac.device))
 prgBardiv = "<div id=P" + newid + " class=BlueBar style='height: 5px'>" + fin;
 else
 prgBardiv = "";
 
 var total = deb + datadiv + prgBardiv + fin;
 $(total).appendTo(dest);
 $("#b" + newid).css('border-color', findColorPB(vac.rawValue / 100.0));
 
 if (nomT(newid, vac.device))
 $("#P" + newid).progressbar({max: MAXDELAI, value: sec});
 }
 */
var deg = "&deg;";
function creerdiv(newid, dest, vac) {
    if (nomT(newid, vac.device)) {
        var res = (undefined === vac.batteryVolt) ? 0.0 : (vac.batteryVolt).toFixed(1);
        var temp = (undefined === vac.temp) ? "OFF" : (vac.temp).toFixed(1);
        var sp = "&nbsp;";
        var liste = vacDiv(newid, vac.device);
        
        var arr ,dotdata,color ; 
        arr = creerIcon(liste);
        dotdata=arr[0];
        color=arr[1];
       
        var deb = "<div id=b" + newid + " class=mytext-container>";
        var fin = "</div>";
        var sec = deltamsecnow(vac.lastUpdatedAt);
        var datadivdeb = "<div id=" + newid + ">";
        var datadivfin = creerTitreDiv(hack(vac), temp, true) + fin; ///// "<br>" + res + fin;
        var prgBardiv = "<div id=P" + newid + " class=BlueBar style='height:7px;'>" + fin;

        var vacDotdiv = "<div id=D" + newid + " class=vacdot-container >" + dotdata+ fin;
        var total = deb + fin;
        var divid = datadivdeb + datadivfin;
        $(total).appendTo(dest);
        $(divid).appendTo("#b" + newid);
        $(vacDotdiv).appendTo("#b" + newid);
//        creerPile("b" + newid, newid, vac.batteryVolt);
        creerPile("b" + newid, newid, vac.percentCharge);
        $(prgBardiv).appendTo("#b" + newid);
        $("#b" + newid).css('border-color', color); ///////   la couleur la pire findColorPB(vac.rawValue / 100.0));
        $("#P" + newid).progressbar({max: 20 * 60 * 1000, value: sec});
        if (temp === "OFF")
            updatediv(newid, vac);  // a off
    }

}


function creerTitreDiv(gauche, droite, degre) {
    //   return ('<p style="text-align:left;">'+gauche+'<span style="float:right;">'+droite+
    //           '</span></p>');
    if (degre)
        return ('<span style="text-align:left;">' + gauche + '</span><span style="float:right;color:blue;">' +
                droite + deg + '</span>');
    else
        return ('<span style="text-align:left;">' + gauche + '</span><span style="float:right">' +
                droite + '</span>');

}
//        var battdiv = "<div id=bAT" + newid + " class=battery style='height:100%;'>" + fin; 
//        <div id="progressbar"></div>
// M 100 300 Q 100 100 100 100 Q 150 100 150 100 Q
// 150 100 150 75 L 200 75 Q 200 100 200 100 L 250
// 100 L 250 100 L 250 300 Z
//<script>   $( "#progressbar" ).progressbar({//
//  value: 37
//});
function resultat2(vac) {
    res = "";
    var i = 0;
    var label = ["v", "", "&deg;"];
    [vac.batteryVolt, vac.rawValue / 100.0, vac.temp].forEach(function (val) {
        if (val !== undefined)
            data = val.toFixed(1) + label[i];
        else
            data = " ";
        ////       res = res + ((i++ % 2) === 0 ? " " : "<br>") + data;
        res = res + " " + data;
    });
    return (res);
}
function creerIcon(liste) { 
    var res = "";
    var dotcolor, bordercolor, maxvac = -999.9 ;
    
    liste.forEach(function (vac, index) {
    	dotcolor=findColorPB(tvac[vac]);
    	if (tvac[vac]> maxvac){
    		maxvac=tvac[vac];
    	}
        res += '<i class="fas fa-circle" style="font-size:12px;color:'+dotcolor+'";></i>';
        bordercolor = findColorPB(maxvac);
//        if (index === 2)
//            res += '<br>';
    });
    return ( [res,bordercolor]);
}
/*
 function resultat_mixed(vac) {
 if (TEST2)
 return(resultat_o(vac));
 var res = "";
 var i = 0, label, arr;
 var fulldevice = nomT(vac.code, vac.device);
 if (fulldevice) {
 label = ["", "&deg;", "v"];
 arr = [vac.rawValue / 100.0, vac.temp, vac.batteryVolt];
 //        updateBatt(vac.code, vac.batteryVolt);
 } else {
 arr = [vac.rawValue / 100.0];
 label = [""];
 }
 
 
 arr.forEach(function (val) {
 if (val !== undefined)
 data = val.toFixed(1) + label[i++];
 else
 data = " ";
 //       res = res + ((i++ % 2) === 0 ? " " : "<br>") + data;
 res = res + " " + data; // pas de saut de ligne ...
 });
 return (res);
 }
 */

function vacDiv(nom, deviceid) {
    var liste = [];
    if (deviceid === 'VD1ABVD2AB') {
        liste = ['D1A', 'D1B', 'D2A', 'D2B'];
        return(liste);
    }
    var j = 0;
    const re = /(\D)(\d*)-(\d*)/;

    var result = re.exec(deviceid);
    if (result === null || result[3] === "")
        return(false);
    var l = result[1];
    var h = Number(result[3]);
    var b = Number(result[2]);

    if (deviceid === 'VA5B1-2')
        liste.push('A5');


    for (i = b; i <= h; i++) {
        var id = l + i;
        liste.push(id);
    }
    if (deviceid === 'G2')
        liste.push('H14');
    return(liste);
}
function nomT(id, deviceid) {
    const re = /(\D)(\d*)-(\d*)/;
    if (id === 'B1')
        return(false); // deux exeptions
    if (id === 'D2A')
        return(true);
    var result = re.exec(deviceid);
    if (result === null || result[3] === "")
        return(false);
    var l = result[1];
    var h = Number(result[3]);
    var b = Number(result[2]);
    var no = myFixed((b + (h - b) / 2), 0);
    return(id === l + no);
}
//function newup(newid, va) {
//    if (nomT(newid, vac.device)) {
//        if (isLater(vac.lastUpdatedAt, tabvac[newid])) {
//            update();
//        } else if (isOffline1(vac.lastUpdatedAt, tabvac[newid])) {
//            warning();
//        } else if (isOffline2(vac.lastUpdatedAt, tabvac[newid])) {
//            offline();
//        }
//
//    }
//}
//function update() {
//    console.log("update");
//}
//function warning() {
//    console.log("warning");
//}
//function offline() {
//    console.log("offline");
//}
function updatediv(newid, vac) {
    if (nomT(newid, vac.device)) {
        if (isOffline(vac.lastUpdatedAt, tabvac[newid], newid)) {
            vacOff[newid]=true;
            if (DebugON)
                console.log("updating progbar offline" + newid + " min " + sec / 60 + " last " + vac.lastUpdatedAt + " avant " + tabvac[newid]);
///        var res = "<br>off";
            var res = " off";
//        checkprgbar(newid);
//        var prgBar = "<div id=P" + newid + " ></div>";
            $("#" + newid).html(hack(vac));
            $("#b" + newid).css('border-color', '#9A9A97');
            updatePile(newid, 0.0);
            //      $("#P" + newid).removeClass( ).addClass('WhiteBar');
            $("#P" + newid).progressbar({value: 0});
            //                       $("#P" + newid).progressbar({value: false });
        } else { // ok online
            vacOff[newid]=false;
            var sec = deltasec(vac.lastUpdatedAt, tabvac[newid]);
            var res = (undefined === vac.batteryVolt) ? 0.0 : (vac.batteryVolt).toFixed(1);

            var temp = (undefined === vac.temp) ? "-" : (vac.temp).toFixed(1);

            var sp = "&nbsp;";
            var deg = "&deg;";
            var txtdivid = creerTitreDiv(hack(vac), temp, true);
            if (isLater(vac.lastUpdatedAt, tabvac[newid])) {        // vrai m.a.j.
                if (DebugON)
                    console.log("updating " + newid + " val " + vac.rawValue / 100.0 + " sec " + sec);

                tabvac[newid] = vac.lastUpdatedAt;
                var liste = vacDiv(newid, vac.device);
                var arr ,dotdata,color ; 
                arr = creerIcon(liste);
                dotdata=arr[0];
                color=arr[1];
                $("#D" + newid).html(dotdata); //  + "<br>" + res); // upd datadiv
                $("#" + newid).html(txtdivid); //  + "<br>" + res); // upd datadiv
//                var color = findColorPB(vac.rawValue / 100.0);
                if (DebugON)
                    console.log("updating border color" + newid + " sec " + sec);

                $("#b" + newid).css('border-color', color);

                updatePile(newid, vac.percentCharge);
                $("#P" + newid).progressbar({value: sec});
            } else {  // update seulement le prgbar   au 30 sec ...
                sec = deltamsecnow(vac.lastUpdatedAt);
                $("#P" + newid).progressbar({value: sec});
                if ((sec / 1000).toFixed(0) % 30) {
                    $("#P" + newid).progressbar({value: sec});
                } else {
                    if (DebugON)
                        console.log("skipping progbar" + newid + " sec " + sec);
                }
            }
        } // fin if offline else online
    }
    return(deltamsecnow(vac.lastUpdatedAt));
}
function checkprgbar(newid, sec) {
    if ($("#" + newid).progressbar("instance") !== undefined) {
        if (DebugON)
            console.log("Destroying " + newid);
        $("#" + newid).progressbar("destroy");
    }
}




function isOffline(newlec, anciennelec, id) {
// si newlec est plus vieux que anciennelec ok
// teste aussi anciennelec invalide
    var nd = dateMessage;
    var n = new Date(Date.parse(newlec));
    var a = new Date(Date.parse(anciennelec));
    if (undefined === newlec)
        return(true); // pas de lecture off
    if (undefined !== anciennelec && (nd - n) < MAXOFFLINE) {  //Ier lect si now-lect < delai  online
        return(false);
    } else if (isNaN(a) && (nd - n) >= MAXOFFLINE) {  //Ier lect si now-lect >= delai  offline
        warn(nd, n, id);
        return(true);
    }
    if ((nd - a) > MAXOFFLINE) {
        warn(nd, n, id);
        return (true); // delai dépassé
    }
    if ((n - a) > MAXOFFLINE) {  // normal deux lectures
        warn(n, a, id);
        return(true); // delai depassé  offline
    } else {
        return (false);
    }
}
function warn(n, a, id) {
    if (DebugON)
        console.log(id, " delai ", (n - a) / 1000, "sec  min ", (n - a) / 60000);
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
function deltasec(newlec, oldlec) {
// si s1 est plus vieux que la vielle date ok

    var d1 = new Date(Date.parse(newlec));
    var d2 = new Date(Date.parse(oldlec));
    if (isNaN(d1) || isNaN(d2))
        return(0);
    return((d1 - d2) / 1000); // retourne nb de sec ecoulé

}
function deltamsecnow(newlec) {
// si s1 est plus vieux que la vielle date ok

    var d1 = new Date(Date.parse(newlec));
    var now = dateMessage;
    return((now - d1)); // retourne nb de millisec ecoulé
}
function findColorPB(vacuum) {
//       if (vacuum !== "ND") {
    var range = [[18, 'green'], [15, 'yellow'], [14, 'red']];
    var test = vacuum.toFixed(0);
    var color;
    if (test >= -14) {
        color = '#FF0000';
    } else if (test >= -17 && test <= -15) {
        color = '#ff6600'; //'#EBEE23';
    } else {
        color = '#80FF00';
    }
    return(color);
//        } else
//            return('blue'); // pas de valeur
}
;

